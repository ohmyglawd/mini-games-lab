import { HEROES } from './config.js';

export function createInitialState() {
  return {
    game: {
      gold: 0,
      level: 1,
      kills: 0,
      souls: 0,
      clickDamage: 1,
      dps: 0,
      highestClearedBossStage: 0,
      artifacts: {},
      artifactChestOpened: 0,
      artifactPityEpic: 0,
      artifactPityLegendary: 0,
      bossChallenge: {
        active: false,
        stage: 0,
        requiredDamage: 0,
        damageDone: 0,
        timeLeftMs: 0,
      },
      lastSaveTime: Date.now(),
    },
    monster: { maxHp: 10, hp: 10, isDead: false },
    heroes: HEROES.map(h => ({ ...h, count: 0 })),
  };
}
