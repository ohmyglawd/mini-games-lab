export const SAVE_KEY = 'clicker_heroes_save_v4';
export const KILLS_REQUIRED = 10;
export const SOUL_BONUS_PER_SOUL = 0.1;
export const BOSS_STAGE_INTERVAL = 10;
export const BOSS_CHALLENGE_SECONDS = 30;

export const MONSTER_COLORS = [0x48bb78, 0x4299e1, 0xed8936, 0x9f7aea, 0xf56565, 0x38b2ac];
export const MONSTER_NAMES = ['史萊姆', '水精靈', '哥布林', '暗影獸', '赤魔', '晶石怪'];

export const HEROES = [
  { id: 'h_click', name: '💪 鍛鍊臂力', desc: '+1 基礎點擊', type: 'click', value: 1, baseCost: 10, costMult: 1.5 },
  { id: 'h_1', name: '🗡️ 見習劍士', desc: '+5 基礎DPS', type: 'dps', value: 5, baseCost: 50, costMult: 1.15 },
  { id: 'h_2', name: '🏹 精靈射手', desc: '+25 基礎DPS', type: 'dps', value: 25, baseCost: 250, costMult: 1.15 },
  { id: 'h_3', name: '🔥 火焰法師', desc: '+100 基礎DPS', type: 'dps', value: 100, baseCost: 1000, costMult: 1.15 },
  { id: 'h_4', name: '🛡️ 聖騎士', desc: '+500 基礎DPS', type: 'dps', value: 500, baseCost: 4000, costMult: 1.15 },
  { id: 'h_5', name: '⚔️ 暗影刺客', desc: '+2500 基礎DPS', type: 'dps', value: 2500, baseCost: 20000, costMult: 1.15 },
  { id: 'h_6', name: '🐉 龍騎士', desc: '+10000 基礎DPS', type: 'dps', value: 10000, baseCost: 100000, costMult: 1.15 },
];