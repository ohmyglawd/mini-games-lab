import { BOSS_CHALLENGE_SECONDS, BOSS_STAGE_INTERVAL, KILLS_REQUIRED, SOUL_BONUS_PER_SOUL } from './config.js';

export function artifactLevel(state, artifactId) {
  return state.game.artifacts?.[artifactId] || 0;
}

export function artifactMultiplier(state, artifactId, perLevelBonus) {
  return 1 + artifactLevel(state, artifactId) * perLevelBonus;
}

export function recalcStats(state) {
  let baseClick = 1;
  let baseDps = 0;
  state.heroes.forEach(h => {
    if (h.type === 'click') baseClick += h.value * h.count;
    if (h.type === 'dps') baseDps += h.value * h.count;
  });
  const soulMult = 1 + state.game.souls * SOUL_BONUS_PER_SOUL;
  const clickArtifactMult = artifactMultiplier(state, 'artifact_click', 0.15);
  const dpsArtifactMult = artifactMultiplier(state, 'artifact_dps', 0.12);
  state.game.clickDamage = Math.floor(baseClick * soulMult * clickArtifactMult);
  state.game.dps = Math.floor(baseDps * soulMult * dpsArtifactMult);
}

export function nextBossStage(highestClearedBossStage) {
  return highestClearedBossStage + BOSS_STAGE_INTERVAL;
}

export function isWaitingBoss(state) {
  return !state.game.bossChallenge.active && state.game.level === nextBossStage(state.game.highestClearedBossStage) - 1;
}

export function makeBossRequiredDamage(stage) {
  const hpMultiplier = Math.pow(1.57, stage - 1);
  const stageHp = Math.ceil(10 * hpMultiplier);
  return Math.ceil(stageHp * KILLS_REQUIRED * 0.9);
}

export function spawnMonster(state) {
  state.monster.isDead = false;

  if (state.game.bossChallenge.active) {
    state.monster.maxHp = state.game.bossChallenge.requiredDamage;
    state.monster.hp = Math.max(0, state.monster.maxHp - state.game.bossChallenge.damageDone);
    return;
  }

  const hpMultiplier = Math.pow(1.57, state.game.level - 1);
  state.monster.maxHp = Math.ceil(10 * hpMultiplier);
  state.monster.hp = state.monster.maxHp;
}

export function startBossChallenge(state) {
  const stage = nextBossStage(state.game.highestClearedBossStage);
  state.game.bossChallenge.active = true;
  state.game.bossChallenge.stage = stage;
  state.game.bossChallenge.requiredDamage = makeBossRequiredDamage(stage);
  state.game.bossChallenge.damageDone = 0;
  state.game.bossChallenge.timeLeftMs = BOSS_CHALLENGE_SECONDS * 1000;
}

export function bossResultFromTimer(state, elapsedMs) {
  if (!state.game.bossChallenge.active) return null;

  state.game.bossChallenge.timeLeftMs = Math.max(0, state.game.bossChallenge.timeLeftMs - elapsedMs);

  if (state.game.bossChallenge.damageDone >= state.game.bossChallenge.requiredDamage) {
    const clearedStage = state.game.bossChallenge.stage;
    state.game.highestClearedBossStage = Math.max(state.game.highestClearedBossStage, clearedStage);
    state.game.level = clearedStage;
    state.game.kills = 0;
    state.game.bossChallenge.active = false;
    return { success: true, clearedStage };
  }

  if (state.game.bossChallenge.timeLeftMs <= 0) {
    const failedStage = state.game.bossChallenge.stage;
    state.game.level = Math.max(1, failedStage - 1);
    state.game.kills = KILLS_REQUIRED;
    state.game.bossChallenge.active = false;
    return { success: false, failedStage };
  }

  return null;
}

export function pendingSouls(level) {
  return Math.floor(level / 5);
}

export function monsterKillReward(maxHp, state = null) {
  const base = Math.max(1, Math.ceil(maxHp / 15));
  if (!state) return base;
  const goldMult = artifactMultiplier(state, 'artifact_gold', 0.1);
  return Math.max(1, Math.floor(base * goldMult));
}

export function onMonsterKilled(state) {
  if (state.game.bossChallenge.active) return;

  state.game.kills++;
  if (state.game.kills >= KILLS_REQUIRED) {
    const maybeNextLevel = state.game.level + 1;
    const lockedBoss = nextBossStage(state.game.highestClearedBossStage);

    if (maybeNextLevel === lockedBoss) {
      state.game.kills = KILLS_REQUIRED;
      return;
    }

    state.game.kills = 0;
    state.game.level = maybeNextLevel;
  }
}

export function maxReachableStage(state) {
  return nextBossStage(state.game.highestClearedBossStage) - 1;
}
