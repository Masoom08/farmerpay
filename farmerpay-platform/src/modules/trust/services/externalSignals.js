/**
 * External Signals for TRUST Score — PULSE × DICE Integration
 *
 * Signal #8 (of 13): PULSE Price Risk
 *   • Fetches price forecasts for farmer's active crops
 *   • Predicted price decline → higher credit risk → negative adjustment
 *   • Predicted price increase → lower credit risk → positive adjustment
 *   • Weighted by forecast confidence and commodity volatility
 *
 * Signal #9: DICE Repayment Stress
 *   • Compares loan outstanding vs predicted crop realisation
 *   • If predicted net realisation < loan outstanding → stress signal
 *   • Factors in interest accrual over forecast horizon
 *
 * These signals are applied as post-calculation adjustments to the base
 * TRUST score, contributing up to ±50 points (5% of 1000-point scale).
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const MAX_PULSE_ADJUSTMENT = 50; // ±50 points max (5% of 1000)
const MAX_DICE_STRESS_ADJUSTMENT = 30; // -30 points max (3% of 1000)
const MAX_POP_COMPLIANCE_ADJUSTMENT = 40; // ±40 points max
const MAX_INCOME_DIVERSIFICATION_ADJUSTMENT = 30; // ±30 points max
const MAX_SAGE_COMPLIANCE_ADJUSTMENT = 20; // ±20 points max
const MAX_IDENTITY_ADDRESS_ADJUSTMENT = 40; // ±40 points max (Signal #6)
const MAX_BORROWING_HEALTH_ADJUSTMENT = 30; // ±30 points max (Signal #7)

/**
 * Signal #8: PULSE Price Risk Signal
 * Calculates credit risk adjustment based on price trajectory for farmer's crops.
 *
 * @param {number} farmerId
 * @returns {Promise<Object>} { adjustment, details }
 */
const calculatePulseRiskSignal = async (farmerId) => {
  const { CultivationCycle, PulsePriceForecast, PulsePriceRecord, PulseCommodity, Field, FarmRegister } = getDb();

  try {
    // Find farmer's active/post-harvest cultivation cycles
    const activeCycles = await CultivationCycle.findAll({
      where: {
        cycle_status: { [Op.in]: ['growing', 'monitoring', 'harvesting', 'post_harvest'] },
        is_active: true
      },
      include: [{
        model: Field, as: 'field',
        include: [{ model: FarmRegister, as: 'farmRegister', where: { farmer_id: farmerId } }]
      }]
    });

    if (activeCycles.length === 0) {
      return { adjustment: 0, signal: 'PULSE_PRICE_RISK', reason: 'no_active_crops', details: null };
    }

    let totalRiskScore = 0;
    let cyclesAnalysed = 0;
    const details = [];

    for (const cycle of activeCycles) {
      const commodityId = cycle.crop_id;
      if (!commodityId) continue;

      // Fetch commodity metadata
      const commodity = await PulseCommodity.findOne({
        where: { commodity_id: commodityId, is_active: true }
      });
      if (!commodity) continue;

      // Fetch 30-day forecast
      const forecast = await PulsePriceForecast.findOne({
        where: { commodity_id: commodityId, horizon_days: 30, is_active: true },
        order: [['forecast_date', 'DESC']]
      });

      // Fetch current price
      const latestPrice = await PulsePriceRecord.findOne({
        where: { commodity_id: commodityId, is_active: true },
        order: [['record_date', 'DESC']]
      });

      if (!forecast || !latestPrice) continue;

      const currentPrice = parseFloat(latestPrice.modal_price || latestPrice.closing_price);
      const predictedPrice = parseFloat(forecast.predicted_price);
      const confidence = parseFloat(forecast.forecast_confidence) / 100; // 0-1
      const riskScore = forecast.risk_score || 50;

      if (currentPrice <= 0) continue;

      // Price change direction and magnitude
      const priceChangePercent = ((predictedPrice - currentPrice) / currentPrice) * 100;

      // Volatility penalty (ultra_high/high volatility = less predictable = higher risk)
      const volatilityPenalty = {
        'ultra_high': -15,
        'high': -10,
        'moderate': -3,
        'low': 0
      }[commodity.volatility_class] || -5;

      // Price direction signal (weighted by confidence)
      let directionSignal = 0;
      if (priceChangePercent > 10) directionSignal = 20 * confidence;       // Strong uptrend
      else if (priceChangePercent > 5) directionSignal = 10 * confidence;   // Moderate uptrend
      else if (priceChangePercent > -5) directionSignal = 0;                // Stable
      else if (priceChangePercent > -10) directionSignal = -15 * confidence; // Moderate downtrend
      else directionSignal = -25 * confidence;                              // Strong downtrend

      // PULSE risk_score signal (1=safe, 100=extreme volatility)
      const pulseRiskPenalty = -Math.round((riskScore / 100) * 10);

      const cycleRiskScore = Math.round(directionSignal + volatilityPenalty + pulseRiskPenalty);

      details.push({
        cycleId: cycle.id,
        commodityId,
        commodityName: commodity.commodity_name,
        currentPrice,
        predictedPrice30d: predictedPrice,
        priceChangePercent: Math.round(priceChangePercent * 10) / 10,
        confidence: Math.round(confidence * 100),
        volatilityClass: commodity.volatility_class,
        riskScore: cycleRiskScore
      });

      totalRiskScore += cycleRiskScore;
      cyclesAnalysed++;
    }

    // Average across all crops and clamp to ±MAX
    const avgRiskScore = cyclesAnalysed > 0 ? totalRiskScore / cyclesAnalysed : 0;
    const adjustment = Math.max(-MAX_PULSE_ADJUSTMENT, Math.min(MAX_PULSE_ADJUSTMENT, Math.round(avgRiskScore)));

    logger.info(`[TRUST/PULSE] Price risk signal for farmer ${farmerId}: ${adjustment} points (${cyclesAnalysed} crops analysed)`);

    return {
      adjustment,
      signal: 'PULSE_PRICE_RISK',
      reason: adjustment > 0 ? 'favorable_price_outlook' : adjustment < 0 ? 'adverse_price_outlook' : 'stable_prices',
      details: {
        cyclesAnalysed,
        crops: details,
        rawScore: Math.round(avgRiskScore),
        clampedAdjustment: adjustment
      }
    };

  } catch (err) {
    logger.error(`[TRUST/PULSE] Price risk signal error: ${err.message}`);
    return { adjustment: 0, signal: 'PULSE_PRICE_RISK', reason: 'calculation_error', details: null };
  }
};

/**
 * Signal #9: DICE Repayment Stress Signal
 * Checks if predicted crop realisation covers loan outstanding.
 *
 * @param {number} farmerId
 * @returns {Promise<Object>} { adjustment, details }
 */
const calculateDiceStressSignal = async (farmerId) => {
  const { LoanApplication, DicePriceRealisationSnapshot } = getDb();

  try {
    // Find active loans
    const activeLoans = await LoanApplication.findAll({
      where: {
        farmer_id: farmerId,
        is_active: true,
        application_status: { [Op.in]: ['disbursed', 'active', 'approved'] }
      }
    });

    if (activeLoans.length === 0) {
      return { adjustment: 0, signal: 'DICE_REPAYMENT_STRESS', reason: 'no_active_loans', details: null };
    }

    // Check latest price realisation snapshot
    const latestSnapshot = await DicePriceRealisationSnapshot.findOne({
      where: { farmer_id: farmerId, is_active: true },
      order: [['snapshot_date', 'DESC']]
    });

    if (!latestSnapshot) {
      return { adjustment: 0, signal: 'DICE_REPAYMENT_STRESS', reason: 'no_realisation_data', details: null };
    }

    const loanOutstanding = parseFloat(latestSnapshot.loan_outstanding || 0);
    const sellNowNet = parseFloat(latestSnapshot.sell_now_net || 0);
    const store30Net = parseFloat(latestSnapshot.store_30d_net || 0);
    const bestNet = Math.max(sellNowNet, store30Net);

    if (loanOutstanding <= 0) {
      return { adjustment: 0, signal: 'DICE_REPAYMENT_STRESS', reason: 'no_outstanding', details: null };
    }

    // Coverage ratio: how much of loan can be covered by best-case sale
    const coverageRatio = bestNet / loanOutstanding;

    let adjustment = 0;
    let reason = 'adequate_coverage';

    if (coverageRatio >= 1.5) {
      adjustment = 15; // Strong surplus — positive signal
      reason = 'strong_surplus';
    } else if (coverageRatio >= 1.0) {
      adjustment = 5; // Adequate coverage
      reason = 'adequate_coverage';
    } else if (coverageRatio >= 0.8) {
      adjustment = -10; // Marginal — mild stress
      reason = 'marginal_coverage';
    } else if (coverageRatio >= 0.5) {
      adjustment = -20; // Significant shortfall
      reason = 'significant_shortfall';
    } else {
      adjustment = -MAX_DICE_STRESS_ADJUSTMENT; // Severe stress
      reason = 'severe_shortfall';
    }

    logger.info(`[TRUST/DICE] Repayment stress signal for farmer ${farmerId}: ${adjustment} points (coverage: ${Math.round(coverageRatio * 100)}%)`);

    return {
      adjustment,
      signal: 'DICE_REPAYMENT_STRESS',
      reason,
      details: {
        loanOutstanding,
        bestCaseRealisation: Math.round(bestNet),
        coverageRatio: Math.round(coverageRatio * 100) / 100,
        recommendedStrategy: latestSnapshot.recommended_strategy,
        snapshotDate: latestSnapshot.snapshot_date
      }
    };

  } catch (err) {
    logger.error(`[TRUST/DICE] Repayment stress signal error: ${err.message}`);
    return { adjustment: 0, signal: 'DICE_REPAYMENT_STRESS', reason: 'calculation_error', details: null };
  }
};

/**
 * Signal #10: PoP Compliance Signal
 * Calculates trust adjustment based on farmer's PoP adherence across active cycles.
 *
 * @param {number} farmerId
 * @returns {Promise<Object>} { adjustment, signal, reason, details }
 */
const calculatePopComplianceSignal = async (farmerId) => {
  const { CultivationCycle, PopComplianceSnapshot, Field, FarmRegister } = getDb();

  try {
    // Find farmer's active cultivation cycles
    const activeCycles = await CultivationCycle.findAll({
      where: {
        cycle_status: { [Op.in]: ['growing', 'monitoring', 'harvesting'] },
        is_active: true,
      },
      include: [{
        model: Field, as: 'field',
        include: [{ model: FarmRegister, as: 'farmRegister', where: { farmer_id: farmerId } }],
      }],
    });

    if (activeCycles.length === 0) {
      return { adjustment: 0, signal: 'POP_COMPLIANCE', reason: 'no_active_cycles', details: null };
    }

    let totalAdjustment = 0;
    let cyclesScored = 0;
    const details = [];

    for (const cycle of activeCycles) {
      const snapshot = await PopComplianceSnapshot.findOne({
        where: { cycle_id: cycle.cycle_uuid, is_active: true },
        order: [['calculated_at', 'DESC']],
      });

      if (!snapshot) continue;

      let cycleAdjustment = 0;
      if (snapshot.compliance_status === 'on_track') {
        cycleAdjustment = 25;
      } else if (snapshot.compliance_status === 'at_risk') {
        cycleAdjustment = -15;
      } else if (snapshot.compliance_status === 'off_track') {
        cycleAdjustment = -35;
      }

      details.push({
        cycleId: cycle.cycle_uuid,
        complianceStatus: snapshot.compliance_status,
        overallScore: snapshot.overall_compliance_score,
        adjustment: cycleAdjustment,
      });

      totalAdjustment += cycleAdjustment;
      cyclesScored++;
    }

    // Average across cycles, clamp to ±MAX
    const avgAdjustment = cyclesScored > 0 ? totalAdjustment / cyclesScored : 0;
    const clampedAdjustment = Math.max(-MAX_POP_COMPLIANCE_ADJUSTMENT, Math.min(MAX_POP_COMPLIANCE_ADJUSTMENT, Math.round(avgAdjustment)));

    const reason = clampedAdjustment > 0 ? 'good_pop_adherence'
      : clampedAdjustment < 0 ? 'poor_pop_adherence'
      : 'neutral_pop_compliance';

    logger.info(`[TRUST/POP] PoP compliance signal for farmer ${farmerId}: ${clampedAdjustment} points (${cyclesScored} cycles scored)`);

    return {
      adjustment: clampedAdjustment,
      signal: 'POP_COMPLIANCE',
      reason,
      details: {
        cyclesScored,
        cycles: details,
        rawAverage: Math.round(avgAdjustment),
        clampedAdjustment,
      },
    };
  } catch (err) {
    logger.error(`[TRUST/POP] PoP compliance signal error: ${err.message}`);
    return { adjustment: 0, signal: 'POP_COMPLIANCE', reason: 'calculation_error', details: null };
  }
};

/**
 * Signal #11: SENTINEL Income Diversification Signal
 * Evaluates agricultural income stream diversity and stability.
 *
 * Logic:
 *   - Count distinct agricultural stream types (crop, dairy, fisheries, horticulture)
 *     4+ types: +30,  3 types: +20,  2 types: +10,  1 type: 0,  0 types: -15
 *   - Factor in income stability ratings:
 *     very_stable: +5,  stable: +2,  moderate: 0,  unstable: -5
 *
 * @param {number} farmerId
 * @returns {Promise<Object>} { adjustment, signal, reason, details }
 */
const calculateIncomeDiversificationSignal = async (farmerId) => {
  const { FarmerIncomeStream } = getDb();

  try {
    const streams = await FarmerIncomeStream.findAll({
      where: {
        farmer_id: farmerId,
        is_active: true,
      },
    });

    if (streams.length === 0) {
      return { adjustment: -15, signal: 'SENTINEL_INCOME_DIVERSIFICATION', reason: 'no_income_streams', details: null };
    }

    // Count distinct agricultural stream types
    const agriTypes = new Set(['crop', 'dairy', 'fisheries', 'horticulture']);
    const distinctAgriStreams = new Set();
    for (const stream of streams) {
      const streamType = (stream.stream_type || '').toLowerCase();
      if (agriTypes.has(streamType)) {
        distinctAgriStreams.add(streamType);
      }
    }

    const typeCount = distinctAgriStreams.size;

    // Diversification score based on distinct agricultural types
    let diversificationScore = 0;
    let reason = 'single_stream';
    if (typeCount >= 4) {
      diversificationScore = 30;
      reason = 'quad_diversified';
    } else if (typeCount === 3) {
      diversificationScore = 20;
      reason = 'triple_diversified';
    } else if (typeCount === 2) {
      diversificationScore = 10;
      reason = 'double_diversified';
    } else if (typeCount === 1) {
      diversificationScore = 0;
      reason = 'single_stream';
    } else {
      diversificationScore = -15;
      reason = 'no_agri_streams';
    }

    // Factor in income stability ratings
    const stabilityBonusMap = {
      'very_stable': 5,
      'stable': 2,
      'moderate': 0,
      'unstable': -5,
    };
    let stabilityTotal = 0;
    let stabilityCount = 0;
    for (const stream of streams) {
      const rating = (stream.stability_rating || 'moderate').toLowerCase();
      if (stabilityBonusMap[rating] !== undefined) {
        stabilityTotal += stabilityBonusMap[rating];
        stabilityCount++;
      }
    }
    const avgStabilityBonus = stabilityCount > 0 ? Math.round(stabilityTotal / stabilityCount) : 0;

    const rawScore = diversificationScore + avgStabilityBonus;
    const adjustment = Math.max(-MAX_INCOME_DIVERSIFICATION_ADJUSTMENT, Math.min(MAX_INCOME_DIVERSIFICATION_ADJUSTMENT, rawScore));

    logger.info(`[TRUST/SENTINEL] Income diversification signal for farmer ${farmerId}: ${adjustment} points (${typeCount} agri types, avg stability bonus ${avgStabilityBonus})`);

    return {
      adjustment,
      signal: 'SENTINEL_INCOME_DIVERSIFICATION',
      reason,
      details: {
        totalStreams: streams.length,
        distinctAgriTypes: Array.from(distinctAgriStreams),
        typeCount,
        diversificationScore,
        avgStabilityBonus,
        rawScore,
        clampedAdjustment: adjustment,
      },
    };
  } catch (err) {
    logger.error(`[TRUST/SENTINEL] Income diversification signal error: ${err.message}`);
    return { adjustment: 0, signal: 'SENTINEL_INCOME_DIVERSIFICATION', reason: 'calculation_error', details: null };
  }
};

/**
 * Signal #12: SAGE Advisory Compliance Signal
 * Evaluates farmer's engagement with advisory content.
 *
 * Logic:
 *   - Calculate acknowledgement rate = acknowledged / total delivered
 *     >80%: +20,  60-80%: +10,  40-60%: 0,  20-40%: -10,  <20%: -20
 *   - Bonus: if any action_taken_by_farmer = true, +5
 *
 * @param {number} farmerId
 * @returns {Promise<Object>} { adjustment, signal, reason, details }
 */
const calculateSageComplianceSignal = async (farmerId) => {
  const { SageAdvisory } = getDb();

  try {
    const advisories = await SageAdvisory.findAll({
      where: {
        farmer_id: farmerId,
        is_active: true,
        delivered_at: { [Op.ne]: null },
      },
    });

    if (advisories.length === 0) {
      return { adjustment: 0, signal: 'SAGE_ADVISORY_COMPLIANCE', reason: 'no_delivered_advisories', details: null };
    }

    const totalDelivered = advisories.length;
    const acknowledgedCount = advisories.filter((a) => a.acknowledged_at != null || a.is_acknowledged === true).length;
    const acknowledgementRate = (acknowledgedCount / totalDelivered) * 100;

    // Acknowledgement rate scoring
    let rateScore = 0;
    let reason = 'moderate_engagement';
    if (acknowledgementRate > 80) {
      rateScore = 20;
      reason = 'high_engagement';
    } else if (acknowledgementRate > 60) {
      rateScore = 10;
      reason = 'good_engagement';
    } else if (acknowledgementRate > 40) {
      rateScore = 0;
      reason = 'moderate_engagement';
    } else if (acknowledgementRate > 20) {
      rateScore = -10;
      reason = 'low_engagement';
    } else {
      rateScore = -20;
      reason = 'very_low_engagement';
    }

    // Bonus for action taken
    const anyActionTaken = advisories.some((a) => a.action_taken_by_farmer === true);
    const actionBonus = anyActionTaken ? 5 : 0;

    const rawScore = rateScore + actionBonus;
    const adjustment = Math.max(-MAX_SAGE_COMPLIANCE_ADJUSTMENT, Math.min(MAX_SAGE_COMPLIANCE_ADJUSTMENT, rawScore));

    logger.info(`[TRUST/SAGE] Advisory compliance signal for farmer ${farmerId}: ${adjustment} points (${Math.round(acknowledgementRate)}% acknowledged, action bonus ${actionBonus})`);

    return {
      adjustment,
      signal: 'SAGE_ADVISORY_COMPLIANCE',
      reason,
      details: {
        totalDelivered,
        acknowledgedCount,
        acknowledgementRate: Math.round(acknowledgementRate * 10) / 10,
        anyActionTaken,
        rateScore,
        actionBonus,
        rawScore,
        clampedAdjustment: adjustment,
      },
    };
  } catch (err) {
    logger.error(`[TRUST/SAGE] Advisory compliance signal error: ${err.message}`);
    return { adjustment: 0, signal: 'SAGE_ADVISORY_COMPLIANCE', reason: 'calculation_error', details: null };
  }
};

/**
 * Calculate all external signal adjustments for a farmer.
 * Called by the scoring engine after base section scoring.
 *
 * @param {number} farmerId
 * @returns {Promise<Object>} { totalAdjustment, signals }
 */

/**
 * Signal #6: Identity-Address Quality
 * Scores based on multi-level validation status across all data targets.
 * Higher validation levels = more trusted identity = positive adjustment.
 */
const calculateIdentityAddressSignal = async (farmerId) => {
  try {
    const { computeCompositeConfidence } = require('../../farmer/services/validationTrackingService');
    const { FarmerNameRecord } = getDb();

    const compositeConfidence = await computeCompositeConfidence(farmerId);

    // Base adjustment from validation levels: 0-100 confidence maps to -20..+40
    let adjustment = Math.round((compositeConfidence / 100) * 60) - 20;

    const details = [`Composite confidence: ${compositeConfidence.toFixed(1)}`];

    // Penalty: name match confidence < 60
    const nameRecord = await FarmerNameRecord.findOne({
      where: { farmer_id: farmerId, is_active: true },
    });
    if (nameRecord && nameRecord.name_match_confidence !== null && parseFloat(nameRecord.name_match_confidence) < 60) {
      adjustment -= 10;
      details.push(`Low name confidence: ${nameRecord.name_match_confidence} (-10)`);
    }

    // Clamp to ±MAX
    adjustment = Math.max(-MAX_IDENTITY_ADDRESS_ADJUSTMENT, Math.min(MAX_IDENTITY_ADDRESS_ADJUSTMENT, adjustment));

    return { adjustment, signal: 'IDENTITY_ADDRESS_QUALITY', reason: details.join('; '), details: { compositeConfidence } };
  } catch (error) {
    logger.warn('Identity-address signal calculation failed', { farmerId, error: error.message });
    return { adjustment: 0, signal: 'IDENTITY_ADDRESS_QUALITY', reason: 'calculation_error', details: null };
  }
};

/**
 * Signal #7: Borrowing Health
 * Evaluates formal vs informal debt ratio, overdue sources, credit history breadth.
 */
const calculateBorrowingHealthSignal = async (farmerId) => {
  try {
    const { getDebtHealthSignal } = require('../../farmer/services/borrowingSourceService');
    return await getDebtHealthSignal(farmerId);
  } catch (error) {
    logger.warn('Borrowing health signal calculation failed', { farmerId, error: error.message });
    return { adjustment: 0, signal: 'BORROWING_HEALTH', reason: 'calculation_error', details: null };
  }
};

const calculateExternalSignals = async (farmerId) => {
  const [pulseSignal, diceSignal, popSignal, incomeDivSignal, sageSignal, identitySignal, borrowingSignal] = await Promise.all([
    calculatePulseRiskSignal(farmerId),
    calculateDiceStressSignal(farmerId),
    calculatePopComplianceSignal(farmerId),
    calculateIncomeDiversificationSignal(farmerId),
    calculateSageComplianceSignal(farmerId),
    calculateIdentityAddressSignal(farmerId),
    calculateBorrowingHealthSignal(farmerId),
  ]);

  const totalAdjustment = pulseSignal.adjustment + diceSignal.adjustment + popSignal.adjustment
    + incomeDivSignal.adjustment + sageSignal.adjustment
    + identitySignal.adjustment + borrowingSignal.adjustment;

  return {
    totalAdjustment,
    signals: {
      PULSE_PRICE_RISK: pulseSignal,
      DICE_REPAYMENT_STRESS: diceSignal,
      POP_COMPLIANCE: popSignal,
      SENTINEL_INCOME_DIVERSIFICATION: incomeDivSignal,
      SAGE_ADVISORY_COMPLIANCE: sageSignal,
      IDENTITY_ADDRESS_QUALITY: identitySignal,
      BORROWING_HEALTH: borrowingSignal,
    }
  };
};

module.exports = {
  calculatePulseRiskSignal,
  calculateDiceStressSignal,
  calculatePopComplianceSignal,
  calculateIncomeDiversificationSignal,
  calculateSageComplianceSignal,
  calculateIdentityAddressSignal,
  calculateBorrowingHealthSignal,
  calculateExternalSignals,
};
