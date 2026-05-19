/**
 * Pillar Engine — TRUST v2
 * Computes P1..P6 scores from existing trust data.
 *
 * Each pillar scorer receives the evidence bundle and section metadata from
 * evidenceCollector and returns:
 *   { rawPoints, maxPossiblePoints, normalizedScore (0..100), status, featureBands[] }
 *
 * The existing scoringEngine.js (v1) calculates section scores from questionnaire
 * answers. This engine extends that with livelihood, expenses, liabilities, and
 * external data to produce richer pillar scores.
 */

const logger = require('../../../shared/utils/logger');
const { calculateSectionScore } = require('./scoringEngine');
const { PILLAR_CODE_BY_SECTION_CODE } = require('../constants');

/**
 * Base: applies the existing v1 questionnaire scorer for a section.
 * @param {Object} evidence - Evidence bundle for one pillar
 * @returns {{ rawPoints, maxPossiblePoints, normalizedScore }}
 */
const scoreQuestionnaire = (evidence) => {
  if (!evidence.section || !evidence.responses) {
    return { rawPoints: 0, maxPossiblePoints: 0, normalizedScore: 0 };
  }
  const result = calculateSectionScore(evidence.section, evidence.responses);
  return {
    rawPoints: result.rawPoints,
    maxPossiblePoints: result.maxPossible,
    normalizedScore: result.normalizedScore,
  };
};

/**
 * P1 — Personal Profile
 * Questionnaire-driven. Identity/address strength from responses.
 */
const scoreP1 = (evidence) => {
  const base = scoreQuestionnaire(evidence);
  return {
    ...base,
    status: base.maxPossiblePoints > 0 ? 'COMPLETE' : 'MISSING',
    featureBands: [],
  };
};

/**
 * P2 — Farm Details
 * Questionnaire + ROOTS land verification + livelihood activities.
 */
const scoreP2 = (evidence) => {
  const base = scoreQuestionnaire(evidence);
  let bonus = 0;
  const featureBands = [];

  // Bonus for ROOTS-verified land
  if (evidence.rootsLand && evidence.rootsLand.length > 0) {
    const landCount = evidence.rootsLand.length;
    bonus += Math.min(10, landCount * 3); // up to 10 bonus points
    featureBands.push({ feature: 'ROOTS_LAND', band: Math.min(5, landCount), source: 'ROOTS' });
  }

  // Bonus for farming activities
  if (evidence.activities && evidence.activities.length > 0) {
    const farmingTypes = evidence.activities.filter((a) =>
      ['CROP', 'DAIRY', 'FISHERY', 'HORTI'].includes(a.activity_type),
    );
    if (farmingTypes.length > 0) {
      bonus += Math.min(5, farmingTypes.length * 2);
    }
  }

  const maxPossible = base.maxPossiblePoints + 15; // max bonus
  const raw = base.rawPoints + bonus;
  const normalizedScore = maxPossible > 0 ? Math.round((raw / maxPossible) * 100) : 0;

  const isMissing = base.maxPossiblePoints === 0 && (!evidence.rootsLand || evidence.rootsLand.length === 0);

  return {
    rawPoints: raw,
    maxPossiblePoints: maxPossible,
    normalizedScore: Math.min(100, normalizedScore),
    status: isMissing ? 'MISSING' : 'COMPLETE',
    featureBands,
  };
};

/**
 * P3 — Financial Literacy / Income
 * Questionnaire + livelihood activity mix + AA financial analysis + expenses.
 */
const scoreP3 = (evidence) => {
  const base = scoreQuestionnaire(evidence);
  let bonus = 0;
  const featureBands = [];

  // Income diversity from activity mix
  if (evidence.activityMix && evidence.activityMix.length > 0) {
    const uniqueTypes = new Set(evidence.activityMix.map((m) => m.activity_type));
    const diversityBonus = Math.min(10, uniqueTypes.size * 3);
    bonus += diversityBonus;
    featureBands.push({ feature: 'INCOME_DIVERSITY', band: Math.min(5, uniqueTypes.size), source: 'TRUST' });
  }

  // AA financial health
  if (evidence.aaAnalysis) {
    const aaScore = parseFloat(evidence.aaAnalysis.overall_score || 0);
    const aaBand = Math.ceil(aaScore / 20); // 0-100 → 1-5
    bonus += Math.min(10, Math.round(aaScore / 10));
    featureBands.push({ feature: 'AA_FINANCIAL_HEALTH', band: Math.min(5, aaBand), source: 'AA' });
  }

  // Expense tracking confidence
  if (evidence.expenses && evidence.expenses.length >= 3) {
    const highConf = evidence.expenses.filter((e) => e.confidence === 'HIGH').length;
    if (highConf >= 2) bonus += 5;
    featureBands.push({ feature: 'EXPENSE_TRACKING', band: highConf >= 2 ? 4 : 2, source: 'TRUST' });
  }

  const maxPossible = base.maxPossiblePoints + 25;
  const raw = base.rawPoints + bonus;
  const normalizedScore = maxPossible > 0 ? Math.round((raw / maxPossible) * 100) : 0;

  return {
    rawPoints: raw,
    maxPossiblePoints: maxPossible,
    normalizedScore: Math.min(100, normalizedScore),
    status: base.maxPossiblePoints > 0 || (evidence.activityMix && evidence.activityMix.length > 0) ? 'COMPLETE' : 'MISSING',
    featureBands,
  };
};

/**
 * P4 — Repayment Capacity / Leverage
 * Questionnaire + liabilities + repayment streak + CIBIL + AA + expenses.
 */
const scoreP4 = (evidence) => {
  const base = scoreQuestionnaire(evidence);
  let bonus = 0;
  const featureBands = [];

  // Repayment discipline (last 24 months)
  if (evidence.repayments && evidence.repayments.length > 0) {
    const onTime = evidence.repayments.filter((r) => r.status === 'PAID_ONTIME').length;
    const total = evidence.repayments.length;
    const onTimeRatio = total > 0 ? onTime / total : 0;

    let repayBand = 1;
    if (onTimeRatio >= 0.95) { bonus += 15; repayBand = 5; }
    else if (onTimeRatio >= 0.80) { bonus += 10; repayBand = 4; }
    else if (onTimeRatio >= 0.60) { bonus += 5; repayBand = 3; }
    else if (onTimeRatio >= 0.40) { bonus += 0; repayBand = 2; }
    else { bonus -= 5; repayBand = 1; }

    featureBands.push({ feature: 'REPAYMENT_DISCIPLINE', band: repayBand, source: 'TRUST' });
  }

  // Liability load
  if (evidence.liabilities && evidence.liabilities.length > 0) {
    const totalOutstanding = evidence.liabilities.reduce((s, l) => s + parseFloat(l.outstanding_inr || 0), 0);
    // High exposure penalty
    if (totalOutstanding > 500000) bonus -= 5;
    else if (totalOutstanding > 200000) bonus -= 2;
    featureBands.push({
      feature: 'LIABILITY_LOAD',
      band: totalOutstanding > 500000 ? 1 : totalOutstanding > 200000 ? 2 : totalOutstanding > 50000 ? 3 : 4,
      source: 'TRUST',
    });
  }

  // Income vs expense headroom (from AA or expenses)
  if (evidence.expenses && evidence.expenses.length > 0 && evidence.activityMix && evidence.activityMix.length > 0) {
    bonus += 3; // Has both sides of the equation
  }

  // ROOTS Compliance — operational farming discipline
  // Temporal weight: season 1 = 10%, season 2 = 20%, season 3+ = 25% of P4
  let rootsBonusCap = 0;
  if (evidence.rootsCompliance && !evidence.rootsCompliance.insufficient) {
    const rc = evidence.rootsCompliance;
    const seasonCount = rc.seasonCount || 1;
    const rootsWeight = seasonCount >= 3 ? 0.25 : seasonCount >= 2 ? 0.20 : 0.10;
    rootsBonusCap = Math.round(rootsWeight * 100); // max bonus from ROOTS

    const rootsBonus = Math.round((rc.rootsTrustScore / 100) * rootsBonusCap);
    bonus += rootsBonus;

    const rootsBand = Math.ceil((rc.rootsTrustScore || 0) / 20);
    featureBands.push({
      feature: 'ROOTS_COMPLIANCE',
      band: Math.min(5, Math.max(1, rootsBand)),
      source: 'ROOTS',
    });
  }

  const maxPossible = base.maxPossiblePoints + 20 + rootsBonusCap;
  const raw = Math.max(0, base.rawPoints + bonus);
  const normalizedScore = maxPossible > 0 ? Math.round((raw / maxPossible) * 100) : 0;

  const hasROOTS = evidence.rootsCompliance && !evidence.rootsCompliance.insufficient;
  return {
    rawPoints: raw,
    maxPossiblePoints: maxPossible,
    normalizedScore: Math.min(100, normalizedScore),
    status: base.maxPossiblePoints > 0 || (evidence.liabilities && evidence.liabilities.length > 0) || hasROOTS ? 'COMPLETE' : 'MISSING',
    featureBands,
  };
};

/**
 * P5 — Collateral
 * Questionnaire + ROOTS land (collateral value proxy).
 */
const scoreP5 = (evidence) => {
  const base = scoreQuestionnaire(evidence);
  let bonus = 0;
  const featureBands = [];

  if (evidence.rootsLand && evidence.rootsLand.length > 0) {
    bonus += Math.min(10, evidence.rootsLand.length * 4);
    featureBands.push({ feature: 'LAND_COLLATERAL', band: Math.min(5, evidence.rootsLand.length), source: 'ROOTS' });
  }

  const maxPossible = base.maxPossiblePoints + 10;
  const raw = base.rawPoints + bonus;
  const normalizedScore = maxPossible > 0 ? Math.round((raw / maxPossible) * 100) : 0;

  return {
    rawPoints: raw,
    maxPossiblePoints: maxPossible,
    normalizedScore: Math.min(100, normalizedScore),
    status: base.maxPossiblePoints > 0 ? 'COMPLETE' : 'MISSING',
    featureBands,
  };
};

/**
 * P6 — Network / References
 * Questionnaire-driven. Social proof from community references.
 */
const scoreP6 = (evidence) => {
  const base = scoreQuestionnaire(evidence);
  return {
    ...base,
    maxPossiblePoints: base.maxPossiblePoints,
    status: base.maxPossiblePoints > 0 ? 'COMPLETE' : 'MISSING',
    featureBands: [],
  };
};

const SCORERS = { P1: scoreP1, P2: scoreP2, P3: scoreP3, P4: scoreP4, P5: scoreP5, P6: scoreP6 };

/**
 * Scores all 6 pillars from an evidence bundle.
 *
 * @param {Object} bundle - Keyed by pillar code (P1..P6), from evidenceCollector.collectForScoring
 * @returns {{ pillarResults: Object, missingPillars: string[] }}
 */
const scoreAllPillars = (bundle) => {
  const pillarResults = {};
  const missingPillars = [];

  for (const [pillarCode, scorer] of Object.entries(SCORERS)) {
    const evidence = bundle[pillarCode];
    if (!evidence) {
      missingPillars.push(pillarCode);
      pillarResults[pillarCode] = { rawPoints: 0, maxPossiblePoints: 0, normalizedScore: 0, status: 'MISSING', featureBands: [] };
      continue;
    }

    try {
      const result = scorer(evidence);
      pillarResults[pillarCode] = result;
      if (result.status === 'MISSING') {
        missingPillars.push(pillarCode);
      }
    } catch (err) {
      logger.error(`[TRUST/pillar] ${pillarCode} scoring failed: ${err.message}`);
      pillarResults[pillarCode] = { rawPoints: 0, maxPossiblePoints: 0, normalizedScore: 0, status: 'ERROR', featureBands: [] };
      missingPillars.push(pillarCode);
    }
  }

  return { pillarResults, missingPillars };
};

/**
 * Runtime assertion: pillar weights from trust_sections must sum to 1.0 ±0.001.
 * @param {Array} sections - TrustSection rows with weight_in_total_score
 * @throws {Error} if weights don't sum to ~100
 */
const assertWeightsSum = (sections) => {
  const totalWeight = sections.reduce((sum, s) => sum + parseFloat(s.weight_in_total_score || 0), 0);
  if (Math.abs(totalWeight - 100) > 0.1) {
    throw new Error(`Pillar weights sum to ${totalWeight}, expected 100 (±0.1). Check trust_sections.weight_in_total_score.`);
  }
};

module.exports = { scoreAllPillars, assertWeightsSum, SCORERS };
