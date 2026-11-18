// SOLMARA — Streets of the Sun. main.js
// The game loop and the state machine:
//   title -> briefing -> play -> pause -> play ... -> over -> title
//   play -> (all 5 missions done) -> victory -> title (free roam)
// startGame() deliberately does NOT rebuild the world: it calls
// world.softReset(), which keeps the city, parked cars and traffic exactly as
// they were, and only resets the player, the wanted level and the mission.
// (An earlier build re-rolled the whole world on restart.)

import { CFG, clamp } from './config.js';
import { RNG, hashSeed } from './random.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { World } from './world.js';
import { MISSIONS } from './missions.js';
import {
  drawWorld, drawHUD, drawMinimap,
  drawTitle, drawBriefing, drawPause, drawGameOver, drawVictory,
} from './render.js';
import { applyShot } from './shots.js';
import { loadSave, saveGame } from './save.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CFG.VIEW_W;
canvas.height = CFG.VIEW_H;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const input = new Input();
input.attach();
const audio = new AudioEngine();
const world = new World(seed, audio);
const save = loadSave();

const camera = { x: world.player.x, y: world.player.y };
let state = 'title';
let overReason = 'wasted';
let lastTime = performance.now();
let muted = false;

// Shot mode: freeze a deterministic scene for screenshots, render one frame,
// and stop the loop (the headless screenshot waits for the page to settle).
let shotState = null;
if (shotName) {
  shotState = applyShot(world, shotName);
  state = shotState === 'over-busted' ? 'over' : shotState;
  if (state === 'over') overReason = 'busted';
  if (state === 'play') world.missions.active = true;
}

function startGame() {
  audio.ensure();
  world.softReset();
  // Resume a saved run, or start from mission 1.
  const startIndex = save && save.missionsDone > 0 && save.missionsDone < MISSIONS.length
    ? save.missionsDone
    : 0;
  world.player.money = save && save.missionsDone > 0 ? save.money : CFG.START_MONEY;
  world.completedMissions = save ? save.missionsDone : 0;
  world.startMission(startIndex);
  state = 'briefing';
}

function beginPlay() {
  state = 'play';
}

function gameOver(reason) {
  overReason = reason;
  state = 'over';
  audio.jingle(false);
  saveGame({
    money: world.player.money,
    missionsDone: world.completedMissions,
    bestScore: Math.max(save?.bestScore ?? 0, world.player.money),
  });
}

function victory() {
  state = 'victory';
  audio.jingle(true);
  saveGame({
    money: world.player.money,
    missionsDone: MISSIONS.length,
    bestScore: Math.max(save?.bestScore ?? 0, world.player.money),
  });
}

function handleUi(ui) {
  if (ui.mute) {
    muted = !muted;
    audio.setMuted(muted);
  }
  if (!ui.confirm && !ui.pause) return;
  if (state === 'title' && ui.confirm) {
    audio.ensure();
    startGame();
  } else if (state === 'briefing' && ui.confirm) {
    beginPlay();
  } else if (state === 'play' && ui.pause) {
    state = 'pause';
  } else if (state === 'pause' && ui.pause) {
    state = 'play';
  } else if (state === 'pause' && ui.confirm) {
    startGame();
  } else if ((state === 'over' || state === 'victory') && ui.confirm) {
    startGame();
  }
}

function update(dt) {
  const ui = input.takeUiActions();
  handleUi(ui);
  if (state !== 'play') return;

  const actions = input.takePlayerActions();
  const event = world.update(dt, actions);
  audio.update(dt, world.player.speedNorm, world.police.stars);

  if (event) {
    if (event.type === 'step') {
      audio.pickup();
      world.banner(event.step.label, 2.5);
    } else if (event.type === 'done') {
      audio.jingle(true);
      world.banner(`Mission complete! +$${event.reward}`, 3);
      world.completedMissions = world.missions.index + 1;
      saveGame({
        money: world.player.money,
        missionsDone: world.completedMissions,
        bestScore: Math.max(save?.bestScore ?? 0, world.player.money),
      });
      if (world.missions.index + 1 >= MISSIONS.length) {
        victory();
      } else {
        world.startMission(world.missions.index + 1);
        state = 'briefing';
      }
    }
  }

  if (world.busted) {
    gameOver('busted');
  } else if (world.player.dead) {
    gameOver('wasted');
  }

  // Camera follows the player, clamped to the world.
  const p = world.player;
  camera.x = clamp(p.x, CFG.VIEW_W / 2, CFG.WORLD - CFG.VIEW_W / 2);
  camera.y = clamp(p.y, CFG.VIEW_H / 2, CFG.WORLD - CFG.VIEW_H / 2);
}

function render() {
  ctx.save();
  if (state === 'title') {
    drawTitle(ctx, save);
  } else if (state === 'briefing') {
    drawWorld(ctx, world, camera);
    drawHUD(ctx, world);
    drawMinimap(ctx, world);
    drawBriefing(ctx, world.missions.mission, CFG.MISSION_REWARDS[world.missions.index]);
  } else if (state === 'pause') {
    drawWorld(ctx, world, camera);
    drawPause(ctx);
  } else if (state === 'over') {
    drawWorld(ctx, world, camera);
    drawGameOver(ctx, world, overReason);
  } else if (state === 'victory') {
    drawWorld(ctx, world, camera);
    drawVictory(ctx, world);
  } else {
    // Play: the camera transform turns world coords into screen coords.
    ctx.translate(CFG.VIEW_W / 2 - camera.x, CFG.VIEW_H / 2 - camera.y);
    drawWorld(ctx, world, camera);
    ctx.restore();
    ctx.save();
    drawHUD(ctx, world);
    drawMinimap(ctx, world);
  }
  ctx.restore();
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render();
  input.endFrame();
  if (!shotName) requestAnimationFrame(frame);
}

// First user gesture unlocks audio (browsers require it).
window.addEventListener('pointerdown', () => audio.ensure(), { once: true });
window.addEventListener('keydown', () => audio.ensure(), { once: true });

if (shotName) {
  // One deterministic frame for the screenshot, then stay still.
  update(0.016);
  render();
  document.title = `SOLMARA shot: ${shotName}`;
} else {
  requestAnimationFrame(frame);
}

// Exposed for the automated play-test (CDP): lets the test drive the game.
window.__solmara = {
  get state() { return state; },
  get world() { return world; },
  startGame,
};
