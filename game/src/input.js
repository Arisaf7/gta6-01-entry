// SOLMARA — Streets of the Sun. input.js
// Keyboard input with a hard split between UI keys and gameplay keys.
//
// Why the split matters: an earlier build let the UI layer swallow E/F, so the
// player could never enter a car or punch. Here the UI layer only ever looks at
// UI keys (Enter, P, Escape, M) and the gameplay layer only ever looks at
// gameplay keys (WASD/arrows, E, F, Space). Neither side consumes the other's
// keys, so a gameplay press always reaches the player.
//
// takeUiActions() returns edge-triggered UI actions (pressed this frame).
// takePlayerActions() returns the live gameplay state (held keys + edges).

export const UI_KEYS = ['Enter', 'KeyP', 'Escape', 'KeyM'];
export const PLAYER_KEYS = [
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyE', 'KeyF', 'Space',
];

export class Input {
  constructor() {
    this.down = new Set();
    this.justPressed = new Set();
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.justPressed.add(e.code);
      // Keep the page from scrolling on game keys.
      if (PLAYER_KEYS.includes(e.code) || e.code === 'Space') e.preventDefault();
    };
    this._onKeyUp = (e) => {
      this.down.delete(e.code);
    };
    this._onBlur = () => {
      this.down.clear();
    };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }

  isDown(code) {
    return this.down.has(code);
  }

  // UI layer only: which UI keys were pressed since the last frame.
  takeUiActions() {
    const actions = {
      confirm: this.justPressed.has('Enter'),
      pause: this.justPressed.has('KeyP') || this.justPressed.has('Escape'),
      mute: this.justPressed.has('KeyM'),
    };
    for (const k of UI_KEYS) this.justPressed.delete(k);
    return actions;
  }

  // Gameplay layer only: movement + interaction, read every frame.
  takePlayerActions() {
    const held = (code) => this.down.has(code);
    const actions = {
      up: held('KeyW') || held('ArrowUp'),
      down: held('KeyS') || held('ArrowDown'),
      left: held('KeyA') || held('ArrowLeft'),
      right: held('KeyD') || held('ArrowRight'),
      enterCar: this.justPressed.has('KeyE'),
      punch: this.justPressed.has('KeyF'),
      shoot: this.justPressed.has('Space'),
    };
    // Gameplay edges are consumed here, and only here.
    this.justPressed.delete('KeyE');
    this.justPressed.delete('KeyF');
    this.justPressed.delete('Space');
    return actions;
  }

  // Called at the end of each frame so stale edges never leak into the next one.
  endFrame() {
    this.justPressed.clear();
  }
}
