import { createInitialState } from './state.js';
import { clearSnapshot, loadSnapshot, saveSnapshot, storageAvailable } from './storage.js';
import { recalcStats, spawnMonster, pendingSouls, monsterKillReward, onMonsterKilled } from './gameEngine.js';
import { renderHUD, renderHeroes, setSaveStatus, showToast, spawnFloatingText, qs, showOfflineModal, hideOfflineModal } from './ui.js';
import { formatNumber, getHeroCost } from './utils.js';
import { Renderer3D } from './renderer3d.js';

const state = createInitialState();
let canSave = storageAvailable();
const renderer = new Renderer3D(qs('canvas-container'));

function applySnapshot(snapshot) {
  state.game.gold = snapshot.gold || 0;
  state.game.level = snapshot.level || 1;
  state.game.kills = snapshot.kills || 0;
  state.game.souls = snapshot.souls || 0;
  state.game.lastSaveTime = snapshot.lastSaveTime || Date.now();
  if (Array.isArray(snapshot.heroesLevels)) {
    state.heroes.forEach((h, i) => { h.count = snapshot.heroesLevels[i] || 0; });
  }
}

function save() {
  if (!canSave) return setSaveStatus('記憶體模式');
  try {
    saveSnapshot(state);
    setSaveStatus('💾 已存檔');
    setTimeout(() => setSaveStatus(''), 2000);
  } catch {
    setSaveStatus('存檔失敗!');
  }
}

function calcOfflineProgress() {
  const now = Date.now();
  const sec = Math.floor((now - state.game.lastSaveTime) / 1000);
  if (sec > 10 && state.game.dps > 0) {
    const hpMultiplier = Math.pow(1.57, state.game.level - 1);
    const hp = Math.ceil(10 * hpMultiplier);
    const perKill = monsterKillReward(hp);
    const timeToKill = hp / state.game.dps + 0.5;
    const kills = Math.floor(sec / timeToKill);
    if (kills > 0) {
      const gold = kills * perKill;
      state.game.gold += gold;
      showOfflineModal({ seconds: sec, kills, gold });
    }
  }
  state.game.lastSaveTime = now;
}

function refreshUI() {
  renderHUD(state, pendingSouls(state.game.level));
  renderHeroes(state, buyHero);
}

function buyHero(index) {
  const hero = state.heroes[index];
  const cost = getHeroCost(hero, hero.count);
  if (state.game.gold < cost) return;
  state.game.gold -= cost;
  hero.count++;
  recalcStats(state);
  refreshUI();
  save();
}

function dealDamage(amount, isClick = false, x = null, y = null) {
  if (state.monster.isDead) return;
  state.monster.hp -= amount;
  if (isClick) {
    renderer.hit();
    const tx = x ?? document.body.clientWidth / 2;
    const ty = y ?? document.body.clientHeight / 3;
    spawnFloatingText(tx, ty, `-${formatNumber(amount)}`, 'damage');
  }
  if (state.monster.hp <= 0) killMonster(x, y);
  else refreshUI();
}

function killMonster(x, y) {
  if (state.monster.isDead) return;
  state.monster.isDead = true;
  state.monster.hp = 0;

  const dropGold = monsterKillReward(state.monster.maxHp);
  state.game.gold += dropGold;
  renderer.explode(false);

  const tx = x ?? document.body.clientWidth / 2;
  const ty = y ?? document.body.clientHeight / 3;
  spawnFloatingText(tx, ty, `+${formatNumber(dropGold)}`, 'coin');

  onMonsterKilled(state);
  refreshUI();
  setTimeout(() => {
    spawnMonster(state);
    renderer.createMonster(state.game.level);
    refreshUI();
  }, 500);
}

function prestige() {
  const gain = pendingSouls(state.game.level);
  if (gain <= 0) return showToast('到達第 5 關後才能轉生！');

  state.game.souls += gain;
  state.game.gold = 0;
  state.game.level = 1;
  state.game.kills = 0;
  state.heroes.forEach(h => (h.count = 0));

  renderer.flash();
  renderer.explode(true);
  recalcStats(state);
  spawnMonster(state);
  renderer.createMonster(state.game.level);
  refreshUI();
  save();
  showToast(`✨ 轉生成功！獲得 ${gain} 個英雄魂！`);
}

function reset() {
  if (!confirm('確定要重置所有遊戲進度嗎？（將清除金幣、關卡與英雄魂）')) return;
  if (canSave) clearSnapshot();
  location.reload();
}

function init() {
  const snapshot = canSave ? loadSnapshot() : null;
  if (snapshot) applySnapshot(snapshot);

  recalcStats(state);
  calcOfflineProgress();

  renderer.init();
  spawnMonster(state);
  renderer.createMonster(state.game.level);

  refreshUI();
  if (canSave) {
    setSaveStatus('✅ 讀檔成功');
    setTimeout(() => setSaveStatus(''), 2000);
  }

  qs('click-zone').addEventListener('pointerdown', (e) => dealDamage(state.game.clickDamage, true, e.clientX, e.clientY));
  qs('btn-prestige').addEventListener('click', prestige);
  qs('btn-reset').addEventListener('click', reset);
  qs('btn-offline-claim').addEventListener('click', () => { hideOfflineModal(); refreshUI(); save(); });

  setInterval(() => {
    if (state.game.dps > 0 && !state.monster.isDead) dealDamage(state.game.dps / 10);
  }, 100);

  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
