// SOLMARA — Streets of the Sun. shots.js
// Deterministic scenes for the screenshots (?shot=start|play|chase|end).
// Each shot seeds a fresh world, puts Dario somewhere photogenic, and leaves
// the game in the exact state the screenshot needs — no randomness between
// runs, so the dossier screenshots are reproducible.

import { CFG } from './config.js';

export function applyShot(world, name) {
  const p = world.player;
  if (name === 'start') {
    // Title screen: world is only a backdrop, Dario waits by the garage.
    p.reset(CFG.GARAGE.x, CFG.GARAGE.y);
    return 'title';
  }
  if (name === 'play') {
    // Mid-mission driving: Dario in his red car eastbound on the road to the
    // bank (road y=900, lane -28), traffic around him, mission 1 active.
    world.startMission(0);
    const car = world.parkedCars[world.parkedCars.length - 1];
    p.reset(car.x, car.y);
    p.money = 1250;
    p._getIn(car);
    car.x = 1700;
    car.y = 900 - 28;
    car.angle = 0;
    car.speed = 260;
    p.x = car.x;
    p.y = car.y;
    p.angle = 0;
    // Pull a few traffic cars into frame on the same roads.
    world.traffic.cars[0].x = 1950;
    world.traffic.cars[0].y = 900 + 28;
    world.traffic.cars[0].axis = 'x';
    world.traffic.cars[0].dir = -1;
    world.traffic.cars[1].x = 1350;
    world.traffic.cars[1].y = 900 - 28;
    world.traffic.cars[1].axis = 'x';
    world.traffic.cars[1].dir = 1;
    world.traffic.cars[2].x = 1500;
    world.traffic.cars[2].y = 1350 + 28;
    world.traffic.cars[2].axis = 'x';
    world.traffic.cars[2].dir = -1;
    return 'play';
  }
  if (name === 'chase') {
    // Police chase: two stars, two cop cars closing in on Dario's car,
    // westbound on the road south of the park (road y=1800, lane -28).
    world.startMission(3);
    world.missions.step = 2; // the escape step
    const car = world.parkedCars[world.parkedCars.length - 1];
    p.reset(car.x, car.y);
    p.money = 3300;
    p._getIn(car);
    car.x = 1575;
    car.y = 1800 - 28;
    car.angle = Math.PI;
    car.speed = 300;
    p.x = car.x;
    p.y = car.y;
    p.angle = Math.PI;
    world.police.setStars(2);
    world.police.update(0.01, p, () => {}, world.city);
    world.police.spawnTimer = 0;
    world.police.update(0.01, p, () => {}, world.city);
    if (world.police.cars[0]) {
      world.police.cars[0].x = p.x + 260;
      world.police.cars[0].y = p.y + 120;
    }
    if (world.police.cars[1]) {
      world.police.cars[1].x = p.x - 220;
      world.police.cars[1].y = p.y - 160;
    }
    world.banner('The cops are here! Lose them!', 5);
    return 'play';
  }
  if (name === 'end') {
    // Game over screen after a busted run.
    world.startMission(1);
    p.money = 800;
    world.completedMissions = 1;
    return 'over-busted';
  }
  return 'title';
}
