import { KILLS_REQUIRED, MONSTER_NAMES, SOUL_BONUS_PER_SOUL } from './config.js';
import { formatNumber, getHeroCost, timeTextFromSeconds } from './utils.js';

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

export function monsterNameByLevel(level) {
  const typeIndex = (level - 1) % MONSTER_NAMES.length;
  let prefix = '';
  if (level > 50) prefix = '終極';
  else if (level > 30) prefix = '殘暴';
  else if (level > 10) prefix = '強化';
  return `${prefix}${MONSTER_NAMES[typeIndex]}`;
}

export function renderHUD(state, pendingSouls) {
  qs('ui-gold').innerText = formatNumber(state.game.gold);
  qs('ui-level').innerText = state.game.level;
  qs('ui-click-damage').innerText = formatNumber(state.game.clickDamage);
  qs('ui-dps').innerText = formatNumber(state.game.dps);
  qs('ui-kills').innerText = state.game.kills;
  qs('ui-souls').innerText = formatNumber(state.game.souls);
  qs('ui-souls-bonus').innerText = formatNumber(state.game.souls * SOUL_BONUS_PER_SOUL * 100);
  qs('ui-pending-souls').innerText = pendingSouls;
  qs('ui-monster-name').innerText = monsterNameByLevel(state.game.level);

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
    btn.addEventListener('click', () => onBuy(index));
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
