import { SAVE_KEY } from './config.js';

export function storageAvailable() {
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    return true;
  } catch {
    return false;
  }
}

export function saveSnapshot(state) {
  const data = {
    gold: state.game.gold,
    level: state.game.level,
    kills: state.game.kills,
    souls: state.game.souls,
    lastSaveTime: Date.now(),
    heroesLevels: state.heroes.map(h => h.count),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadSnapshot() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function clearSnapshot() {
  localStorage.removeItem(SAVE_KEY);
}
