// SOLMARA — Streets of the Sun. world.js
// The world holds everything: city, traffic, police, player, missions, bullets
// and particles. Parked cars and the city layout are generated ONCE in the
// constructor and never re-rolled — startGame only resets the player, the
// wanted level and the mission, so the streets stay exactly as they were
// (an earlier build re-rolled them on every restart, which broke continuity).

import { CFG, clamp, dist } from './config.js';
import { RNG } from './random.js';
import { buildCity, isOnRoad } from './city.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { MissionRunner } from './missions.js';
import { Player } from './player.js';

const PARKED_COLORS = ['#c94f4f', '#4f7ac9', '#e8d44d', '#8a8a92', '#4fc98a', '#d98a4f'];

export class World {
  constructor(seed = 1, audio = null) {
    this.seed = seed;
    this.audio = audio;
    this.rng = new RNG(seed);
    this.city = buildCity(this.rng);
    this.traffic = new Traffic(this.city, this.rng);
    this.police = new Police(this.rng);
    this.missions = new MissionRunner();
    this.player = new Player();
    this.bullets = [];
    this.particles = [];
    this.parkedCars = this._makeParkedCars();
    this.time = 0;
    this.bannerText = '';
    this.bannerTimer = 0;
    this.busted = false;
    this.wrecked = false;
    this.completedMissions = 0;
  }

  _makeParkedCars() {
    const cars = [];
    const used = new Set();
    let tries = 0;
    while (cars.length < CFG.PARKED_CARS && tries < 300) {
      tries++;
      const i = this.rng.int(0, CFG.GRID);
      const j = this.rng.int(0, CFG.GRID);
      const key = `${i},${j}`;
      if (used.has(key)) continue;
      used.add(key);
      const axis = this.rng.pick(['x', 'y']);
      const lane = this.rng.pick([-105, 105]); // parked on the verge, clear of buildings
      const x = axis === 'x' ? i * CFG.PITCH + this.rng.range(-120, 120) : i * CFG.PITCH + lane;
      const y = axis === 'x' ? j * CFG.PITCH + lane : j * CFG.PITCH + this.rng.range(-120, 120);
      cars.push({
        x: clamp(x, 60, CFG.WORLD - 60),
        y: clamp(y, 60, CFG.WORLD - 60),
        angle: axis === 'x' ? (this.rng.chance(0.5) ? 0 : Math.PI) : (this.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2),
        speed: 0,
        health: CFG.CAR_HEALTH,
        color: this.rng.pick(PARKED_COLORS),
        parked: true,
        wrecked: false,
      });
    }
    // Dario's own car starts parked right outside the garage.
    cars.push({
      x: CFG.GARAGE.x + 90,
      y: CFG.GARAGE.y + 40,
      angle: 0,
      speed: 0,
      health: CFG.CAR_HEALTH,
      color: '#e33e2b',
      parked: true,
      wrecked: false,
    });
    return cars;
  }

  nearestParkedCar(x, y, r) {
    let best = null;
    let bestD = r;
    for (const c of this.parkedCars) {
      if (c.wrecked) continue;
      const d = dist(c.x, c.y, x, y);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  banner(text, seconds) {
    this.bannerText = text;
    this.bannerTimer = seconds;
  }

  addParticles(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const s = this.rng.range(40, 220);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: this.rng.range(0.3, 0.8),
        maxLife: 0.8,
        color,
        size: this.rng.range(2, 5),
      });
    }
  }

  onCarWrecked() {
    this.wrecked = true;
    this.banner('Your car is wrecked!', 2.5);
  }

  // Reset for a new run WITHOUT touching the city, parked cars or traffic
  // layout — only the player, police, mission and transient state move.
  softReset() {
    this.player.reset(CFG.GARAGE.x, CFG.GARAGE.y);
    this.player.money = CFG.START_MONEY;
    this.police.reset();
    this.missions.reset();
    this.bullets = [];
    this.particles = [];
    this.time = 0;
    this.bannerText = '';
    this.bannerTimer = 0;
    this.busted = false;
    this.wrecked = false;
    this.completedMissions = 0;
    for (const c of this.parkedCars) {
      c.health = CFG.CAR_HEALTH;
      c.wrecked = false;
      c.speed = 0;
    }
  }

  startMission(index) {
    return this.missions.start(index);
  }

  update(dt, actions) {
    this.time += dt;
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);

    this.player.update(dt, actions, this);
    this.traffic.update(dt, this.player);
    this.police.update(dt, this.player, () => {
      this.busted = true;
    }, this.city);

    // Bullets fly, hit peds and cop cars, then fade.
    for (const b of this.bullets) {
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;
      const ped = this.traffic.nearestPed(b.x, b.y, 18);
      if (ped) {
        ped.scareFrom(b.x, b.y);
        this.addParticles(b.x, b.y, 8, '#ff5a5a');
        b.life = 0;
      }
      for (const cop of this.police.cars) {
        if (dist(cop.x, cop.y, b.x, b.y) < 30) {
          this.addParticles(b.x, b.y, 8, '#ffd23f');
          cop.speed *= 0.5;
          b.life = 0;
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < CFG.WORLD && b.y > 0 && b.y < CFG.WORLD);

    // Particles drift and fade.
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // Mission progress.
    const event = this.missions.update(dt, this);
    if (event) return event;

    // Cop cars ramming the player on foot hurt him.
    if (!this.player.inCar) {
      for (const cop of this.police.cars) {
        if (dist(cop.x, cop.y, this.player.x, this.player.y) < 30 && this.player.hurtFlash <= 0) {
          this.player.damage(8);
        }
      }
    }
    // Being out in the open with no mission and no heat slowly heals.
    if (this.police.stars === 0 && this.player.health < CFG.PLAYER_HEALTH) {
      this.player.health = Math.min(CFG.PLAYER_HEALTH, this.player.health + dt * 2);
    }
    return null;
  }
}
