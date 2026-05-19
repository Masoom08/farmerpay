/**
 * Price formatting utilities for Indian Rupee display.
 */

/**
 * Format amount as Indian Rupees with locale formatting.
 * @param {number} amount
 * @returns {string}
 */
export function formatRupees(amount) {
  if (amount == null || isNaN(amount)) return '—';
  const sign = amount < 0 ? '- ' : '';
  return sign + '₹' + Math.abs(Math.round(amount)).toLocaleString('en-IN');
}

/**
 * Format amount in lakhs/crores for large numbers.
 * @param {number} amount
 * @returns {string}
 */
export function formatRupeesCompact(amount) {
  if (amount == null || isNaN(amount)) return '—';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}
