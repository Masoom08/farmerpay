/**
 * Trend indicator utilities for price movement display.
 */

/**
 * Get trend arrow, color, and label based on price change.
 * @param {number} currentPrice
 * @param {number} forecastPrice
 * @returns {{ arrow: string, color: string, label: string }}
 */
export function getTrendArrow(currentPrice, forecastPrice) {
  if (!forecastPrice || !currentPrice) return { arrow: '—', color: '#666', label: '' };
  const pctChange = ((forecastPrice - currentPrice) / currentPrice) * 100;
  if (pctChange > 10) return { arrow: '↑', color: '#2e7d32', label: `+${pctChange.toFixed(0)}%` };
  if (pctChange > 3) return { arrow: '↗', color: '#558b2f', label: `+${pctChange.toFixed(0)}%` };
  if (pctChange > -3) return { arrow: '→', color: '#f57f17', label: `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(0)}%` };
  if (pctChange > -10) return { arrow: '↘', color: '#e65100', label: `${pctChange.toFixed(0)}%` };
  return { arrow: '↓', color: '#c62828', label: `${pctChange.toFixed(0)}%` };
}

/**
 * Get trend color based on direction.
 * @param {'rising'|'stable'|'falling'} trend
 * @returns {string}
 */
export function getTrendColor(trend) {
  switch (trend) {
    case 'rising': return '#2e7d32';
    case 'stable': return '#f57f17';
    case 'falling': return '#c62828';
    default: return '#666';
  }
}
