// SOLMARA — Streets of the Sun. police.js
// The wanted system: 0–5 stars. Crimes add stars; police cars spawn in
// proportion and chase the player. Get busted on foot (a cop sits on you) or
// wreck your car and the run ends. Lose the cops by outrunning them — heat
// decays once every cop is far away.

import { CFG, clamp, dist, angleLerp } from './config.js';
import { collideBuildings } from './city.js';

export class PoliceCar {
  constructor(x, y, rng) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.speed = 0;
    this.maxSpeed = CFG.POLICE_SPEED + rng.range(-20, 40);
    this.lightPhase = rng.range(0, 1);
    this.siren = 0;
  }

  update(dt, target, city) {
    const want = Math.atan2(target.y - this.y, target.x - this.x);
    this.angle = angleLerp(this.angle, want, Math.min(1, dt * 2.2));
    const d = dist(this.x, this.y, target.x, target.y);
    const desired = d > 120 ? this.maxSpeed : this.maxSpeed * 0.55;
    this.speed += (desired - this.speed) * Math.min(1, dt * 1.4);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    // Slide around buildings instead of driving through them.
    if (city) {
      const solved = collideBuildings(city, this.x, this.y, 20);
      this.x = solved.x;
      this.y = solved.y;
    }
    this.x = clamp(this.x, 30, CFG.WORLD - 30);
    this.y = clamp(this.y, 30, CFG.WORLD - 30);
    this.lightPhase += dt * 6;
  }
}

export class Police {
  constructor(rng) {
    this.rng = rng;
    this.stars = 0;
    this.heat = 0; // fractional progress toward the next star
    this.cars = [];
    this.bustTimer = 0;
    this.spawnTimer = 0;
    this.evadeTimer = 0;
  }

  reset() {
    this.stars = 0;
    this.heat = 0;
    this.cars = [];
    this.bustTimer = 0;
    this.evadeTimer = 0;
  }

  addHeat(amount) {
    this.heat += amount;
    while (this.heat >= 1 && this.stars < CFG.MAX_STARS) {
      this.heat -= 1;
      this.stars++;
    }
    if (this.stars >= CFG.MAX_STARS) this.heat = 0;
  }

  setStars(n) {
    this.stars = clamp(n, 0, CFG.MAX_STARS);
    this.heat = 0;
  }

  update(dt, player, onBusted, city) {
    // Spawn / despawn pursuit cars to match the wanted level.
    this.spawnTimer -= dt;
    if (this.cars.length < this.stars && this.spawnTimer <= 0) {
      const a = this.rng.range(0, Math.PI * 2);
      const d = CFG.POLICE_SPAWN_DIST;
      this.cars.push(new PoliceCar(
        clamp(player.x + Math.cos(a) * d, 60, CFG.WORLD - 60),
        clamp(player.y + Math.sin(a) * d, 60, CFG.WORLD - 60),
        this.rng,
      ));
      this.spawnTimer = 1.2;
    }
    if (this.cars.length > this.stars) {
      this.cars.length = this.stars;
    }
    for (const c of this.cars) c.update(dt, player, city);

    // Busted: a cop stays on top of the player on foot.
    const closest = this.cars.reduce((best, c) => {
      const d = dist(c.x, c.y, player.x, player.y);
      return best === null || d < best ? d : best;
    }, null);
    if (closest !== null && closest < CFG.BUST_DIST && !player.inCar) {
      this.bustTimer += dt;
      if (this.bustTimer >= CFG.BUST_TIME) onBusted();
    } else {
      this.bustTimer = Math.max(0, this.bustTimer - dt * 2);
    }

    // Evade: when every cop is far away, heat bleeds off and stars drop.
    if (this.stars > 0 && closest !== null && closest > CFG.HIDE_DIST) {
      this.evadeTimer += dt;
      if (this.evadeTimer > 6) {
        this.stars--;
        this.evadeTimer = 0;
      }
    } else {
      this.evadeTimer = 0;
    }
  }
}
