// SOLMARA — Streets of the Sun. save.js
// A tiny localStorage save: money, missions completed and best score. The game
// never needs the network, so the save lives entirely in the browser.

const KEY = 'solmara-save-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      money: typeof data.money === 'number' ? data.money : 0,
      missionsDone: typeof data.missionsDone === 'number' ? data.missionsDone : 0,
      bestScore: typeof data.bestScore === 'number' ? data.bestScore : 0,
    };
  } catch {
    return null;
  }
}

export function saveGame(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({
      money: state.money,
      missionsDone: state.missionsDone,
      bestScore: state.bestScore,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Storage may be unavailable; the game still plays.
  }
}
