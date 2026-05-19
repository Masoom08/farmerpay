/**
 * ROOTS × PULSE Integration Service
 *
 * Combines cost-of-production data from ROOTS with market prices and
 * forecasts from PULSE to generate personalized sell/store/split
 * recommendations, factoring in loan EMI obligations and storage costs.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/* ====================================================================
 * 1. getBreakEvenPrice
 * ==================================================================== */

const getBreakEvenPrice = async (farmerId, cycleId) => {
  const {
    CultivationCycle, CultivationCycleExpenseSummary, HarvestRecord,
    TaskExecutionInputLog, TaskExecutionLaborLog, TaskExecutionMachineryLog,
    WorkbandExecution, TaskExecution, Field,
  } = getDb();

  const cycle = await CultivationCycle.findByPk(cycleId);
  if (!cycle || cycle.farmer_id !== farmerId) {
    const err = new Error('Cycle not found'); err.statusCode = 404; throw err;
  }

  // Try expense summary first (pre-computed)
  let totalCost = 0;
  const expSummary = await CultivationCycleExpenseSummary.findOne({
    where: { cycle_id: cycle.cycle_uuid, is_active: true },
    order: [['last_updated_at', 'DESC']],
  });

  if (expSummary) {
    totalCost = parseFloat(expSummary.total_expenses || 0);
  } else {
    // Compute from raw logs
    const [costResult] = await getDb().sequelize.query(`
      SELECT
        COALESCE(SUM(til.input_cost), 0) AS input_cost,
        COALESCE(SUM(tll.total_labor_cost), 0) AS labor_cost,
        COALESCE(SUM(tml.machinery_hire_cost), 0) AS machinery_cost
      FROM workband_executions we
      JOIN task_executions te ON te.workband_execution_id = we.id AND te.is_active = 1
      LEFT JOIN task_execution_input_logs til ON til.task_execution_id = te.id AND til.is_active = 1
      LEFT JOIN task_execution_labor_logs tll ON tll.task_execution_id = te.id AND tll.is_active = 1
      LEFT JOIN task_execution_machinery_logs tml ON tml.task_execution_id = te.id AND tml.is_active = 1
      WHERE we.cycle_id = :cycleUuid AND we.is_active = 1
    `, { replacements: { cycleUuid: cycle.cycle_uuid } });

    totalCost = parseFloat(costResult[0]?.input_cost || 0)
      + parseFloat(costResult[0]?.labor_cost || 0)
      + parseFloat(costResult[0]?.machinery_cost || 0);
  }

  // Get yield from harvest
  const harvest = await HarvestRecord.findOne({
    where: { cycle_id: cycle.cycle_uuid, is_active: true },
    order: [['created_at', 'DESC']],
  });
  const totalYieldKg = harvest ? parseInt(harvest.total_harvest_quantity_kg || 0, 10) : 0;

  // Cost per acre
  let costPerAcre = null;
  if (cycle.field_id) {
    const field = await Field.findByPk(cycle.field_id, { attributes: ['field_size_hectares'] });
    if (field && field.field_size_hectares > 0) {
      const acres = parseFloat(field.field_size_hectares) * 2.471;
      costPerAcre = acres > 0 ? Math.round((totalCost / acres) * 100) / 100 : null;
    }
  }

  const breakEvenPrice = totalYieldKg > 0
    ? Math.round((totalCost / totalYieldKg) * 100) / 100
    : null;

  return {
    breakEvenPrice,
    totalCost: Math.round(totalCost * 100) / 100,
    totalYieldKg,
    costPerAcre,
    cycleId,
    cropName: cycle.self_declared_crop || cycle.crop_id || null,
  };
};

/* ====================================================================
 * 2. getPersonalizedSellRecommendation
 * ==================================================================== */

const getPersonalizedSellRecommendation = async (farmerId, cycleId) => {
  const {
    CultivationCycle, PulsePriceRecord, PulsePriceForecast, PulseCommodity,
    LoanApplication, LoanRepaymentSchedule, CropMaster,
  } = getDb();

  // Step 1: Break-even price
  const breakeven = await getBreakEvenPrice(farmerId, cycleId);

  // Step 2: Resolve commodity for price lookup
  const cycle = await CultivationCycle.findByPk(cycleId);
  let commodityId = null;
  if (cycle?.crop_id) {
    const crop = await CropMaster.findOne({ where: { crop_uuid: cycle.crop_id } }).catch(() => null);
    if (crop) {
      const commodity = await PulseCommodity.findOne({
        where: { commodity_name: { [Op.like]: `%${crop.crop_name || ''}%` }, is_active: true },
      }).catch(() => null);
      if (commodity) commodityId = commodity.id;
    }
  }

  // Step 3: Current mandi price
  let currentPrice = null;
  if (commodityId) {
    const priceRecord = await PulsePriceRecord.findOne({
      where: { commodity_id: commodityId, is_active: true },
      order: [['record_date', 'DESC']],
    }).catch(() => null);
    currentPrice = priceRecord ? parseFloat(priceRecord.modal_price || priceRecord.closing_price || 0) : null;
  }

  // Step 4: 30-day forecast
  let forecastPrice = null;
  if (commodityId) {
    const forecast = await PulsePriceForecast.findOne({
      where: { commodity_id: commodityId, horizon_days: 30, is_active: true },
      order: [['forecast_date', 'DESC']],
    }).catch(() => null);
    forecastPrice = forecast ? parseFloat(forecast.predicted_price || 0) : null;
  }

  // Step 5: EMI context
  let emiDueDate = null;
  let emiAmount = null;
  try {
    const loan = await LoanApplication.findOne({
      where: {
        farmer_id: farmerId, is_active: true,
        application_status: { [Op.in]: ['disbursed', 'active'] },
      },
      order: [['created_at', 'DESC']],
    });

    if (loan) {
      const nextEmi = await LoanRepaymentSchedule.findOne({
        where: {
          application_id: loan.id, is_active: true,
          due_date: { [Op.gte]: new Date().toISOString().slice(0, 10) },
          status: { [Op.in]: ['pending', 'overdue'] },
        },
        order: [['due_date', 'ASC']],
      }).catch(() => null);

      if (nextEmi) {
        emiDueDate = nextEmi.due_date;
        emiAmount = parseFloat(nextEmi.emi_amount || nextEmi.due_amount || 0);
      }
    }
  } catch {}

  // Step 6: Storage cost estimate (₹3/qtl/day average for Indian warehouses)
  const storageCostPerQtlPerDay = 3;
  const storageDays = 30;
  const storageCost = breakeven.totalYieldKg > 0
    ? Math.round(((breakeven.totalYieldKg / 100) * storageCostPerQtlPerDay * storageDays) * 100) / 100
    : 0;

  // Step 7: Generate recommendation
  const recommendation = generateRecommendation({
    breakEvenPrice: breakeven.breakEvenPrice,
    currentPrice,
    forecastPrice,
    emiDueDate,
    emiAmount,
    totalYieldKg: breakeven.totalYieldKg,
    storageCost,
  });

  return {
    recommendation: recommendation.text,
    recommendationType: recommendation.type,
    breakEvenPrice: breakeven.breakEvenPrice,
    currentPrice,
    forecastPrice,
    storageCost,
    emiDueDate,
    emiAmount,
    totalCost: breakeven.totalCost,
    totalYieldKg: breakeven.totalYieldKg,
    costPerAcre: breakeven.costPerAcre,
    cropName: breakeven.cropName,
    suggestedSellQty: recommendation.sellQty,
    suggestedStoreQty: recommendation.storeQty,
    profitMarginPct: recommendation.profitMarginPct,
    forecastGainPct: recommendation.forecastGainPct,
  };
};

const generateRecommendation = ({ breakEvenPrice, currentPrice, forecastPrice, emiDueDate, emiAmount, totalYieldKg, storageCost }) => {
  if (!breakEvenPrice || !currentPrice || totalYieldKg <= 0) {
    return { type: 'INSUFFICIENT_DATA', text: 'Not enough data to generate recommendation. Complete your harvest and cost entries.', sellQty: 0, storeQty: 0, profitMarginPct: null, forecastGainPct: null };
  }

  const profitMarginPct = Math.round(((currentPrice - breakEvenPrice) / breakEvenPrice) * 100 * 10) / 10;
  const forecastGainPct = forecastPrice && currentPrice
    ? Math.round(((forecastPrice - currentPrice) / currentPrice) * 100 * 10) / 10
    : null;

  // Check if EMI is urgent
  const emiUrgent = emiDueDate && emiAmount;
  let daysToEmi = null;
  if (emiDueDate) {
    daysToEmi = Math.round((new Date(emiDueDate).getTime() - Date.now()) / 86400000);
  }

  // Case 1: Good margin + no urgent EMI → consider storing if forecast is higher
  if (profitMarginPct >= 30 && (!emiUrgent || daysToEmi > 15)) {
    if (forecastGainPct && forecastGainPct > 10) {
      // Store some, sell some
      const storeQty = Math.round(totalYieldKg * 0.6);
      const sellQty = totalYieldKg - storeQty;
      const expectedGain = Math.round((forecastPrice - currentPrice) * (storeQty / 1000) * 10) / 10;
      return {
        type: 'SPLIT',
        text: `Good time to sell ${sellQty}kg now (${profitMarginPct}% profit). Store ${storeQty}kg for 30 days — forecast shows ${forecastGainPct}% gain (est. ₹${expectedGain} more).`,
        sellQty, storeQty, profitMarginPct, forecastGainPct,
      };
    }
    return {
      type: 'SELL_NOW',
      text: `Good time to sell. Profit margin: ${profitMarginPct}%. Current price ₹${currentPrice}/kg vs your cost ₹${breakEvenPrice}/kg.`,
      sellQty: totalYieldKg, storeQty: 0, profitMarginPct, forecastGainPct,
    };
  }

  // Case 2: EMI urgent → sell enough to cover EMI
  if (emiUrgent && daysToEmi <= 15) {
    const qtyForEmi = currentPrice > 0 ? Math.ceil(emiAmount / currentPrice) : totalYieldKg;
    const sellQty = Math.min(qtyForEmi, totalYieldKg);
    const storeQty = totalYieldKg - sellQty;
    return {
      type: 'SELL_FOR_EMI',
      text: `Sell ${sellQty}kg now to cover EMI of ₹${emiAmount} due in ${daysToEmi} days.${storeQty > 0 ? ` Store remaining ${storeQty}kg.` : ''}`,
      sellQty, storeQty, profitMarginPct, forecastGainPct,
    };
  }

  // Case 3: Below break-even but forecast shows improvement → store
  if (profitMarginPct < 0 && forecastGainPct && forecastGainPct > 15) {
    return {
      type: 'STORE',
      text: `Current price ₹${currentPrice}/kg is below your cost ₹${breakEvenPrice}/kg. Forecast shows ${forecastGainPct}% rise in 30 days. Consider storing if possible (est. cost ₹${storageCost}).`,
      sellQty: 0, storeQty: totalYieldKg, profitMarginPct, forecastGainPct,
    };
  }

  // Case 4: Moderate margin
  if (profitMarginPct > 0) {
    return {
      type: 'SELL_NOW',
      text: `Sell now with ${profitMarginPct}% profit margin. Current price ₹${currentPrice}/kg is above your cost of ₹${breakEvenPrice}/kg.`,
      sellQty: totalYieldKg, storeQty: 0, profitMarginPct, forecastGainPct,
    };
  }

  // Case 5: Below break-even, no positive forecast
  return {
    type: 'HOLD',
    text: `Current price ₹${currentPrice}/kg is below your cost ₹${breakEvenPrice}/kg (${profitMarginPct}%). ${forecastGainPct && forecastGainPct > 0 ? `Prices may improve ${forecastGainPct}% in 30 days.` : 'Prices not expected to improve soon. Consider selling in smaller quantities at different mandis.'}`,
    sellQty: 0, storeQty: totalYieldKg, profitMarginPct, forecastGainPct,
  };
};

/* ====================================================================
 * 3. getYieldAdjustmentFactor
 * ==================================================================== */

const getYieldAdjustmentFactor = async (farmerId, cycleId) => {
  const { RootsComplianceSnapshot, RootsRedFlag } = getDb();

  let factor = 1.0;
  const reasons = [];

  // Get compliance score
  const snapshot = await RootsComplianceSnapshot.findOne({
    where: { farmer_id: farmerId, activity_reference_id: cycleId, is_active: true },
    order: [['snapshot_date', 'DESC']],
  });

  if (snapshot && snapshot.data_completeness_pct >= 40) {
    const score = parseFloat(snapshot.overall_compliance_score || 0);
    if (score >= 85) {
      factor *= 1.05;
      reasons.push('High compliance (>85%) — yield likely above average');
    } else if (score >= 70) {
      // factor stays 1.00
      reasons.push('Good compliance (70-85%) — yield on track');
    } else if (score >= 50) {
      factor *= 0.85;
      reasons.push('Moderate compliance (50-70%) — yield may be 15% below potential');
    } else {
      factor *= 0.70;
      reasons.push('Low compliance (<50%) — yield likely 30% below potential');
    }

    // Timing penalty
    const timingScore = parseFloat(snapshot.timing_compliance_score || 100);
    if (timingScore < 50) {
      factor *= 0.92;
      reasons.push('Late sowing/stage execution — timing penalty');
    }

    // Missed fertilization penalty
    if (snapshot.missed_stages > 0) {
      factor *= 0.88;
      reasons.push(`${snapshot.missed_stages} stage(s) missed — yield impact`);
    }
  }

  // Check for pest/disease red flags
  const pestFlags = await RootsRedFlag.findAll({
    where: {
      farmer_id: farmerId,
      activity_reference_id: cycleId,
      flag_type: { [Op.in]: ['DISTRESS_SIGNAL', 'MORTALITY_SPIKE'] },
      is_active: true,
    },
    attributes: ['flag_type'],
  }).catch(() => []);

  if (pestFlags.length > 0) {
    factor *= 0.90;
    reasons.push('Pest/disease event detected — 10% yield reduction estimated');
  }

  return {
    factor: Math.round(factor * 100) / 100,
    reasons,
    complianceScore: snapshot ? parseFloat(snapshot.overall_compliance_score || 0) : null,
  };
};

module.exports = {
  getBreakEvenPrice,
  getPersonalizedSellRecommendation,
  getYieldAdjustmentFactor,
};
