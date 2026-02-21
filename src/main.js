import { createInitialState } from './state.js';
import { clearSnapshot, loadSnapshot, saveSnapshot, storageAvailable } from './storage.js';
import {
  bossResultFromTimer,
  isWaitingBoss,
  maxReachableStage,
  monsterKillReward,
  onMonsterKilled,
  pendingSouls,
  recalcStats,
  spawnMonster,
  startBossChallenge,
} from './gameEngine.js';
import { renderHUD, renderHeroes, updateHeroRows, setSaveStatus, showToast, spawnFloatingText, qs, showOfflineModal, hideOfflineModal, renderActiveSkills, renderAutoAttackers, spawnAutoAttackSwing, spawnBattleEffect } from './ui.js';
import { formatNumber, getHeroCost } from './utils.js';
import { Renderer3D } from './renderer3d.js';
import { ACTIVE_SKILLS, KILLS_REQUIRED } from './config.js';

const state = createInitialState();
let canSave = storageAvailable();
const renderer = new Renderer3D(qs('canvas-container'));
const skillCooldowns = {};

function applySnapshot(snapshot) {
  state.game.gold = snapshot.gold || 0;
  state.game.level = snapshot.level || 1;
  state.game.kills = snapshot.kills || 0;
  state.game.souls = snapshot.souls || 0;
  state.game.highestClearedBossStage = snapshot.highestClearedBossStage || 0;
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
    let remaining = sec;
    let simLevel = state.game.level;
    let simKills = state.game.kills;

    const stageCap = maxReachableStage(state);

    let totalKills = 0;
    let totalGold = 0;

    while (remaining > 0) {
      if (simLevel >= stageCap && simKills >= KILLS_REQUIRED) break;

      const hpMultiplier = Math.pow(1.57, simLevel - 1);
      const hp = Math.ceil(10 * hpMultiplier);
      const perKill = monsterKillReward(hp);
      const timeToKill = hp / state.game.dps + 0.5;

      if (remaining < timeToKill) break;

      remaining -= timeToKill;
      totalKills += 1;
      totalGold += perKill;

      simKills += 1;
      if (simKills >= KILLS_REQUIRED) {
        if (simLevel < stageCap) {
          simKills = 0;
          simLevel += 1;
        } else {
          simKills = KILLS_REQUIRED;
        }
      }

      if (totalKills >= 200000) break;
    }

    if (totalKills > 0) {
      const levelsGained = simLevel - state.game.level;
      state.game.gold += totalGold;
      state.game.level = simLevel;
      state.game.kills = simKills;

      showOfflineModal({
        seconds: sec,
        kills: totalKills,
        gold: totalGold,
        levelsGained,
        currentLevel: state.game.level,
        currentKills: state.game.kills,
        killsRequired: KILLS_REQUIRED,
      });
    }
  }

  state.game.lastSaveTime = now;
}

function refreshUI() {
  renderHUD(state, pendingSouls(state.game.level));
  renderActiveSkills(state, skillCooldowns, castActiveSkill);
  renderAutoAttackers(state);
  updateHeroRows(state);
}

function initialRenderUI() {
  renderHUD(state, pendingSouls(state.game.level));
  renderActiveSkills(state, skillCooldowns, castActiveSkill);
  renderHeroes(state, buyHero);
}

function castActiveSkill(skillId) {
  const skill = ACTIVE_SKILLS.find(s => s.id === skillId);
  if (!skill) return;
  if (state.game.level < skill.unlockLevel) return;
  if ((skillCooldowns[skill.id] || 0) > 0) return;

  const damage = Math.max(1, Math.floor((state.game.clickDamage + state.game.dps * 0.5) * skill.damageMult));
  spawnBattleEffect(skill.icon, `${skill.name} -${formatNumber(damage)}`);
  dealDamage(damage, false);
  skillCooldowns[skill.id] = skill.cooldownMs;
  refreshUI();
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

  if (state.game.bossChallenge.active) {
    state.game.bossChallenge.damageDone = Math.min(
      state.game.bossChallenge.requiredDamage,
      state.game.bossChallenge.damageDone + amount,
    );
  }

  if (isClick) {
    renderer.hit();
    const tx = x ?? document.body.clientWidth / 2;
    const ty = y ?? document.body.clientHeight / 3;
    spawnFloatingText(tx, ty, `-${formatNumber(amount)}`, 'damage');
  }

  if (state.monster.hp <= 0) killMonster(x, y);
  else refreshUI();
}

function finishBossIfNeeded() {
  if (!state.game.bossChallenge.active) return false;

  const result = bossResultFromTimer(state, 0);
  if (!result) return false;

  spawnMonster(state);
  renderer.createMonster(state.game.level);
  refreshUI();

  if (result.success) {
    showToast(`🏆 Boss Lv.${result.clearedStage} 通關！已解鎖下一區域`);
  } else {
    showToast(`💥 Boss 挑戰失敗，退回關卡 ${result.failedStage - 1}`);
  }

  save();
  return true;
}

function killMonster(x, y) {
  if (state.monster.isDead) return;
  state.monster.isDead = true;
  state.monster.hp = 0;

  if (state.game.bossChallenge.active) {
    finishBossIfNeeded();
    return;
  }

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

function triggerAutoAttackVisuals() {
  const activeHeroes = state.heroes.filter(h => h.type === 'dps' && h.count > 0);
  if (activeHeroes.length === 0 || state.monster.isDead) return;

  activeHeroes.slice(0, 4).forEach((hero) => {
    const icon = hero.name.split(' ')[0] || '⚔️';
    const visualDamage = Math.max(1, Math.floor(hero.value * Math.max(1, hero.count) * 0.2));
    spawnAutoAttackSwing(icon, `-${formatNumber(visualDamage)}`);
  });
}

function startBossFight() {
  if (!isWaitingBoss(state)) return;
  startBossChallenge(state);
  spawnMonster(state);
  renderer.flash();
  renderer.createMonster(state.game.bossChallenge.stage);
  refreshUI();
  showToast(`⚔️ Boss Lv.${state.game.bossChallenge.stage} 挑戰開始！`);
}

function prestige() {
  const gain = pendingSouls(state.game.level);
  if (gain <= 0) return showToast('到達第 5 關後才能轉生！');

  state.game.souls += gain;
  state.game.gold = 0;
  state.game.level = 1;
  state.game.kills = 0;
  state.game.highestClearedBossStage = 0;
  state.game.bossChallenge.active = false;
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

  initialRenderUI();
  if (canSave) {
    setSaveStatus('✅ 讀檔成功');
    setTimeout(() => setSaveStatus(''), 2000);
  }

  qs('click-zone').addEventListener('pointerdown', (e) => dealDamage(state.game.clickDamage, true, e.clientX, e.clientY));
  qs('btn-prestige').addEventListener('click', prestige);
  qs('btn-reset').addEventListener('click', reset);
  qs('btn-boss-challenge').addEventListener('click', startBossFight);
  qs('btn-offline-claim').addEventListener('click', () => { hideOfflineModal(); refreshUI(); save(); });

  setInterval(() => {
    if (state.game.dps > 0 && !state.monster.isDead) dealDamage(state.game.dps / 10);
  }, 100);

  setInterval(() => {
    ACTIVE_SKILLS.forEach((skill) => {
      if (!skillCooldowns[skill.id]) return;
      skillCooldowns[skill.id] = Math.max(0, skillCooldowns[skill.id] - 100);
    });

    const result = bossResultFromTimer(state, 100);
    if (result) {
      spawnMonster(state);
      renderer.createMonster(state.game.level);
      refreshUI();
      if (result.success) showToast(`🏆 Boss Lv.${result.clearedStage} 通關！`);
      else showToast(`💥 Boss 挑戰失敗，退回關卡 ${result.failedStage - 1}`);
      save();
    } else if (state.game.bossChallenge.active) {
      refreshUI();
    }
  }, 100);

  setInterval(() => {
    triggerAutoAttackVisuals();
  }, 900);

  setInterval(save, 10000);
  window.addEventListener('beforeunload', save);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
