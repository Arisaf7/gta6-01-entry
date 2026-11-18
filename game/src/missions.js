// SOLMARA — Streets of the Sun. missions.js
// Five story missions from Mama Rosa. Each mission is a list of steps:
//   goto    — reach a place (bank, hotel, park, docks, beach, garage)
//   wait    — stay in place while something happens (a meet, a robbery)
//   escape  — survive with a wanted level for N seconds
//   pickup  — instant step that plays a sound and shows a line of dialogue
// The runner reports step changes, completion and failure through events so
// the main loop can show banners, pay out and advance the story.

import { CFG, dist } from './config.js';

export const MISSIONS = [
  {
    id: 1,
    title: "Rosa's First Errand",
    brief: 'Mama Rosa needs a package from the bank. Drive to Solmara National Bank, grab it, and bring it home to the garage.',
    steps: [
      { kind: 'goto', x: CFG.BANK.x, y: CFG.BANK.y, r: CFG.BANK.r, label: 'Drive to the bank' },
      { kind: 'pickup', label: 'Pick up the package' },
      { kind: 'goto', x: CFG.GARAGE.x, y: CFG.GARAGE.y, r: CFG.GARAGE.r, label: 'Bring it back to Rosa\u2019s Garage' },
    ],
  },
  {
    id: 2,
    title: 'The Hotel Guest',
    brief: 'A guest is waiting at Hotel Miramar. Pick them up and drop them at the docks — no questions, no stops.',
    steps: [
      { kind: 'goto', x: CFG.HOTEL.x, y: CFG.HOTEL.y, r: CFG.HOTEL.r, label: 'Pick up the guest at Hotel Miramar' },
      { kind: 'pickup', label: 'Guest is in — drive to the docks' },
      { kind: 'goto', x: CFG.DOCKS.x, y: CFG.DOCKS.y, r: CFG.DOCKS.r, label: 'Drop the guest at the docks' },
    ],
  },
  {
    id: 3,
    title: 'Beach Drop',
    brief: 'A parcel for the beach crew. Rosa says the lifeguards look the other way — just don\u2019t bring the cops with you.',
    steps: [
      { kind: 'goto', x: CFG.GARAGE.x, y: CFG.GARAGE.y, r: CFG.GARAGE.r, label: 'Collect the parcel at the garage' },
      { kind: 'pickup', label: 'Parcel collected — head south' },
      { kind: 'goto', x: CFG.BEACH.x, y: CFG.BEACH.y, r: CFG.BEACH.r, label: 'Deliver the parcel at Solmara Beach' },
    ],
  },
  {
    id: 4,
    title: 'Park Meeting',
    brief: 'Meet Rosa\u2019s contact under the palms in Palma Park. Someone tipped off the police — be ready to run.',
    steps: [
      { kind: 'goto', x: CFG.PARK.x, y: CFG.PARK.y, r: CFG.PARK.r, label: 'Meet the contact in Palma Park' },
      { kind: 'wait', seconds: 5, label: 'Wait for the contact...' },
      { kind: 'escape', seconds: 15, stars: 2, label: 'The cops are here! Lose them!' },
      { kind: 'goto', x: CFG.GARAGE.x, y: CFG.GARAGE.y, r: CFG.GARAGE.r, label: 'Get back to the garage' },
    ],
  },
  {
    id: 5,
    title: 'The Big Score',
    brief: 'This is it, Dario. Hit the bank, hold the doors while the crew works, then lose a three-star chase and bring the money to the docks.',
    steps: [
      { kind: 'goto', x: CFG.BANK.x, y: CFG.BANK.y, r: CFG.BANK.r, label: 'Get to the bank' },
      { kind: 'wait', seconds: 8, stars: 3, label: 'Hold the doors — the crew is inside!' },
      { kind: 'escape', seconds: 20, stars: 3, label: 'Three stars! Lose the cops!' },
      { kind: 'goto', x: CFG.DOCKS.x, y: CFG.DOCKS.y, r: CFG.DOCKS.r, label: 'Deliver the money to the docks' },
      { kind: 'goto', x: CFG.GARAGE.x, y: CFG.GARAGE.y, r: CFG.GARAGE.r, label: 'Bring it home to Rosa' },
    ],
  },
];

export class MissionRunner {
  constructor() {
    this.index = 0; // which mission (0-based)
    this.step = 0;
    this.timer = 0;
    this.active = false;
    this.done = false;
  }

  get mission() {
    return MISSIONS[this.index];
  }

  get stepDef() {
    if (!this.active || !this.mission) return null;
    return this.mission.steps[this.step] ?? null;
  }

  get objective() {
    const s = this.stepDef;
    return s ? s.label : 'Talk to Mama Rosa';
  }

  start(index) {
    this.index = index;
    this.step = 0;
    this.timer = 0;
    this.active = true;
    this.done = false;
    return this.mission;
  }

  // Advances the mission. Returns an event object or null.
  // world gives access to player position, police and audio hooks.
  update(dt, world) {
    if (!this.active) return null;
    const s = this.stepDef;
    if (!s) {
      this.active = false;
      this.done = true;
      return { type: 'done', mission: this.mission };
    }
    const p = world.player;
    if (s.kind === 'goto') {
      if (dist(p.x, p.y, s.x, s.y) < s.r) {
        return this._advance(world, 'reached');
      }
    } else if (s.kind === 'pickup') {
      return this._advance(world, 'pickup');
    } else if (s.kind === 'wait') {
      if (s.stars && world.police.stars < s.stars) world.police.setStars(s.stars);
      this.timer += dt;
      if (this.timer >= s.seconds) {
        this.timer = 0;
        return this._advance(world, 'waited');
      }
    } else if (s.kind === 'escape') {
      if (world.police.stars < s.stars) world.police.setStars(s.stars);
      this.timer += dt;
      if (this.timer >= s.seconds) {
        this.timer = 0;
        world.police.setStars(0);
        return this._advance(world, 'escaped');
      }
    }
    return null;
  }

  _advance(world, how) {
    this.step++;
    this.timer = 0;
    if (this.step >= this.mission.steps.length) {
      this.active = false;
      this.done = true;
      const reward = CFG.MISSION_REWARDS[this.index] ?? 0;
      world.player.money += reward;
      return { type: 'done', mission: this.mission, reward, how };
    }
    return { type: 'step', mission: this.mission, step: this.stepDef, how };
  }

  reset() {
    this.index = 0;
    this.step = 0;
    this.timer = 0;
    this.active = false;
    this.done = false;
  }
}
