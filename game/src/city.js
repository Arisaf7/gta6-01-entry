// SOLMARA — Streets of the Sun. city.js
// The city: an 8x8 grid of blocks on a 3600x3600 map. Roads run on multiples of
// PITCH (450); blocks sit between them. One block is the park, one holds Rosa's
// Garage, one the bank, one the hotel; the east edge is the docks and the south
// edge is the beach.

import { CFG, blockCenter, clamp } from './config.js';

export function buildCity(rng) {
  const buildings = [];
  const trees = [];
  const piers = [];

  for (let i = 0; i < CFG.GRID; i++) {
    for (let j = 0; j < CFG.GRID; j++) {
      const c = blockCenter(i, j);
      // Park block: trees and paths, no buildings.
      if (i === CFG.PARK_BLOCK.i && j === CFG.PARK_BLOCK.j) {
        for (let t = 0; t < 14; t++) {
          trees.push({
            x: c.x + rng.range(-140, 140),
            y: c.y + rng.range(-140, 140),
            r: rng.range(14, 22),
          });
        }
        continue;
      }
      // Docks strip and beach strip stay open.
      if (i === CFG.GRID - 1 && j >= 5) continue;
      if (j === CFG.GRID - 1 && i >= 5) continue;

      const isGarage = i === 0 && j === 0;
      const isBank = i === 4 && j === 2;
      const isHotel = i === 3 && j === 1;
      const count = isGarage || isBank || isHotel ? 1 : rng.int(1, 3);
      // Quadrant slots keep buildings inside the block interior (340x340)
      // and away from each other: a building never reaches the road.
      const slots = [[-75, -75], [75, 75], [75, -75], [-75, 75]];
      const chosen = rng.shuffle(slots).slice(0, count);
      for (let b = 0; b < count; b++) {
        const special = isGarage || isBank || isHotel;
        // The garage sits in the north-west corner of its block so Dario's
        // spawn point (225,225) and his red car (315,265) stay in the open.
        const w = isGarage ? 150 : special ? rng.range(190, 230) : rng.range(110, 160);
        const h = isGarage ? 120 : special ? rng.range(150, 190) : rng.range(100, 140);
        const ox = isGarage ? -95 : special ? 0 : chosen[b][0];
        const oy = isGarage ? -95 : special ? 0 : chosen[b][1];
        buildings.push({
          x: clamp(c.x + ox, 130, CFG.WORLD - 130),
          y: clamp(c.y + oy, 130, CFG.WORLD - 130),
          w, h,
          roof: rng.pick(CFG.COLORS.buildingRoof),
          kind: isGarage ? 'garage' : isBank ? 'bank' : isHotel ? 'hotel' : 'block',
        });
      }
      // A couple of street trees on ordinary blocks.
      if (!isGarage && !isBank && !isHotel && rng.chance(0.6)) {
        trees.push({
          x: c.x + rng.range(-150, 150),
          y: c.y + rng.range(-150, 150),
          r: rng.range(12, 18),
        });
      }
    }
  }

  // Docks: three piers reaching into the water on the east edge.
  for (let p = 0; p < 3; p++) {
    piers.push({ x: 3360, y: 900 + p * 900, w: 200, h: 70 });
  }

  return { buildings, trees, piers };
}

// True when the point is on a road (within half road width of a grid line).
export function isOnRoad(x, y) {
  const rx = x % CFG.PITCH;
  const ry = y % CFG.PITCH;
  const nearX = Math.min(rx, CFG.PITCH - rx) <= CFG.HALF_ROAD;
  const nearY = Math.min(ry, CFG.PITCH - ry) <= CFG.HALF_ROAD;
  return nearX || nearY;
}

// True when the point is in the water (docks) or on the sand (beach).
export function isWater(x) {
  return x > 3205;
}

export function isBeach(y) {
  return y > 3150;
}

// Push a circle (x, y, r) out of every building it overlaps. Returns true if
// any push happened. Buildings are axis-aligned, so this is a cheap AABB test.
export function collideBuildings(city, x, y, r) {
  let hit = false;
  for (const b of city.buildings) {
    const hw = b.w / 2 + r;
    const hh = b.h / 2 + r;
    const dx = x - b.x;
    const dy = y - b.y;
    if (Math.abs(dx) < hw && Math.abs(dy) < hh) {
      const px = hw - Math.abs(dx);
      const py = hh - Math.abs(dy);
      if (px < py) x += dx > 0 ? px : -px;
      else y += dy > 0 ? py : -py;
      hit = true;
    }
  }
  return { x, y, hit };
}

// The nearest road-centre point to (x, y): where a car snaps when it turns.
export function nearestRoadPoint(x, y) {
  const nx = Math.round(x / CFG.PITCH) * CFG.PITCH;
  const ny = Math.round(y / CFG.PITCH) * CFG.PITCH;
  return { x: nx, y: ny };
}
