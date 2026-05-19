/**
 * TRUST Scoring Engine
 * Calculates farmer credit worthiness based on section responses.
 *
 * Score Bands: Poor (0-250), Fair (251-500), Good (501-750), Excellent (751-1000)
 *
 * Flow:
 * 1. Collect all responses for a farmer
 * 2. For each section: sum points from all questions
 * 3. Normalize: (raw_points / max_possible) * 100
 * 4. Apply weight: normalized * (weight / 100)
 * 5. Total = sum of weighted section scores (scaled to 1000)
 * 6. Determine band
 */

const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');

const TOTAL_SCORE_SCALE = 1000;
const MAX_PULSE_ADJUSTMENT = 50; // ±50 points max (5% of 1000) — shared with externalSignals.js

const SCORE_BANDS = [
  { band: 'poor', min: 0, max: 250 },
  { band: 'fair', min: 251, max: 500 },
  { band: 'good', min: 501, max: 750 },
  { band: 'excellent', min: 751, max: 1000 },
];

/**
 * Determines the score band for a given total score.
 * @param {number} totalScore
 * @returns {{ band: string, min: number, max: number }}
 */
const getScoreBand = (totalScore) => {
  for (const b of SCORE_BANDS) {
    if (totalScore >= b.min && totalScore <= b.max) return b;
  }
  return SCORE_BANDS[0]; // fallback to poor
};

/**
 * Calculates the points for a single question response.
 * @param {Object} question - TrustQuestion with choices, conditions, scoringRanges
 * @param {Object} response - TrustResponse with choiceResponses, numericResponse
 * @returns {number} Points awarded
 */
const calculateQuestionPoints = (question, response) => {
  if (!response) return 0;

  switch (question.question_type) {
    case 'yes_no': {
      // For yes_no: choiceResponses contain the selected choice
      const selectedChoice = response.choiceResponses?.[0];
      if (selectedChoice?.choice) {
        return selectedChoice.choice.points_awarded || 0;
      }
      // Check conditions for boolean answers
      const conditions = question.conditions || [];
      for (const cond of conditions) {
        if (cond.condition_type === 'equals' && cond.is_active) {
          return cond.resulting_points || 0;
        }
      }
      return 0;
    }

    case 'multiple_choice': {
      // Sum points from all selected choices
      const choices = response.choiceResponses || [];
      return choices.reduce((sum, cr) => sum + (cr.choice?.points_awarded || 0), 0);
    }

    case 'numeric_input': {
      const numericValue = parseFloat(response.numericResponse?.numeric_value || 0);

      // Defense-in-depth: the write path validates min/max, but if the DB
      // was loaded via a seeder or tampered with directly, clip to declared
      // bounds before awarding points. Out-of-range values score 0 rather
      // than giving the tamperer a large positive number.
      const min = question.min_value !== null && question.min_value !== undefined ? parseFloat(question.min_value) : null;
      const max = question.max_value !== null && question.max_value !== undefined ? parseFloat(question.max_value) : null;
      if (!Number.isFinite(numericValue)
          || (min !== null && numericValue < min)
          || (max !== null && numericValue > max)) {
        return 0;
      }

      // Check scoring ranges first
      const ranges = question.scoringRanges || [];
      for (const range of ranges) {
        if (!range.is_active) continue;
        const min = parseFloat(range.input_min);
        const max = parseFloat(range.input_max);
        if (numericValue >= min && numericValue <= max) {
          return range.points_awarded || 0;
        }
      }

      // Fall back to conditions
      const conditions = question.conditions || [];
      for (const cond of conditions) {
        if (!cond.is_active) continue;
        const condVal = parseFloat(cond.condition_value);

        switch (cond.condition_type) {
          case 'greater_than':
            if (numericValue > condVal) return cond.resulting_points;
            break;
          case 'less_than':
            if (numericValue < condVal) return cond.resulting_points;
            break;
          case 'equals':
            if (numericValue === condVal) return cond.resulting_points;
            break;
          case 'between': {
            const [bMin, bMax] = cond.condition_value.split(',').map(Number);
            if (numericValue >= bMin && numericValue <= bMax) return cond.resulting_points;
            break;
          }
        }
      }
      return 0;
    }

    case 'text_input': {
      // Text inputs use conditions for scoring. Cap both sides to 255 chars
      // to bound CPU on pathological inputs and reject admin-authored
      // conditions that look like regex rather than literal matches.
      const conditions = question.conditions || [];
      const textVal = String(response.choiceResponses?.[0]?.choice?.choice_value || '').slice(0, 255);
      for (const cond of conditions) {
        if (!cond.is_active) continue;
        const condValStr = String(cond.condition_value || '').slice(0, 255);
        if (cond.condition_type === 'contains' && textVal.includes(condValStr)) {
          return cond.resulting_points;
        }
        if (cond.condition_type === 'equals' && textVal === condValStr) {
          return cond.resulting_points;
        }
      }
      return 0;
    }

    default:
      return 0;
  }
};

/**
 * Calculates scores for a single section.
 * @param {Object} section - TrustSection with questions loaded
 * @param {Array} responses - Farmer's responses for this section
 * @returns {{ rawPoints: number, maxPossible: number, normalizedScore: number, contributionToTotal: number }}
 */
const calculateSectionScore = (section, responses) => {
  const questions = section.questions || [];
  const responseMap = {};
  responses.forEach((r) => { responseMap[r.question_id] = r; });

  let rawPoints = 0;
  let maxPossible = 0;

  for (const question of questions) {
    if (!question.is_active) continue;

    // Calculate max possible for this question
    let questionMax = 0;
    if (question.choices?.length) {
      questionMax = Math.max(...question.choices.map((c) => c.points_awarded || 0));
    } else if (question.scoringRanges?.length) {
      questionMax = Math.max(...question.scoringRanges.map((r) => r.points_awarded || 0));
    } else if (question.conditions?.length) {
      questionMax = Math.max(...question.conditions.map((c) => c.resulting_points || 0));
    }
    maxPossible += questionMax;

    // Calculate actual points
    const response = responseMap[question.id];
    rawPoints += calculateQuestionPoints(question, response);
  }

  // Normalize to 0-100 scale
  const normalizedScore = maxPossible > 0 ? Math.round((rawPoints / maxPossible) * 100) : 0;

  // Calculate weighted contribution (scaled to 1000-point total)
  const weight = parseFloat(section.weight_in_total_score) || 0;
  const contributionToTotal = Math.round(normalizedScore * (weight / 100) * (TOTAL_SCORE_SCALE / 100));

  return { rawPoints, maxPossible, normalizedScore, contributionToTotal };
};

/**
 * Calculates the complete TRUST score for a farmer.
 * @param {number} farmerId - Internal user ID
 * @param {Object} db - Database models
 * @returns {Promise<Object>} { totalScore, scoreBand, sectionScores, calculations }
 */
const calculateTrustScore = async (farmerId, db) => {
  const {
    TrustSection, TrustQuestion, TrustQuestionChoice, TrustQuestionCondition,
    TrustTextInputScoringRange, TrustResponse, TrustResponseChoice, TrustResponseNumeric,
    TrustScoreCalculation, TrustScoreHistory,
  } = db;

  // Load all sections with questions and scoring metadata
  const sections = await TrustSection.findAll({
    where: { is_active: true },
    include: [{
      model: TrustQuestion, as: 'questions',
      where: { is_active: true },
      required: false,
      include: [
        { model: TrustQuestionChoice, as: 'choices', where: { is_active: true }, required: false },
        { model: TrustQuestionCondition, as: 'conditions', where: { is_active: true }, required: false },
        { model: TrustTextInputScoringRange, as: 'scoringRanges', where: { is_active: true }, required: false },
      ],
    }],
    order: [['section_order', 'ASC']],
  });

  // Load all farmer responses with their choices/numeric values
  const responses = await TrustResponse.findAll({
    where: { farmer_id: farmerId, is_active: true },
    include: [
      { model: TrustResponseChoice, as: 'choiceResponses', include: [{ model: TrustQuestionChoice, as: 'choice' }] },
      { model: TrustResponseNumeric, as: 'numericResponse' },
    ],
  });

  // Group responses by section
  const questionSectionMap = {};
  sections.forEach((s) => {
    (s.questions || []).forEach((q) => { questionSectionMap[q.id] = s.id; });
  });

  const responsesBySectionId = {};
  responses.forEach((r) => {
    const sectionId = questionSectionMap[r.question_id];
    if (sectionId) {
      if (!responsesBySectionId[sectionId]) responsesBySectionId[sectionId] = [];
      responsesBySectionId[sectionId].push(r);
    }
  });

  // Calculate per-section scores
  const sectionScores = {};
  const calculations = [];
  let totalScore = 0;

  for (const section of sections) {
    const sectionResponses = responsesBySectionId[section.id] || [];
    const result = calculateSectionScore(section, sectionResponses);

    sectionScores[section.section_code] = {
      sectionName: section.section_name,
      rawPoints: result.rawPoints,
      maxPossible: result.maxPossible,
      normalizedScore: result.normalizedScore,
      weight: parseFloat(section.weight_in_total_score),
      contributionToTotal: result.contributionToTotal,
    };

    totalScore += result.contributionToTotal;

    calculations.push({
      calculation_uuid: generateUUID(),
      farmer_id: farmerId,
      section_id: section.id,
      raw_points: result.rawPoints,
      max_possible_points: result.maxPossible,
      normalized_score: result.normalizedScore,
      contribution_to_total: result.contributionToTotal,
      calculated_at: new Date(),
      calculation_basis: `${sectionResponses.length}/${(section.questions || []).length} responses`,
    });
  }

  // ─── External Signals: PULSE Price Risk + DICE Repayment Stress ──
  // Applied as post-calculation adjustments (±50 + ±30 = ±80 points max)
  let externalSignals = null;
  try {
    const { calculateExternalSignals } = require('./externalSignals');
    externalSignals = await calculateExternalSignals(farmerId);
    totalScore += externalSignals.totalAdjustment;

    // Add external signals to section scores for transparency
    if (externalSignals.signals.PULSE_PRICE_RISK) {
      sectionScores['PULSE_PRICE_RISK'] = {
        sectionName: 'Price Risk (PULSE)',
        rawPoints: externalSignals.signals.PULSE_PRICE_RISK.adjustment,
        maxPossible: MAX_PULSE_ADJUSTMENT,
        normalizedScore: null,
        weight: null,
        contributionToTotal: externalSignals.signals.PULSE_PRICE_RISK.adjustment,
        signal: 'external',
        reason: externalSignals.signals.PULSE_PRICE_RISK.reason,
      };
    }
    if (externalSignals.signals.DICE_REPAYMENT_STRESS) {
      sectionScores['DICE_REPAYMENT_STRESS'] = {
        sectionName: 'Repayment Stress (DICE)',
        rawPoints: externalSignals.signals.DICE_REPAYMENT_STRESS.adjustment,
        maxPossible: 30,
        normalizedScore: null,
        weight: null,
        contributionToTotal: externalSignals.signals.DICE_REPAYMENT_STRESS.adjustment,
        signal: 'external',
        reason: externalSignals.signals.DICE_REPAYMENT_STRESS.reason,
      };
    }
    if (externalSignals.signals.POP_COMPLIANCE) {
      sectionScores['POP_COMPLIANCE'] = {
        sectionName: 'PoP Compliance (ROOTS)',
        rawPoints: externalSignals.signals.POP_COMPLIANCE.adjustment,
        maxPossible: 40,
        normalizedScore: null,
        weight: null,
        contributionToTotal: externalSignals.signals.POP_COMPLIANCE.adjustment,
        signal: 'external',
        reason: externalSignals.signals.POP_COMPLIANCE.reason,
      };
    }
    if (externalSignals.signals.SENTINEL_INCOME_DIVERSIFICATION) {
      sectionScores['SENTINEL_INCOME_DIVERSIFICATION'] = {
        sectionName: 'Income Diversification (SENTINEL)',
        rawPoints: externalSignals.signals.SENTINEL_INCOME_DIVERSIFICATION.adjustment,
        maxPossible: 30,
        normalizedScore: null,
        weight: null,
        contributionToTotal: externalSignals.signals.SENTINEL_INCOME_DIVERSIFICATION.adjustment,
        signal: 'external',
        reason: externalSignals.signals.SENTINEL_INCOME_DIVERSIFICATION.reason,
      };
    }
    if (externalSignals.signals.SAGE_ADVISORY_COMPLIANCE) {
      sectionScores['SAGE_ADVISORY_COMPLIANCE'] = {
        sectionName: 'Advisory Compliance (SAGE)',
        rawPoints: externalSignals.signals.SAGE_ADVISORY_COMPLIANCE.adjustment,
        maxPossible: 20,
        normalizedScore: null,
        weight: null,
        contributionToTotal: externalSignals.signals.SAGE_ADVISORY_COMPLIANCE.adjustment,
        signal: 'external',
        reason: externalSignals.signals.SAGE_ADVISORY_COMPLIANCE.reason,
      };
    }
  } catch (err) {
    logger.warn(`External signals failed for farmer ${farmerId}: ${err.message}`);
    // Non-blocking — base TRUST score is still valid without external signals
  }

  // Clamp total score to 0-1000
  totalScore = Math.min(Math.max(Math.round(totalScore), 0), TOTAL_SCORE_SCALE);

  const band = getScoreBand(totalScore);

  // Persist calculations
  await TrustScoreCalculation.bulkCreate(calculations);

  // Persist score history
  const history = await TrustScoreHistory.create({
    score_history_uuid: generateUUID(),
    farmer_id: farmerId,
    total_trust_score: totalScore,
    score_band: band.band,
    score_band_min: band.min,
    score_band_max: band.max,
    section_scores: sectionScores,
    calculated_at: new Date(),
  });

  // Log only the band, not the raw score. Exact scores are PII-adjacent
  // (they govern lending eligibility); bands are enough for ops tracing.
  logger.info('trust.score_calculated', {
    event: 'trust.score_calculated',
    farmerId, band: band.band,
    hasExternalSignals: !!externalSignals,
  });

  return {
    totalScore,
    scoreBand: band.band,
    scoreBandMin: band.min,
    scoreBandMax: band.max,
    sectionScores,
    externalSignals: externalSignals ? externalSignals.signals : null,
    calculatedAt: history.calculated_at,
    historyId: history.score_history_uuid,
  };
};

module.exports = {
  calculateTrustScore,
  calculateSectionScore,
  calculateQuestionPoints,
  getScoreBand,
  SCORE_BANDS,
  TOTAL_SCORE_SCALE,
};
