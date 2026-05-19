/**
 * Readiness Service
 * Composes TRUST + Financial Health Score (FHS) + role into a role-appropriate
 * loan-readiness projection. Read-only — never writes to TRUST or AA tables.
 *
 * Source of truth: DESIGN-SYSTEM-SCORE-DISPLAY.md
 */

const logger = require('../../../shared/utils/logger');
const { setWithTTL, getKey } = require('../../../config/redis');

// Lazy-load to avoid circular deps
let _trustService;
const getTrustService = () => {
  if (!_trustService) _trustService = require('../../trust/services/trustService');
  return _trustService;
};

let _aaOrchestrator;
const getAaOrchestrator = () => {
  if (!_aaOrchestrator) _aaOrchestrator = require('../../aa/services/aaAnalysisOrchestrator');
  return _aaOrchestrator;
};

const CACHE_TTL = 1800; // 30 minutes — readiness is a composition, fresher than source caches

// ──────────────────────────────────────────────
// Thresholds — reads from bank_product_config table, falls back to system defaults
// ──────────────────────────────────────────────
let _configService;
const getConfigService = () => {
  if (!_configService) _configService = require('./bankProductConfigService');
  return _configService;
};

const getThresholds = async (bankId = null, productId = null) => {
  if (bankId) {
    return getConfigService().getThresholds(bankId, productId);
  }
  // No bank context — return system defaults
  return getConfigService().DEFAULT_THRESHOLDS;
};

// ──────────────────────────────────────────────
// Staleness detection
// ──────────────────────────────────────────────
const STALENESS_DAYS = {
  trust: 90,
  fhs: 90,
};

const daysSince = (date) => {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
};

// ──────────────────────────────────────────────
// Core: determine readiness state
// ──────────────────────────────────────────────

/**
 * Determine the loan-readiness state from raw scores.
 * @param {number|null} trustScore
 * @param {number|null} fhsScore
 * @param {Object} thresholds
 * @returns {'ready'|'almost_ready'|'not_ready'|'needs_data'}
 */
const computeState = (trustScore, fhsScore, thresholds) => {
  if (trustScore == null && fhsScore == null) return 'needs_data';
  if (trustScore == null || fhsScore == null) return 'needs_data';

  const trustHigh = trustScore >= thresholds.trustCutoff;
  const fhsHigh = fhsScore >= thresholds.fhsCutoff;

  if (trustHigh && fhsHigh) return 'ready';
  if (trustHigh || fhsHigh) return 'almost_ready';
  return 'not_ready';
};

/**
 * Determine the 2×2 matrix cell for banker view.
 * @param {number|null} trustScore
 * @param {number|null} fhsScore
 * @param {Object} thresholds
 * @returns {'approve'|'conditional'|'refer'|'decline'|null}
 */
const computeMatrixCell = (trustScore, fhsScore, thresholds) => {
  if (trustScore == null || fhsScore == null) return null;

  const trustHigh = trustScore >= thresholds.trustCutoff;
  const fhsHigh = fhsScore >= thresholds.fhsCutoff;

  if (trustHigh && fhsHigh) return 'approve';
  if (trustHigh && !fhsHigh) return 'conditional';
  if (!trustHigh && fhsHigh) return 'refer';
  return 'decline';
};

/**
 * Score → band label.
 * @param {number} score
 * @returns {'strong'|'building'|'low'}
 */
const scoreToBand = (score) => {
  if (score >= 80) return 'strong';
  if (score >= 50) return 'building';
  return 'low';
};

/**
 * Derive sathi coaching priority from readiness state + trust band.
 * @param {string} state
 * @param {string} trustBand
 * @returns {'high'|'medium'|'low'}
 */
const computeCoachingPriority = (state, trustBand) => {
  if (state === 'not_ready' || state === 'needs_data') return 'high';
  if (state === 'almost_ready') return trustBand === 'low' ? 'high' : 'medium';
  return 'low';
};

// ──────────────────────────────────────────────
// Data fetching (read-only consumers)
// ──────────────────────────────────────────────

const fetchTrustData = async (farmerId) => {
  try {
    const trustService = getTrustService();
    const score = await trustService.getScore(farmerId);
    return score; // { totalScore, scoreBand, sectionScores, calculatedAt, nextReviewDate }
  } catch (err) {
    logger.warn(`readiness: TRUST score unavailable for farmer ${farmerId}: ${err.message}`);
    return null;
  }
};

const fetchFhsData = async (farmerId) => {
  try {
    const orchestrator = getAaOrchestrator();
    const analysis = await orchestrator.getLatestAnalysis(farmerId);
    return analysis; // { score, grade, components, ... } or null
  } catch (err) {
    logger.warn(`readiness: FHS unavailable for farmer ${farmerId}: ${err.message}`);
    return null;
  }
};

// ──────────────────────────────────────────────
// Build reasons array
// ──────────────────────────────────────────────

const buildReasons = (trustData, fhsData, thresholds) => {
  const reasons = [];

  if (!trustData) {
    reasons.push({ field: 'trust', status: 'missing', labelKey: 'readiness.reason.trust_missing' });
  } else if (trustData.totalScore >= thresholds.trustCutoff) {
    reasons.push({ field: 'trust', status: 'met', labelKey: 'readiness.reason.trust_met', band: scoreToBand(trustData.totalScore) });
  } else {
    reasons.push({ field: 'trust', status: 'below', labelKey: 'readiness.reason.trust_below', band: scoreToBand(trustData.totalScore) });
  }

  if (!fhsData) {
    reasons.push({ field: 'fhs', status: 'missing', labelKey: 'readiness.reason.fhs_missing' });
  } else if (fhsData.score >= thresholds.fhsCutoff) {
    reasons.push({ field: 'fhs', status: 'met', labelKey: 'readiness.reason.fhs_met', band: scoreToBand(fhsData.score) });
  } else {
    reasons.push({ field: 'fhs', status: 'below', labelKey: 'readiness.reason.fhs_below', band: scoreToBand(fhsData.score) });
  }

  return reasons;
};

// ──────────────────────────────────────────────
// Role projections
// ──────────────────────────────────────────────

/**
 * Build farmer projection.
 * Shows both scores if showNumericScores is true, bands only otherwise.
 */
const buildFarmerProjection = (state, trustData, fhsData, thresholds, stalenessFlags, showNumericScores) => {
  const result = {
    state,
    trust: { band: trustData ? scoreToBand(trustData.totalScore) : null },
    financialHealth: { band: fhsData ? scoreToBand(fhsData.score) : null },
    reasons: buildReasons(trustData, fhsData, thresholds),
    stalenessFlags,
  };

  if (showNumericScores) {
    if (trustData) result.trust.score = trustData.totalScore;
    if (fhsData) result.financialHealth.score = fhsData.score;
  }

  return result;
};

/**
 * Build sathi projection.
 * TRUST visible. FHS completely absent (not null — absent keys).
 * Includes coachingPriority instead of financial data.
 */
const buildSathiProjection = (state, trustData, thresholds, stalenessFlags) => {
  const trustBand = trustData ? scoreToBand(trustData.totalScore) : null;

  return {
    state,
    trust: trustData
      ? { score: trustData.totalScore, band: trustBand }
      : null,
    coachingPriority: computeCoachingPriority(state, trustBand),
    reasons: trustData
      ? [{ field: 'trust', status: trustData.totalScore >= thresholds.trustCutoff ? 'met' : 'below', band: trustBand }]
      : [{ field: 'trust', status: 'missing', labelKey: 'readiness.reason.trust_missing' }],
    stalenessFlags: { trust: stalenessFlags.trust },
  };
};

/**
 * Build banker projection.
 * Full access: both numeric scores, bands, component breakdowns, matrix cell, recommended action.
 */
const buildBankerProjection = (state, trustData, fhsData, thresholds, stalenessFlags) => {
  const matrixCell = computeMatrixCell(
    trustData?.totalScore ?? null,
    fhsData?.score ?? null,
    thresholds,
  );

  const RECOMMENDED_ACTIONS = {
    approve: 'Standard terms — reliable person with capacity',
    conditional: 'Reduced ticket, EMI aligned to crop season, cash-flow coaching',
    refer: 'Hold for banker verification + extra KYC/Sathi visit',
    decline: 'Offer coaching path + re-apply window (90 days)',
  };

  return {
    state,
    trust: trustData
      ? {
        score: trustData.totalScore,
        band: scoreToBand(trustData.totalScore),
        sectionScores: trustData.sectionScores,
        calculatedAt: trustData.calculatedAt,
      }
      : null,
    financialHealth: fhsData
      ? {
        score: fhsData.score,
        band: scoreToBand(fhsData.score),
        grade: fhsData.grade,
        components: fhsData.components || null,
        analysisMode: fhsData.analysisMode || null,
        transactionCount: fhsData.transactionCount || null,
        createdAt: fhsData.createdAt || null,
      }
      : null,
    matrixCell,
    recommendedAction: matrixCell ? RECOMMENDED_ACTIONS[matrixCell] : null,
    thresholds: { trustCutoff: thresholds.trustCutoff, fhsCutoff: thresholds.fhsCutoff },
    reasons: buildReasons(trustData, fhsData, thresholds),
    stalenessFlags,
  };
};

// ──────────────────────────────────────────────
// Main API
// ──────────────────────────────────────────────

/**
 * Get the loan-readiness state for a farmer, projected for the caller's role.
 *
 * @param {number} farmerId
 * @param {Object} options
 * @param {string} options.role - 'farmer' | 'sathi' | 'banker'
 * @param {boolean} [options.showNumericScores=false] - Farmer-only: show raw numbers
 * @returns {Object} Role-appropriate readiness projection
 */
const getLoanReadinessState = async (farmerId, { role, showNumericScores = false } = {}) => {
  if (!farmerId) {
    const err = new Error('Farmer ID is required');
    err.statusCode = 400;
    err.errorCode = 'READINESS_INVALID_INPUT';
    throw err;
  }

  if (!['farmer', 'sathi', 'banker'].includes(role)) {
    const err = new Error(`Invalid role for readiness: ${role}`);
    err.statusCode = 400;
    err.errorCode = 'READINESS_INVALID_ROLE';
    throw err;
  }

  // Cache key includes role + showNumericScores so projections never leak across roles
  const cacheKey = `readiness:${farmerId}:${role}:${showNumericScores}`;
  const cached = await getKey(cacheKey);
  if (cached) {
    logger.info(`readiness: cache hit for farmer ${farmerId}, role=${role}`);
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  }

  // Fetch source data in parallel
  const [trustData, fhsData] = await Promise.all([
    fetchTrustData(farmerId),
    role === 'sathi' ? Promise.resolve(null) : fetchFhsData(farmerId),
  ]);

  const thresholds = await getThresholds();

  // Compute staleness
  const stalenessFlags = {
    trust: trustData ? daysSince(trustData.calculatedAt) > STALENESS_DAYS.trust : null,
    fhs: fhsData ? daysSince(fhsData.createdAt) > STALENESS_DAYS.fhs : null,
  };

  // Compute state
  const effectiveFhsScore = role === 'sathi' ? null : (fhsData?.score ?? null);
  const state = computeState(trustData?.totalScore ?? null, effectiveFhsScore, thresholds);

  // Build role-specific projection
  let projection;
  switch (role) {
    case 'farmer':
      projection = buildFarmerProjection(state, trustData, fhsData, thresholds, stalenessFlags, showNumericScores);
      break;
    case 'sathi':
      projection = buildSathiProjection(state, trustData, thresholds, stalenessFlags);
      break;
    case 'banker':
      projection = buildBankerProjection(state, trustData, fhsData, thresholds, stalenessFlags);
      break;
  }

  await setWithTTL(cacheKey, JSON.stringify(projection), CACHE_TTL);
  logger.info(`readiness: computed for farmer ${farmerId}, role=${role}, state=${state}`);

  return projection;
};

// ──────────────────────────────────────────────
// /why drill-down
// ──────────────────────────────────────────────

const NEXT_STEPS = {
  farmer: {
    needs_data: [
      { labelKey: 'readiness.next.complete_profile', action: 'Complete your profile and TRUST questionnaire' },
      { labelKey: 'readiness.next.link_bank', action: 'Link your bank account via Account Aggregator' },
    ],
    not_ready: [
      { labelKey: 'readiness.next.improve_trust', action: 'Work with your Sathi to improve TRUST score' },
      { labelKey: 'readiness.next.maintain_balance', action: 'Maintain regular bank balance and avoid bounces' },
    ],
    almost_ready: [
      { labelKey: 'readiness.next.close_gap', action: 'You are close — address the items below threshold' },
    ],
    ready: [
      { labelKey: 'readiness.next.apply', action: 'You are ready to apply for a loan' },
    ],
  },
  sathi: {
    needs_data: [
      { labelKey: 'readiness.next.sathi_collect', action: 'Collect TRUST data for this farmer' },
    ],
    not_ready: [
      { labelKey: 'readiness.next.sathi_coach', action: 'Schedule coaching sessions to improve TRUST score' },
    ],
    almost_ready: [
      { labelKey: 'readiness.next.sathi_push', action: 'Focus coaching on remaining gap areas' },
    ],
    ready: [
      { labelKey: 'readiness.next.sathi_submit', action: 'Farmer is ready — assist with loan application' },
    ],
  },
  banker: {
    needs_data: [
      { labelKey: 'readiness.next.banker_wait', action: 'Insufficient data — request Sathi visit or AA consent' },
    ],
    not_ready: [
      { labelKey: 'readiness.next.banker_decline', action: 'Offer coaching path + re-apply window (90 days)' },
    ],
    almost_ready: [
      { labelKey: 'readiness.next.banker_conditional', action: 'Consider reduced ticket or seasonal EMI alignment' },
    ],
    ready: [
      { labelKey: 'readiness.next.banker_approve', action: 'Standard terms — proceed with loan processing' },
    ],
  },
};

/**
 * Build component contributions for the /why endpoint.
 * Banker gets full detail; farmer gets bands only; sathi gets TRUST only.
 */
const buildComponents = (role, trustData, fhsData, thresholds) => {
  const components = {};

  if (trustData) {
    components.trust = {
      score: role !== 'farmer' ? trustData.totalScore : undefined,
      band: scoreToBand(trustData.totalScore),
      threshold: thresholds.trustCutoff,
      met: trustData.totalScore >= thresholds.trustCutoff,
    };

    if (role === 'banker' && trustData.sectionScores) {
      components.trust.sectionScores = trustData.sectionScores;
    }
  }

  // FHS absent for sathi role
  if (role !== 'sathi' && fhsData) {
    components.financialHealth = {
      score: role === 'banker' ? fhsData.score : undefined,
      band: scoreToBand(fhsData.score),
      threshold: thresholds.fhsCutoff,
      met: fhsData.score >= thresholds.fhsCutoff,
    };

    if (role === 'banker' && fhsData.components) {
      components.financialHealth.breakdown = fhsData.components;
    }
  }

  return components;
};

/**
 * Get the readiness drill-down for a farmer, projected for the caller's role.
 *
 * @param {number} farmerId
 * @param {Object} options
 * @param {string} options.role - 'farmer' | 'sathi' | 'banker'
 * @returns {Object} Drill-down: state, reasons, components, nextSteps
 */
const getReadinessWhy = async (farmerId, { role } = {}) => {
  if (!farmerId) {
    const err = new Error('Farmer ID is required');
    err.statusCode = 400;
    err.errorCode = 'READINESS_INVALID_INPUT';
    throw err;
  }

  if (!['farmer', 'sathi', 'banker'].includes(role)) {
    const err = new Error(`Invalid role for readiness: ${role}`);
    err.statusCode = 400;
    err.errorCode = 'READINESS_INVALID_ROLE';
    throw err;
  }

  // Cache key for /why
  const cacheKey = `readiness:why:${farmerId}:${role}`;
  const cached = await getKey(cacheKey);
  if (cached) {
    logger.info(`readiness/why: cache hit for farmer ${farmerId}, role=${role}`);
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  }

  // Fetch source data in parallel
  const [trustData, fhsData] = await Promise.all([
    fetchTrustData(farmerId),
    role === 'sathi' ? Promise.resolve(null) : fetchFhsData(farmerId),
  ]);

  const thresholds = await getThresholds();

  // Compute state
  const effectiveFhsScore = role === 'sathi' ? null : (fhsData?.score ?? null);
  const state = computeState(trustData?.totalScore ?? null, effectiveFhsScore, thresholds);

  const reasons = buildReasons(trustData, fhsData, thresholds);

  // Sathi reasons: filter out FHS reasons
  const filteredReasons = role === 'sathi'
    ? reasons.filter(r => r.field !== 'fhs')
    : reasons;

  const components = buildComponents(role, trustData, fhsData, thresholds);
  const nextSteps = NEXT_STEPS[role][state] || [];

  const result = {
    state,
    reasons: filteredReasons,
    components,
    nextSteps,
  };

  // Banker gets matrix cell in /why too
  if (role === 'banker') {
    result.matrixCell = computeMatrixCell(
      trustData?.totalScore ?? null,
      fhsData?.score ?? null,
      thresholds,
    );
    result.thresholds = { trustCutoff: thresholds.trustCutoff, fhsCutoff: thresholds.fhsCutoff };
  }

  // Sathi gets coaching priority
  if (role === 'sathi') {
    const trustBand = trustData ? scoreToBand(trustData.totalScore) : null;
    result.coachingPriority = computeCoachingPriority(state, trustBand);
  }

  await setWithTTL(cacheKey, JSON.stringify(result), CACHE_TTL);
  logger.info(`readiness/why: computed for farmer ${farmerId}, role=${role}, state=${state}`);

  return result;
};

module.exports = {
  getLoanReadinessState,
  getReadinessWhy,
  // Exported for testing
  computeState,
  computeMatrixCell,
  scoreToBand,
  computeCoachingPriority,
};
