export function formatNumber(num) {
  if (num < 1000) return Math.floor(num).toString();
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
  const suffixNum = Math.floor((`${Math.floor(num)}`).length / 3);
  let shortValue = parseFloat((suffixNum !== 0 ? num / Math.pow(1000, suffixNum) : num).toPrecision(3));
  if (shortValue % 1 !== 0) shortValue = shortValue.toFixed(1);
  return `${shortValue}${suffixes[Math.min(suffixNum, suffixes.length - 1)]}`;
}

export function getHeroCost(heroDef, count) {
  return Math.floor(heroDef.baseCost * Math.pow(heroDef.costMult, count));
}

export function timeTextFromSeconds(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  let text = '';
  if (h > 0) text += `${h} 小時 `;
  if (m > 0) text += `${m} 分鐘 `;
  if (s > 0 || text === '') text += `${s} 秒`;
  return text.trim();
}