import { KILLS_REQUIRED, SOUL_BONUS_PER_SOUL } from './config.js';

export function recalcStats(state) {
  let baseClick = 1;
  let baseDps = 0;
  state.heroes.forEach(h => {
    if (h.type === 'click') baseClick += h.value * h.count;
    if (h.type === 'dps') baseDps += h.value * h.count;
  });
  const mult = 1 + state.game.souls * SOUL_BONUS_PER_SOUL;
  state.game.clickDamage = Math.floor(baseClick * mult);
  state.game.dps = Math.floor(baseDps * mult);
}

export function spawnMonster(state) {
  state.monster.isDead = false;
  const hpMultiplier = Math.pow(1.57, state.game.level - 1);
  state.monster.maxHp = Math.ceil(10 * hpMultiplier);
  state.monster.hp = state.monster.maxHp;
}

export function pendingSouls(level) {
  return Math.floor(level / 5);
}

export function monsterKillReward(maxHp) {
  return Math.max(1, Math.ceil(maxHp / 15));
}

export function onMonsterKilled(state) {
  state.game.kills++;
  if (state.game.kills >= KILLS_REQUIRED) {
    state.game.kills = 0;
    state.game.level++;
  }
}
