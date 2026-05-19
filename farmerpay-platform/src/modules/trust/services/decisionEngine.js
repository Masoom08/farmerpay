/**
 * Decision Engine — TRUST v2
 * Maps total_score_1000 → SANCTION / RECONSIDER / REJECT.
 *
 * Spec §1.3:
 *   score > 600  → SANCTION
 *   score >= 500 → RECONSIDER
 *   score < 500  → REJECT
 */

const { SANCTION_THRESHOLD, RECONSIDER_FLOOR } = require('../constants');

/**
 * Derives the lending decision from a 0–1000 TRUST score.
 * @param {number} score - total_score_1000 (integer 0..1000)
 * @returns {'SANCTION'|'RECONSIDER'|'REJECT'}
 */
const deriveDecision = (score) => {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    throw new Error('deriveDecision: score must be a number');
  }
  if (score > SANCTION_THRESHOLD) return 'SANCTION';
  if (score >= RECONSIDER_FLOOR) return 'RECONSIDER';
  return 'REJECT';
};

/**
 * Maps a 0–1000 score to the legacy v1 band (poor/fair/good/excellent).
 * Legacy consumers still depend on score_band; we recompute from the
 * same total so both systems stay in sync.
 * @param {number} score1000
 * @returns {'poor'|'fair'|'good'|'excellent'}
 */
const deriveLegacyBand = (score1000) => {
  if (score1000 >= 751) return 'excellent';
  if (score1000 >= 501) return 'good';
  if (score1000 >= 251) return 'fair';
  return 'poor';
};

module.exports = { deriveDecision, deriveLegacyBand };
