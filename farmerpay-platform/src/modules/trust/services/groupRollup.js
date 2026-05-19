/**
 * Group Rollup — TRUST v2
 * Pure function: derives Table-2 groups (DEMO, OPS, ASSET, EXT) from
 * section_scores JSON stored on trust_score_history.
 *
 * No DB access. Fully unit-testable.
 */

const { GROUP_DEFINITIONS, PILLAR_CODE_BY_SECTION_CODE } = require('../constants');

/**
 * Rolls up pillar-level scores into groups.
 *
 * @param {Object} sectionScoresJson - The section_scores JSON from trust_score_history.
 *   Keys are either pillar codes (P1..P6) or section codes (PERSONAL_PROFILE, etc).
 *   Each value must have at least { score, weight, contribution }.
 * @param {Object} [options]
 * @param {Object} [options.benchmarks] - Optional { groupCode: benchmarkScore } for delta.
 * @returns {Array<{ groupCode, groupLabel, score, pillars, deltaVsBenchmark }>}
 */
const rollupGroups = (sectionScoresJson, options = {}) => {
  if (!sectionScoresJson || typeof sectionScoresJson !== 'object') return [];

  const benchmarks = options.benchmarks || {};

  // Normalise keys to pillar codes (P1..P6)
  const byPillar = {};
  for (const [key, val] of Object.entries(sectionScoresJson)) {
    const pillarCode = PILLAR_CODE_BY_SECTION_CODE[key] || key;
    if (/^P[1-6]$/.test(pillarCode)) {
      byPillar[pillarCode] = val;
    }
  }

  return GROUP_DEFINITIONS.map((group) => {
    const pillarEntries = group.pillars
      .map((p) => byPillar[p])
      .filter(Boolean);

    if (pillarEntries.length === 0) {
      return {
        groupCode: group.groupCode,
        groupLabel: group.groupLabel,
        score: 0,
        pillars: group.pillars,
        deltaVsBenchmark: null,
      };
    }

    // Weighted average across pillars in this group
    const totalWeight = pillarEntries.reduce((sum, e) => sum + (e.weight || 0), 0);
    const weightedScore = totalWeight > 0
      ? Math.round(pillarEntries.reduce((sum, e) => sum + (e.score || 0) * (e.weight || 0), 0) / totalWeight)
      : Math.round(pillarEntries.reduce((sum, e) => sum + (e.score || 0), 0) / pillarEntries.length);

    const benchmark = benchmarks[group.groupCode];
    const deltaVsBenchmark = benchmark != null ? weightedScore - benchmark : null;

    return {
      groupCode: group.groupCode,
      groupLabel: group.groupLabel,
      score: weightedScore,
      pillars: group.pillars,
      deltaVsBenchmark,
    };
  });
};

module.exports = { rollupGroups };
