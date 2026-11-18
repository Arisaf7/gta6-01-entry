// SOLMARA — Streets of the Sun. render.js
// All drawing: the city from above, cars and people as flat vector shapes, the
// HUD (health, cash, wanted stars, objective), the minimap, and the full
// screens for title, briefing, pause, game over and victory.

import { CFG, clamp, dist } from './config.js';
import { isBeach, isWater } from './city.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCar(ctx, x, y, angle, color, opts = {}) {
  const L = CFG.CAR_LENGTH;
  const W = CFG.CAR_WIDTH;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Wheels
  ctx.fillStyle = '#14141a';
  ctx.fillRect(-L / 2 + 4, -W / 2 - 3, 12, 6);
  ctx.fillRect(-L / 2 + 4, W / 2 - 3, 12, 6);
  ctx.fillRect(L / 2 - 16, -W / 2 - 3, 12, 6);
  ctx.fillRect(L / 2 - 16, W / 2 - 3, 12, 6);
  // Body
  ctx.fillStyle = color;
  roundRect(ctx, -L / 2, -W / 2, L, W, 7);
  ctx.fill();
  // Windshield + rear window
  ctx.fillStyle = 'rgba(20, 30, 50, 0.85)';
  ctx.fillRect(L / 2 - 16, -W / 2 + 4, 8, W - 8);
  ctx.fillRect(-L / 2 + 6, -W / 2 + 4, 7, W - 8);
  // Headlights
  ctx.fillStyle = '#ffe9a0';
  ctx.fillRect(L / 2 - 2, -W / 2 + 3, 2, 5);
  ctx.fillRect(L / 2 - 2, W / 2 - 8, 2, 5);
  if (opts.police) {
    ctx.fillStyle = '#f5f2e8';
    ctx.fillRect(-8, -W / 2 + 2, 16, W - 4);
    const phase = Math.floor(opts.lightPhase || 0) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2e2e' : '#2e6bff';
    ctx.fillRect(-6, -W / 2 - 2, 6, 5);
    ctx.fillStyle = phase ? '#2e6bff' : '#ff2e2e';
    ctx.fillRect(0, -W / 2 - 2, 6, 5);
  }
  if (opts.wrecked) {
    ctx.fillStyle = 'rgba(20, 20, 24, 0.55)';
    roundRect(ctx, -L / 2, -W / 2, L, W, 7);
    ctx.fill();
  }
  ctx.restore();
}

function drawPed(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.skin;
  ctx.beginPath();
  ctx.arc(0, -2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, player) {
  const p = player;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.hurtFlash > 0 && Math.floor(p.hurtFlash * 12) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  // Dario: red jacket, dark jeans, facing the way he moves.
  ctx.fillStyle = CFG.COLORS.player;
  roundRect(ctx, -12, -9, 24, 18, 6);
  ctx.fill();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(12, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242e';
  ctx.fillRect(-12, -9, 6, 18);
  ctx.restore();
}

export function drawWorld(ctx, world, cam) {
  const C = CFG.COLORS;
  const vx = cam.x - CFG.VIEW_W / 2;
  const vy = cam.y - CFG.VIEW_H / 2;

  // Ground: grass everywhere first.
  ctx.fillStyle = C.grass;
  ctx.fillRect(vx, vy, CFG.VIEW_W, CFG.VIEW_H);

  // Beach strip along the south edge, water along the east edge.
  ctx.fillStyle = C.sand;
  ctx.fillRect(vx, Math.max(vy, 3150), CFG.VIEW_W, CFG.VIEW_H);
  ctx.fillStyle = C.water;
  ctx.fillRect(Math.max(vx, 3205), vy, CFG.VIEW_W, CFG.VIEW_H);
  ctx.fillStyle = C.waterDeep;
  ctx.fillRect(Math.max(vx, 3420), vy, CFG.VIEW_W, CFG.VIEW_H);

  // City blocks (slightly darker grass) between the roads.
  ctx.fillStyle = C.grassDark;
  for (let i = 0; i < CFG.GRID; i++) {
    for (let j = 0; j < CFG.GRID; j++) {
      const bx = i * CFG.PITCH + CFG.HALF_ROAD;
      const by = j * CFG.PITCH + CFG.HALF_ROAD;
      const bw = CFG.PITCH - CFG.ROAD;
      if (bx + bw > 3205 || by + bw > 3150) continue;
      ctx.fillRect(bx, by, bw, bw);
    }
  }

  // Roads.
  ctx.fillStyle = C.road;
  for (let i = 0; i <= CFG.GRID; i++) {
    ctx.fillRect(i * CFG.PITCH - CFG.HALF_ROAD, 0, CFG.ROAD, CFG.WORLD);
    ctx.fillRect(0, i * CFG.PITCH - CFG.HALF_ROAD, CFG.WORLD, CFG.ROAD);
  }
  // Centre dashes.
  ctx.fillStyle = C.roadLine;
  for (let i = 0; i <= CFG.GRID; i++) {
    for (let d = 0; d < CFG.WORLD; d += 90) {
      ctx.fillRect(i * CFG.PITCH - 2, d, 4, 44);
      ctx.fillRect(d, i * CFG.PITCH - 2, 44, 4);
    }
  }

  // Park: paths and trees.
  const park = CFG.PARK;
  ctx.fillStyle = '#5da244';
  ctx.fillRect(park.x - 170, park.y - 170, 340, 340);
  ctx.fillStyle = C.parkPath;
  ctx.fillRect(park.x - 12, park.y - 170, 24, 340);
  ctx.fillRect(park.x - 170, park.y - 12, 340, 24);
  for (const t of world.city.trees) {
    ctx.fillStyle = C.parkTree;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(t.x - 4, t.y - 4, t.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Docks piers.
  for (const pier of world.city.piers) {
    ctx.fillStyle = C.pier;
    ctx.fillRect(pier.x, pier.y - pier.h / 2, pier.w, pier.h);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(pier.x, pier.y - pier.h / 2, pier.w, 4);
  }

  // Buildings with a soft shadow and a roof line.
  for (const b of world.city.buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x - b.w / 2 + 6, b.y - b.h / 2 + 8, b.w, b.h);
    ctx.fillStyle = C.buildingWall;
    ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x - b.w / 2 + 6, b.y - b.h / 2 + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(b.x - b.w / 2 + 6, b.y - b.h / 2 + 6, b.w - 12, 8);
    if (b.kind !== 'block') {
      ctx.fillStyle = '#20242e';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        b.kind === 'garage' ? 'GARAGE' : b.kind === 'bank' ? 'BANK' : 'HOTEL',
        b.x, b.y + 5,
      );
    }
  }

  // Objective marker: a pulsing ring where the mission wants you.
  const step = world.missions.stepDef;
  if (step && step.kind === 'goto') {
    const pulse = 1 + Math.sin(world.time * 4) * 0.15;
    ctx.strokeStyle = '#ffc93f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(step.x, step.y, 46 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffc93f';
    ctx.beginPath();
    ctx.arc(step.x, step.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Parked cars, traffic, police, peds, bullets, particles, player.
  for (const c of world.parkedCars) {
    if (c === world.player.car) continue;
    drawCar(ctx, c.x, c.y, c.angle, c.color, { wrecked: c.wrecked });
  }
  // The player's own car (skipped above so it is not drawn twice).
  if (world.player.inCar && world.player.car) {
    const pc = world.player.car;
    drawCar(ctx, pc.x, pc.y, pc.angle, pc.color, { wrecked: pc.wrecked });
  }
  for (const c of world.traffic.cars) drawCar(ctx, c.x, c.y, c.angle, c.color);
  for (const cop of world.police.cars) {
    drawCar(ctx, cop.x, cop.y, cop.angle, CFG.COLORS.police, { police: true, lightPhase: cop.lightPhase });
  }
  for (const p of world.traffic.peds) drawPed(ctx, p);
  ctx.fillStyle = '#ffe9a0';
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
  // On foot, draw Dario; in a car the car itself is the player (drawn above).
  if (!world.player.inCar) drawPlayer(ctx, world.player);
}

export function drawHUD(ctx, world) {
  const C = CFG.COLORS;
  const p = world.player;

  // Top-left: cash, health, mission.
  ctx.fillStyle = C.hudBg;
  roundRect(ctx, 12, 12, 300, 96, 10);
  ctx.fill();
  ctx.fillStyle = C.accent;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${p.money.toLocaleString('en-US')}`, 24, 42);
  ctx.fillStyle = '#ff5a4e';
  ctx.fillRect(24, 54, 180, 12);
  ctx.fillStyle = '#57d977';
  ctx.fillRect(24, 54, 180 * clamp(p.health / CFG.PLAYER_HEALTH, 0, 1), 12);
  ctx.fillStyle = C.text;
  ctx.font = '13px sans-serif';
  ctx.fillText(`HEALTH ${Math.ceil(p.health)}`, 212, 64);
  ctx.fillStyle = C.text;
  ctx.font = 'bold 14px sans-serif';
  const mission = world.missions.mission;
  ctx.fillText(
    mission ? `MISSION ${mission.id}/5 — ${mission.title}` : 'FREE ROAM',
    24, 92,
  );

  // Objective line under the panel.
  if (world.missions.active) {
    ctx.fillStyle = 'rgba(12,18,28,0.7)';
    roundRect(ctx, 12, 116, 420, 30, 8);
    ctx.fill();
    ctx.fillStyle = C.text;
    ctx.font = '14px sans-serif';
    ctx.fillText(`> ${world.missions.objective}`, 24, 136);
  }

  // Wanted stars, top centre — drawn as vector stars (no font glyph needed).
  const stars = world.police.stars;
  if (stars > 0) {
    for (let i = 0; i < CFG.MAX_STARS; i++) {
      const cx = CFG.VIEW_W / 2 - 64 + i * 32;
      const cy = 30;
      ctx.fillStyle = i < stars ? '#ffc93f' : 'rgba(245,242,232,0.25)';
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 === 0 ? 13 : 5.5;
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  // Speed + car health, bottom right.
  if (p.inCar && p.car) {
    ctx.fillStyle = C.hudBg;
    roundRect(ctx, CFG.VIEW_W - 212, CFG.VIEW_H - 64, 200, 52, 10);
    ctx.fill();
    ctx.fillStyle = C.text;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(Math.abs(p.speed) * 0.36)} km/h`, CFG.VIEW_W - 24, CFG.VIEW_H - 30);
    ctx.font = '12px sans-serif';
    ctx.fillText(`CAR ${Math.max(0, Math.ceil(p.car.health))}%`, CFG.VIEW_W - 24, CFG.VIEW_H - 20);
    ctx.textAlign = 'left';
  }

  // Controls hint, bottom left.
  ctx.fillStyle = 'rgba(12,18,28,0.6)';
  roundRect(ctx, 12, CFG.VIEW_H - 40, 470, 28, 8);
  ctx.fill();
  ctx.fillStyle = C.text;
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD move/drive   E enter car   F punch   SPACE shoot   P pause   M mute', 22, CFG.VIEW_H - 21);

  // Banner (steal / pickup messages).
  if (world.bannerTimer > 0) {
    ctx.globalAlpha = clamp(world.bannerTimer, 0, 1);
    ctx.fillStyle = 'rgba(12,18,28,0.8)';
    const w = ctx.measureText(world.bannerText).width + 32;
    roundRect(ctx, CFG.VIEW_W / 2 - w / 2, 64, w, 34, 8);
    ctx.fill();
    ctx.fillStyle = C.accent;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.bannerText, CFG.VIEW_W / 2, 86);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

export function drawMinimap(ctx, world) {
  const C = CFG.COLORS;
  const size = 190;
  const x0 = CFG.VIEW_W - size - 12;
  const y0 = 12;
  const scale = size / CFG.WORLD;
  ctx.fillStyle = C.minimapBg;
  roundRect(ctx, x0 - 6, y0 - 6, size + 12, size + 12, 10);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  ctx.fillStyle = '#5da244';
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = C.sand;
  ctx.fillRect(x0, y0 + 3150 * scale, size, size);
  ctx.fillStyle = C.water;
  ctx.fillRect(x0 + 3205 * scale, y0, size, size);
  ctx.strokeStyle = '#3d3d46';
  ctx.lineWidth = 3;
  for (let i = 0; i <= CFG.GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(x0 + i * CFG.PITCH * scale, y0);
    ctx.lineTo(x0 + i * CFG.PITCH * scale, y0 + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0, y0 + i * CFG.PITCH * scale);
    ctx.lineTo(x0 + size, y0 + i * CFG.PITCH * scale);
    ctx.stroke();
  }
  // Objective marker.
  const step = world.missions.stepDef;
  if (step && step.kind === 'goto') {
    ctx.fillStyle = '#ffc93f';
    ctx.beginPath();
    ctx.arc(x0 + step.x * scale, y0 + step.y * scale, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police (red), player (white).
  ctx.fillStyle = '#ff2e2e';
  for (const cop of world.police.cars) {
    ctx.beginPath();
    ctx.arc(x0 + cop.x * scale, y0 + cop.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x0 + world.player.x * scale, y0 + world.player.y * scale, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Minimap sits below the stars row; the HUD panel is top-left, so no overlap.
  void dist;
}

function screenBase(ctx, title, accent) {
  ctx.fillStyle = 'rgba(10, 14, 24, 0.88)';
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, CFG.VIEW_W / 2, 190);
  ctx.textAlign = 'left';
}

function screenText(ctx, lines, startY) {
  ctx.fillStyle = CFG.COLORS.text;
  ctx.font = '19px sans-serif';
  ctx.textAlign = 'center';
  lines.forEach((line, i) => {
    ctx.fillText(line, CFG.VIEW_W / 2, startY + i * 30);
  });
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, save) {
  // Sun-soaked title backdrop: sky gradient, sun, skyline.
  const g = ctx.createLinearGradient(0, 0, 0, CFG.VIEW_H);
  g.addColorStop(0, '#ff9a3d');
  g.addColorStop(0.55, '#ff5a6e');
  g.addColorStop(1, '#2e1a4e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
  ctx.fillStyle = '#ffe9a0';
  ctx.beginPath();
  ctx.arc(1020, 150, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 20, 40, 0.85)';
  const heights = [180, 260, 210, 300, 240, 320, 200, 270, 230, 290, 190, 250];
  heights.forEach((h, i) => {
    ctx.fillRect(40 + i * 104, CFG.VIEW_H - 120 - h, 84, h + 120);
  });
  ctx.fillStyle = '#ffc93f';
  for (let i = 0; i < 40; i++) {
    ctx.fillRect(48 + (i % 12) * 104 + Math.floor(i / 12) * 22, CFG.VIEW_H - 100 - Math.floor(i / 12) * 60, 10, 12);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 92px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMARA', CFG.VIEW_W / 2, 190);
  ctx.fillStyle = '#ffc93f';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('— STREETS OF THE SUN —', CFG.VIEW_W / 2, 240);
  ctx.fillStyle = CFG.COLORS.text;
  ctx.font = '20px sans-serif';
  ctx.fillText('Dario Reyes is back in Solmara. Mama Rosa has five jobs for him.', CFG.VIEW_W / 2, 300);
  ctx.fillText('Drive, steal, fight, outrun the police — and bring the money home.', CFG.VIEW_W / 2, 330);
  if (save && save.missionsDone > 0) {
    ctx.fillStyle = '#ffc93f';
    ctx.fillText(`Saved progress: ${save.missionsDone}/5 missions done — $${save.money}`, CFG.VIEW_W / 2, 380);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('PRESS ENTER TO START', CFG.VIEW_W / 2, 470);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(245,242,232,0.8)';
  ctx.fillText('WASD move / drive · E enter car · F punch · SPACE shoot · P pause · M mute', CFG.VIEW_W / 2, 510);
  ctx.textAlign = 'left';
}

export function drawBriefing(ctx, mission, reward) {
  screenBase(ctx, `MISSION ${mission.id}: ${mission.title}`, '#ffc93f');
  screenText(ctx, [
    mission.brief,
    '',
    `Reward: $${reward}`,
    '',
    'Press ENTER to start the job.',
  ], 260);
}

export function drawPause(ctx) {
  screenBase(ctx, 'PAUSED', '#f5f2e8');
  screenText(ctx, ['Press P or ESC to keep playing.', 'Press ENTER to restart from the garage.'], 280);
}

export function drawGameOver(ctx, world, reason) {
  screenBase(ctx, reason === 'busted' ? 'BUSTED!' : 'WASTED!', '#ff5a4e');
  const lines = [
    reason === 'busted'
      ? 'The Solmara police caught Dario. Mama Rosa is not impressed.'
      : 'Dario is down. The streets of Solmara keep moving without him.',
    '',
    `Missions completed: ${world.completedMissions}/5`,
    `Cash: $${world.player.money}`,
    '',
    'Press ENTER to try again.',
  ];
  screenText(ctx, lines, 260);
}

export function drawVictory(ctx, world) {
  screenBase(ctx, 'SOLMARA IS YOURS!', '#57d977');
  const lines = [
    'All five of Mama Rosa\u2019s jobs are done. The Big Score is in the bag,',
    'the cops lost the trail, and Dario Reyes owns these streets.',
    '',
    `Final cash: $${world.player.money}`,
    '',
    'Press ENTER to play again in free roam.',
  ];
  screenText(ctx, lines, 260);
}
