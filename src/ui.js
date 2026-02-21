import { ACTIVE_SKILLS, KILLS_REQUIRED, MONSTER_NAMES, SOUL_BONUS_PER_SOUL } from './config.js';
import { formatNumber, getHeroCost, timeTextFromSeconds } from './utils.js';
import { isWaitingBoss, makeBossRequiredDamage, nextBossStage } from './gameEngine.js';

export function qs(id) { return document.getElementById(id); }

export function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-msg text-white font-bold text-lg text-center';
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

export function spawnFloatingText(x, y, text, type) {
  const el = document.createElement('div');
  el.className = type === 'damage' ? 'damage-text' : 'coin-text';
  el.innerText = text;
  const offsetX = (Math.random() - 0.5) * 40;
  const offsetY = (Math.random() - 0.5) * 20;
  el.style.left = `${x + offsetX}px`;
  el.style.top = `${y + offsetY}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

export function monsterNameByLevel(level, state) {
  if (state?.game?.bossChallenge?.active) return `👑 Boss Lv.${state.game.bossChallenge.stage}`;
  const typeIndex = (level - 1) % MONSTER_NAMES.length;
  let prefix = '';
  if (level > 50) prefix = '終極';
  else if (level > 30) prefix = '殘暴';
  else if (level > 10) prefix = '強化';
  return `${prefix}${MONSTER_NAMES[typeIndex]}`;
}

function renderMap(state) {
  const mapEl = qs('ui-map');
  if (!mapEl) return;

  const currentStage = state.game.level;
  const lockBoss = nextBossStage(state.game.highestClearedBossStage);

  const ranges = [];
  const maxRange = Math.max(Math.ceil(lockBoss / 10) + 1, Math.ceil(currentStage / 10) + 1, 3);
  for (let i = 1; i <= maxRange; i++) {
    const start = (i - 1) * 10 + 1;
    const end = i * 10;
    const isCurrent = currentStage >= start && currentStage <= end;
    const isCleared = state.game.highestClearedBossStage >= end;
    const isLocked = end > lockBoss;
    const isBossPending = end === lockBoss && isWaitingBoss(state);

    let icon = '🧭';
    if (isCleared) icon = '✅';
    else if (isLocked) icon = '🔒';
    else if (state.game.bossChallenge.active && end === state.game.bossChallenge.stage) icon = '⚔️';
    else if (isBossPending) icon = '👑';

    ranges.push(`<div class="map-chip ${isCurrent ? 'map-chip-current' : ''}">${icon} ${start}-${end}</div>`);
  }

  mapEl.innerHTML = ranges.join('');
}

function renderBossPanel(state) {
  const panel = qs('boss-panel');
  const btn = qs('btn-boss-challenge');
  const text = qs('ui-boss-info');
  if (!panel || !btn || !text) return;

  const lockBoss = nextBossStage(state.game.highestClearedBossStage);
  const challenge = state.game.bossChallenge;

  if (challenge.active) {
    panel.classList.remove('hidden');
    btn.classList.add('hidden');
    const secLeft = Math.ceil(challenge.timeLeftMs / 1000);
    text.innerText = `⚔️ Boss Lv.${challenge.stage} 進行中｜傷害 ${formatNumber(challenge.damageDone)}/${formatNumber(challenge.requiredDamage)}｜剩餘 ${secLeft}s`;
    return;
  }

  if (isWaitingBoss(state)) {
    panel.classList.remove('hidden');
    btn.classList.remove('hidden');
    text.innerText = `👑 卡關 Boss Lv.${lockBoss}｜30 秒內造成 ${formatNumber(makeBossRequiredDamage(lockBoss))} 傷害`;
    return;
  }

  panel.classList.remove('hidden');
  btn.classList.add('hidden');
  text.innerText = `下一個 Boss：Lv.${lockBoss}`;
}

export function renderActiveSkills(state, skillCooldowns, onCastSkill) {
  const wrap = qs('active-skills');
  if (!wrap) return;

  const unlocked = ACTIVE_SKILLS.filter(s => state.game.level >= s.unlockLevel);
  if (unlocked.length === 0) {
    wrap.innerHTML = '<div class="text-[11px] text-gray-400">主動技將於關卡 3 解鎖</div>';
    return;
  }

  wrap.innerHTML = '';
  unlocked.forEach((skill) => {
    const cd = Math.max(0, skillCooldowns[skill.id] || 0);
    const ready = cd <= 0;
    const btn = document.createElement('button');
    btn.className = `active-skill-square ${ready ? 'active-skill-ready' : 'active-skill-cd'}`;
    btn.innerHTML = `
      <div class="skill-icon">${skill.icon}</div>
      <div class="skill-name">${skill.name}</div>
      <div class="skill-cd">${ready ? 'READY' : `${(cd / 1000).toFixed(1)}s`}</div>
    `;
    btn.disabled = !ready;
    btn.addEventListener('click', () => onCastSkill(skill.id));
    wrap.appendChild(btn);
  });
}

export function renderArtifacts(state, chestCost, onOpenChest) {
  const wrap = qs('artifact-summary');
  const btn = qs('btn-artifact-chest');
  const costEl = qs('ui-artifact-cost');
  if (!wrap || !btn || !costEl) return;

  costEl.innerText = formatNumber(chestCost);
  btn.classList.toggle('opacity-50', state.game.gold < chestCost);
  btn.onclick = onOpenChest;

  const list = Object.entries(state.game.artifacts || {})
    .filter(([, lv]) => lv > 0)
    .map(([id, lv]) => {
      const meta = ARTIFACT_POOL.find(a => a.id === id);
      return `${meta?.icon || '✨'}${meta?.name || id} Lv.${lv}`;
    });

  wrap.innerText = list.length > 0 ? list.join(' · ') : '尚無神器';
}

export function renderArtifactChoices(choices, onPick) {
  const modal = qs('artifact-modal');
  const list = qs('artifact-choices');
  if (!modal || !list) return;

  list.innerHTML = '';
  choices.forEach((artifact) => {
    const btn = document.createElement('button');
    btn.className = 'artifact-choice-btn';
    btn.innerHTML = `<div class="text-2xl">${artifact.icon}</div><div class="font-bold text-sm">${artifact.name}</div><div class="text-[11px] text-gray-300">${artifact.desc}</div>`;
    btn.addEventListener('click', () => onPick(artifact.id));
    list.appendChild(btn);
  });

  modal.classList.remove('hidden');
}

export function hideArtifactChoices() {
  const modal = qs('artifact-modal');
  if (modal) modal.classList.add('hidden');
}

export function spawnBattleEffect(icon, text = '') {
  const zone = qs('battle-effects');
  if (!zone) return;
  const el = document.createElement('div');
  el.className = 'battle-effect';
  el.innerHTML = `<div class="battle-effect-icon">${icon}</div>${text ? `<div class="battle-effect-text">${text}</div>` : ''}`;
  zone.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

export function renderAutoAttackers(state) {
  const zone = qs('auto-attackers');
  if (!zone) return;

  const dpsHeroes = state.heroes.filter(h => h.type === 'dps' && h.count > 0);
  zone.innerHTML = '';

  dpsHeroes.slice(0, 6).forEach((hero, idx) => {
    const icon = hero.name.split(' ')[0] || '⚔️';
    const el = document.createElement('div');
    el.className = 'auto-attacker';
    el.style.left = `${18 + idx * 13}%`;
    el.style.top = `${55 + (idx % 2) * 8}%`;
    el.style.animationDelay = `${idx * 0.08}s`;
    el.innerText = icon;
    zone.appendChild(el);
  });
}

export function spawnAutoAttackSwing(icon, text = '') {
  const zone = qs('battle-effects');
  if (!zone) return;
  const el = document.createElement('div');
  el.className = 'battle-effect auto-swing';
  el.style.setProperty('--swing-offset', `${(Math.random() * 2 - 1).toFixed(2)}`);
  el.innerHTML = `<div class="battle-effect-icon">${icon}</div>${text ? `<div class="battle-effect-text">${text}</div>` : ''}`;
  zone.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

export function renderHUD(state, pendingSouls) {
  qs('ui-gold').innerText = formatNumber(state.game.gold);
  qs('ui-level').innerText = state.game.level;
  qs('ui-click-damage').innerText = formatNumber(state.game.clickDamage);
  qs('ui-dps').innerText = formatNumber(state.game.dps);
  qs('ui-kills').innerText = state.game.bossChallenge.active ? 'BOSS 戰鬥中' : `${state.game.kills}/${KILLS_REQUIRED}`;
  qs('ui-souls').innerText = formatNumber(state.game.souls);
  qs('ui-souls-bonus').innerText = formatNumber(state.game.souls * SOUL_BONUS_PER_SOUL * 100);
  qs('ui-pending-souls').innerText = pendingSouls;
  qs('ui-monster-name').innerText = monsterNameByLevel(state.game.level, state);

  const hpPercent = Math.max(0, (state.monster.hp / state.monster.maxHp) * 100);
  qs('ui-hp-bar').style.width = `${hpPercent}%`;
  qs('ui-hp-text').innerText = `${formatNumber(state.monster.hp)} / ${formatNumber(state.monster.maxHp)}`;

  const prestigeBtn = qs('btn-prestige');
  if (pendingSouls > 0) {
    prestigeBtn.classList.remove('opacity-50', 'grayscale');
    prestigeBtn.classList.add('animate-pulse');
  } else {
    prestigeBtn.classList.add('opacity-50', 'grayscale');
    prestigeBtn.classList.remove('animate-pulse');
  }

  renderMap(state);
  renderBossPanel(state);
}

export function renderHeroes(state, onBuy) {
  const container = qs('heroes-container');
  if (container.childElementCount === state.heroes.length) {
    updateHeroRows(state);
    return;
  }

  container.innerHTML = '';
  state.heroes.forEach((hero, index) => {
    const cost = getHeroCost(hero, hero.count);
    const affordable = state.game.gold >= cost;
    const btn = document.createElement('div');
    btn.dataset.heroIndex = `${index}`;
    btn.className = `hero-btn flex items-center justify-between p-3 rounded-xl border-2 transition-colors cursor-pointer ${
      affordable ? 'bg-gray-700 border-blue-500 hover:bg-gray-600' : 'bg-gray-800 border-gray-600 opacity-60'
    }`;
    btn.innerHTML = `
      <div class="flex flex-col pointer-events-none">
        <span class="font-bold text-lg">${hero.name} <span id="hero-lv-${index}" class="text-xs text-gray-400 font-normal">Lv.${hero.count}</span></span>
        <span class="text-xs text-green-400">${hero.desc}</span>
      </div>
      <div class="flex flex-col items-end pointer-events-none">
        <span class="font-bold text-yellow-400">💰 <span id="hero-cost-${index}">${formatNumber(cost)}</span></span>
        <span class="text-xs bg-blue-600 px-2 py-0.5 rounded text-white mt-1">升級</span>
      </div>`;
    btn.addEventListener('pointerdown', (e) => {
      btn.dataset.downX = `${e.clientX}`;
      btn.dataset.downY = `${e.clientY}`;
      btn.dataset.moved = '0';
    });
    btn.addEventListener('pointermove', (e) => {
      const sx = Number(btn.dataset.downX || e.clientX);
      const sy = Number(btn.dataset.downY || e.clientY);
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 12) btn.dataset.moved = '1';
    });
    btn.addEventListener('pointerup', () => {
      if (btn.dataset.moved !== '1') onBuy(index);
      btn.dataset.moved = '0';
    });
    btn.addEventListener('pointercancel', () => {
      btn.dataset.moved = '1';
    });
    container.appendChild(btn);
  });
}

export function updateHeroRows(state) {
  state.heroes.forEach((hero, index) => {
    const cost = getHeroCost(hero, hero.count);
    const affordable = state.game.gold >= cost;

    const lvEl = qs(`hero-lv-${index}`);
    const costEl = qs(`hero-cost-${index}`);
    const rowEl = qs('heroes-container')?.querySelector(`[data-hero-index="${index}"]`);

    if (lvEl) lvEl.textContent = `Lv.${hero.count}`;
    if (costEl) costEl.textContent = formatNumber(cost);
    if (rowEl) {
      rowEl.className = `hero-btn flex items-center justify-between p-3 rounded-xl border-2 transition-colors cursor-pointer ${
        affordable ? 'bg-gray-700 border-blue-500 hover:bg-gray-600' : 'bg-gray-800 border-gray-600 opacity-60'
      }`;
    }
  });
}

export function showOfflineModal({ seconds, kills, gold, levelsGained, currentLevel, currentKills, killsRequired }) {
  qs('offline-time-text').innerText = timeTextFromSeconds(seconds);
  qs('offline-kills-text').innerText = `${formatNumber(kills)} 隻`;
  qs('offline-levels-text').innerText = `+${formatNumber(levelsGained)}`;
  qs('offline-progress-text').innerText = `關卡 ${formatNumber(currentLevel)} · 擊殺 ${formatNumber(currentKills)}/${killsRequired}`;
  qs('offline-gold-text').innerText = formatNumber(gold);
  qs('offline-modal').classList.remove('hidden');
}

export function hideOfflineModal() { qs('offline-modal').classList.add('hidden'); }
export function setSaveStatus(text) { qs('ui-save-status').innerText = text; }
export { KILLS_REQUIRED };
