// SOLMARA — Streets of the Sun. config.js
// Every tuning number for the game lives here so the other modules stay small
// and readable. The city is a 3600x3600 open world on an 8x8 grid.

export const CFG = {
  // World geometry
  WORLD: 3600,
  GRID: 8,
  PITCH: 450,
  ROAD: 110,
  HALF_ROAD: 55,

  // Named places (world coords). The goto radii clear the buildings that sit
  // on them: a player pushed out of a building still counts as arrived.
  GARAGE: { x: 225, y: 225, r: 160, label: "Rosa's Garage" },
  BANK: { x: 2025, y: 1125, r: 170, label: 'Solmara National Bank' },
  HOTEL: { x: 1575, y: 675, r: 170, label: 'Hotel Miramar' },
  PARK_BLOCK: { i: 3, j: 3 }, // park occupies block (3,3), centre (1575,1575)
  PARK: { x: 1575, y: 1575, r: 150, label: 'Palma Park' },
  DOCKS: { x: 3300, y: 1800, r: 140, label: 'The Docks' },
  BEACH: { x: 1800, y: 3300, r: 140, label: 'Solmara Beach' },

  // Player
  WALK_SPEED: 230,
  WALK_ACCEL: 1800,
  PLAYER_RADIUS: 16,
  PLAYER_HEALTH: 100,
  PUNCH_RANGE: 56,
  PUNCH_DAMAGE: 34,
  PUNCH_COOLDOWN: 0.35,
  SHOOT_COOLDOWN: 0.22,
  BULLET_SPEED: 720,
  BULLET_LIFE: 0.9,
  BULLET_DAMAGE: 50,

  // Cars
  CAR_ACCEL: 520,
  CAR_BRAKE: 900,
  CAR_MAX_SPEED: 430,
  CAR_REVERSE_MAX: 150,
  CAR_STEER: 2.6,
  CAR_FRICTION: 1.6,
  CAR_HEALTH: 100,
  CAR_LENGTH: 46,
  CAR_WIDTH: 22,

  // Traffic
  TRAFFIC_CARS: 14,
  TRAFFIC_SPEED_MIN: 110,
  TRAFFIC_SPEED_MAX: 190,
  PEDS: 26,
  PED_SPEED_MIN: 45,
  PED_SPEED_MAX: 85,
  PARKED_CARS: 18,

  // Police / wanted
  MAX_STARS: 5,
  POLICE_SPEED: 380,
  POLICE_SPAWN_DIST: 700,
  BUST_DIST: 34,
  BUST_TIME: 1.4,
  HEAT_DECAY: 0.12, // stars fade when the player is far from every cop
  HIDE_DIST: 900,

  // Missions
  MISSION_REWARDS: [500, 800, 1000, 1500, 5000],
  START_MONEY: 250,

  // Camera / view
  VIEW_W: 1280,
  VIEW_H: 720,

  // Palette — a sun-soaked coastal city, all flat colours drawn in code
  COLORS: {
    grass: '#7ec850',
    grassDark: '#6db844',
    road: '#3d3d46',
    roadLine: '#e8d44d',
    sidewalk: '#b8b0a0',
    sand: '#ecd9a0',
    water: '#2f7fc2',
    waterDeep: '#1f5f9e',
    pier: '#8a6b4a',
    buildingRoof: ['#c96f4a', '#4a7ec9', '#c9a44a', '#7a4ac9', '#4ac9a0', '#c94a6f'],
    buildingWall: '#e8e0d0',
    parkTree: '#2f7a33',
    parkPath: '#d8c9a0',
    garage: '#e05a4e',
    bank: '#f2e6c9',
    hotel: '#f7c9d9',
    player: '#e33e2b',
    playerDark: '#8f1f14',
    pedSkin: ['#f2c9a0', '#d9a06f', '#8a5a33', '#f7d9b0'],
    pedShirt: ['#3f6fd9', '#d93f6f', '#3fd96f', '#f2f2f2', '#f2a93f'],
    police: '#20242e',
    policeLight: ['#ff2e2e', '#2e6bff'],
    minimapBg: 'rgba(12, 18, 28, 0.82)',
    hudBg: 'rgba(12, 18, 28, 0.78)',
    text: '#f5f2e8',
    accent: '#ffc93f',
  },
};

// Block centre for grid indices (i, j), 0-based.
export function blockCenter(i, j) {
  return { x: i * CFG.PITCH + CFG.PITCH / 2, y: j * CFG.PITCH + CFG.PITCH / 2 };
}

// The road centrelines sit on multiples of PITCH (0..GRID). Returns the nearest
// road centre coordinate on one axis.
export function nearestRoadCoord(v) {
  return Math.round(v / CFG.PITCH) * CFG.PITCH;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax, ay, bx, by) {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
