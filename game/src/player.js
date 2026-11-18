// SOLMARA — Streets of the Sun. player.js
// Dario Reyes, on foot and behind the wheel. On foot he walks, punches (F)
// and shoots (Space). Near a car, E gets him in — a parked car is free, a
// moving traffic car is a steal and earns a wanted star. E again gets him out.
// The car keeps its own health; wreck it and Dario is thrown out on foot.

import { CFG, clamp, dist, angleLerp } from './config.js';
import { collideBuildings, isWater } from './city.js';

export class Player {
  constructor() {
    this.reset(CFG.GARAGE.x, CFG.GARAGE.y);
    this.money = CFG.START_MONEY;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.speed = 0;
    this.health = CFG.PLAYER_HEALTH;
    this.inCar = false;
    this.car = null;
    this.punchTimer = 0;
    this.shootTimer = 0;
    this.hurtFlash = 0;
    this.stealFlash = 0;
  }

  get speedNorm() {
    return clamp(Math.abs(this.speed) / CFG.CAR_MAX_SPEED, 0, 1);
  }

  update(dt, actions, world) {
    this.punchTimer = Math.max(0, this.punchTimer - dt);
    this.shootTimer = Math.max(0, this.shootTimer - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.stealFlash = Math.max(0, this.stealFlash - dt);

    if (this.inCar && this.car) this._updateDriving(dt, actions, world);
    else this._updateOnFoot(dt, actions, world);

    if (actions.enterCar) this._toggleCar(world);
    if (actions.punch && !this.inCar) this._punch(world);
    if (actions.shoot && !this.inCar) this._shoot(world);
  }

  _updateOnFoot(dt, actions, world) {
    let mx = (actions.right ? 1 : 0) - (actions.left ? 1 : 0);
    let my = (actions.down ? 1 : 0) - (actions.up ? 1 : 0);
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.angle = angleLerp(this.angle, Math.atan2(my, mx), Math.min(1, dt * 12));
      const nx = this.x + mx * CFG.WALK_SPEED * dt;
      const ny = this.y + my * CFG.WALK_SPEED * dt;
      const solved = collideBuildings(world.city, nx, ny, CFG.PLAYER_RADIUS);
      this.x = clamp(solved.x, 20, CFG.WORLD - 20);
      this.y = clamp(solved.y, 20, CFG.WORLD - 20);
      this.speed = CFG.WALK_SPEED;
    } else {
      this.speed = 0;
    }
  }

  _updateDriving(dt, actions, world) {
    const car = this.car;
    const forward = (actions.up ? 1 : 0) - (actions.down ? 1 : 0);
    if (forward > 0) car.speed += CFG.CAR_ACCEL * dt;
    else if (forward < 0) {
      car.speed -= (car.speed > 30 ? CFG.CAR_BRAKE : CFG.CAR_ACCEL * 0.6) * dt;
    } else {
      car.speed -= car.speed * CFG.CAR_FRICTION * dt;
      if (Math.abs(car.speed) < 4) car.speed = 0;
    }
    car.speed = clamp(car.speed, -CFG.CAR_REVERSE_MAX, CFG.CAR_MAX_SPEED);
    const steer = (actions.left ? 1 : 0) - (actions.right ? 1 : 0);
    const steerFactor = clamp(Math.abs(car.speed) / 120, 0, 1);
    car.angle -= steer * CFG.CAR_STEER * steerFactor * dt * Math.sign(car.speed || 1);

    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const solved = collideBuildings(world.city, nx, ny, CFG.CAR_WIDTH);
    if (solved.hit) {
      if (Math.abs(car.speed) > 200) {
        world.audio.crash();
        world.addParticles(car.x, car.y, 10, '#c9c9c9');
        car.health -= 12;
      }
      car.speed *= 0.4;
    }
    car.x = clamp(solved.x, 24, CFG.WORLD - 24);
    car.y = clamp(solved.y, 24, CFG.WORLD - 24);
    this.x = car.x;
    this.y = car.y;
    this.angle = car.angle;
    this.speed = car.speed;

    // Driving into the water wrecks the car.
    if (isWater(car.x) && car.speed > 10) {
      car.health = 0;
    }
    if (car.health <= 0) this._wreckCar(world);
  }

  _wreckCar(world) {
    world.audio.crash();
    world.addParticles(this.car.x, this.car.y, 26, '#ff8a3d');
    world.addParticles(this.car.x, this.car.y, 18, '#3d3d46');
    const car = this.car;
    car.wrecked = true;
    this.inCar = false;
    this.car = null;
    this.x = car.x + 60;
    this.y = car.y;
    this.speed = 0;
    this.health = Math.max(10, this.health - 25);
    this.hurtFlash = 0.6;
    world.onCarWrecked();
  }

  _toggleCar(world) {
    if (this.inCar) {
      // Step out beside the car.
      const car = this.car;
      this.inCar = false;
      this.car = null;
      this.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
      this.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
      this.speed = 0;
      return;
    }
    // Nearest parked car first, then a slow traffic car (a steal).
    const parked = world.nearestParkedCar(this.x, this.y, 70);
    if (parked) {
      this._getIn(parked);
      return;
    }
    const traffic = world.traffic.nearestStealableCar(this.x, this.y, 70);
    if (traffic) {
      this._getIn(traffic);
      world.police.addHeat(1);
      world.traffic.scarePeds(this.x, this.y, 200);
      this.stealFlash = 1.2;
      world.banner('Car stolen! The cops are coming...', 2.5);
    }
  }

  _getIn(car) {
    this.inCar = true;
    this.car = car;
    car.speed = 0;
    this.x = car.x;
    this.y = car.y;
    this.angle = car.angle;
  }

  _punch(world) {
    if (this.punchTimer > 0) return;
    this.punchTimer = CFG.PUNCH_COOLDOWN;
    world.audio.punch();
    const fx = this.x + Math.cos(this.angle) * 40;
    const fy = this.y + Math.sin(this.angle) * 40;
    world.addParticles(fx, fy, 6, '#ffffff');
    // A ped in range gets knocked down and flees; a cop car takes a dent.
    const ped = world.traffic.nearestPed(this.x, this.y, CFG.PUNCH_RANGE + 20);
    if (ped) {
      ped.scareFrom(this.x, this.y);
      world.police.addHeat(0.5);
      world.banner('You punched a pedestrian! Wanted level rising...', 2);
      return;
    }
    for (const cop of world.police.cars) {
      if (dist(cop.x, cop.y, this.x, this.y) < CFG.PUNCH_RANGE + 30) {
        world.police.addHeat(0.5);
        world.banner('You hit a police car!', 2);
        return;
      }
    }
  }

  _shoot(world) {
    if (this.shootTimer > 0) return;
    this.shootTimer = CFG.SHOOT_COOLDOWN;
    world.audio.shoot();
    world.bullets.push({
      x: this.x + Math.cos(this.angle) * 24,
      y: this.y + Math.sin(this.angle) * 24,
      angle: this.angle,
      speed: CFG.BULLET_SPEED,
      life: CFG.BULLET_LIFE,
      fromPlayer: true,
    });
    world.police.addHeat(0.4);
    world.traffic.scarePeds(this.x, this.y, 320);
  }

  damage(amount) {
    this.health -= amount;
    this.hurtFlash = 0.5;
  }

  get dead() {
    return this.health <= 0;
  }
}
