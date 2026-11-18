// SOLMARA — Streets of the Sun. traffic.js
// Ambient life: traffic cars that drive the road grid and pedestrians who walk
// the sidewalks and flee from gunfire. Parked cars are generated once by the
// world and never re-rolled, so the streets look the same after a restart.

import { CFG, clamp, dist } from './config.js';
import { nearestRoadPoint } from './city.js';

const CAR_COLORS = ['#d94f3d', '#3d7bd9', '#f2c14e', '#7a4fd9', '#e8e8e8', '#2e2e33', '#4fd9a0', '#d97a4f'];

function randomRoadSpot(rng) {
  // Pick a random intersection, then sit on one of its four outgoing lanes.
  const i = rng.int(0, CFG.GRID);
  const j = rng.int(0, CFG.GRID);
  const axis = rng.pick(['x', 'y']);
  const dir = rng.pick([-1, 1]);
  const lane = rng.pick([-28, 28]);
  if (axis === 'x') return { x: i * CFG.PITCH, y: j * CFG.PITCH + lane, axis, dir };
  return { x: i * CFG.PITCH + lane, y: j * CFG.PITCH, axis, dir };
}

export class TrafficCar {
  constructor(rng, x, y, axis, dir) {
    this.x = x;
    this.y = y;
    this.axis = axis; // 'x' = driving along X, 'y' = driving along Y
    this.dir = dir; // +1 or -1 along the axis
    this.speed = rng.range(CFG.TRAFFIC_SPEED_MIN, CFG.TRAFFIC_SPEED_MAX);
    this.color = rng.pick(CAR_COLORS);
    this.turnCooldown = rng.range(0, 2);
    this.stopped = 0;
  }

  get angle() {
    if (this.axis === 'x') return this.dir > 0 ? 0 : Math.PI;
    return this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  update(dt, rng, others) {
    this.turnCooldown -= dt;
    // Slow down if another car is right ahead.
    let target = this.speed;
    for (const o of others) {
      if (o === this) continue;
      const ahead = this.axis === 'x'
        ? (o.y - this.y) * (o.y - this.y) < 900 && (o.x - this.x) * this.dir > 0 && (o.x - this.x) * this.dir < 70
        : (o.x - this.x) * (o.x - this.x) < 900 && (o.y - this.y) * this.dir > 0 && (o.y - this.y) * this.dir < 70;
      if (ahead) { target = 0; break; }
    }
    const step = target * dt;
    if (this.axis === 'x') this.x += step * this.dir;
    else this.y += step * this.dir;

    // At an intersection, sometimes turn onto the crossing road.
    const p = nearestRoadPoint(this.x, this.y);
    const atX = Math.abs(this.x - p.x) < 12;
    const atY = Math.abs(this.y - p.y) < 12;
    if (atX && atY && this.turnCooldown <= 0 && rng.chance(0.35)) {
      if (this.axis === 'x') {
        this.axis = 'y';
        this.x = p.x + rng.pick([-28, 28]);
        this.y = p.y;
        this.dir = rng.pick([-1, 1]);
      } else {
        this.axis = 'x';
        this.y = p.y + rng.pick([-28, 28]);
        this.x = p.x;
        this.dir = rng.pick([-1, 1]);
      }
      this.turnCooldown = rng.range(2, 5);
    }
    // Wrap around the map edges instead of vanishing.
    this.x = clamp(this.x, 40, CFG.WORLD - 40);
    this.y = clamp(this.y, 40, CFG.WORLD - 40);
    if ((this.axis === 'x' && (this.x <= 41 || this.x >= CFG.WORLD - 41)) ||
        (this.axis === 'y' && (this.y <= 41 || this.y >= CFG.WORLD - 41))) {
      this.dir *= -1;
    }
  }
}

export class Ped {
  constructor(rng, x, y) {
    this.x = x;
    this.y = y;
    this.speed = rng.range(CFG.PED_SPEED_MIN, CFG.PED_SPEED_MAX);
    this.skin = rng.pick(CFG.COLORS.pedSkin);
    this.shirt = rng.pick(CFG.COLORS.pedShirt);
    this.tx = x;
    this.ty = y;
    this.flee = 0;
    this.fleeX = 0;
    this.fleeY = 0;
    this.panic = 0;
    this.pickTarget(rng);
  }

  pickTarget(rng) {
    // Walk to a random point on the SAME road, so peds follow the streets
    // instead of cutting diagonally across blocks and buildings.
    const lane = rng.pick([-60, 60]);
    if (rng.chance(0.5)) {
      // Along the horizontal road nearest to the ped.
      const p = nearestRoadPoint(this.x, this.y);
      this.tx = clamp(this.x + rng.range(-600, 600), 100, CFG.WORLD - 100);
      this.ty = p.y + lane;
    } else {
      // Along the vertical road nearest to the ped.
      const p = nearestRoadPoint(this.x, this.y);
      this.tx = p.x + lane;
      this.ty = clamp(this.y + rng.range(-600, 600), 100, CFG.WORLD - 100);
    }
  }

  update(dt, rng) {
    if (this.panic > 0) {
      this.panic -= dt;
      const d = Math.max(1, dist(this.x, this.y, this.fleeX, this.fleeY));
      const run = this.speed * 2.4;
      this.x += ((this.x - this.fleeX) / d) * run * dt;
      this.y += ((this.y - this.fleeY) / d) * run * dt;
      this.x = clamp(this.x, 30, CFG.WORLD - 30);
      this.y = clamp(this.y, 30, CFG.WORLD - 30);
      return;
    }
    // Manhattan movement: finish one axis before turning, like a pedestrian
    // walking the grid.
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    if (Math.abs(dx) > 12) {
      this.x += Math.sign(dx) * this.speed * dt;
    } else if (Math.abs(dy) > 12) {
      this.y += Math.sign(dy) * this.speed * dt;
    } else {
      this.pickTarget(rng);
    }
  }

  scareFrom(x, y) {
    this.fleeX = x;
    this.fleeY = y;
    this.panic = rngPanic();
  }
}

function rngPanic() {
  return 2.5;
}

export class Traffic {
  constructor(city, rng) {
    this.rng = rng;
    this.cars = [];
    this.peds = [];
    for (let i = 0; i < CFG.TRAFFIC_CARS; i++) {
      const s = randomRoadSpot(rng);
      this.cars.push(new TrafficCar(rng, s.x, s.y, s.axis, s.dir));
    }
    for (let i = 0; i < CFG.PEDS; i++) {
      const s = randomRoadSpot(rng);
      this.peds.push(new Ped(rng, s.x + rng.range(-60, 60), s.y + rng.range(-60, 60)));
    }
  }

  update(dt, playerPos) {
    for (const c of this.cars) c.update(dt, this.rng, this.cars);
    for (const p of this.peds) p.update(dt, this.rng);
    void playerPos;
  }

  // Every ped within r of (x, y) runs away.
  scarePeds(x, y, r) {
    for (const p of this.peds) {
      if (dist(p.x, p.y, x, y) < r) p.scareFrom(x, y);
    }
  }

  nearestPed(x, y, r) {
    let best = null;
    let bestD = r;
    for (const p of this.peds) {
      const d = dist(p.x, p.y, x, y);
      if (d < bestD) { best = p; bestD = d; }
    }
    return best;
  }

  // A traffic car the player could steal, if one is close and slow.
  nearestStealableCar(x, y, r) {
    let best = null;
    let bestD = r;
    for (const c of this.cars) {
      if (c.speed > 60) continue;
      const d = dist(c.x, c.y, x, y);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  }
}
