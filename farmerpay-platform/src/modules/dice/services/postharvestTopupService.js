/**
 * Post-Harvest Top-Up Service
 * Manages top-up loans hypothecated against stored produce via DICE x PULSE integration.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Apply for a post-harvest top-up loan.
 */
const applyForTopup = async ({
  farmerId, parentLoanApplicationId, commodityId,
  produceQuantityQuintals, produceGrade, warehouseId,
  warehouseReceiptNumber, requestedLoanAmount, requestedTenureDays
}) => {
  const {
    DiceWarehouseRegistry, DicePostharvestTopupLoan, DiceProduceHypothecationLog,
    PulsePriceRecord, PulsePriceForecast
  } = getDb();

  // 1. Validate warehouse
  const warehouse = await DiceWarehouseRegistry.findOne({
    where: { id: warehouseId, is_active: true, enwr_enabled: true }
  });
  if (!warehouse) {
    const err = new Error('Invalid or non-eNWR warehouse');
    err.statusCode = 400;
    err.errorCode = 'DICE_010';
    throw err;
  }

  // 2. Get current mandi price for valuation
  const latestPrice = await PulsePriceRecord.findOne({
    where: { commodity_id: commodityId, is_active: true },
    order: [['record_date', 'DESC']]
  });
  const valuationPrice = latestPrice
    ? parseFloat(latestPrice.modal_price || latestPrice.closing_price)
    : 0;
  if (valuationPrice <= 0) {
    const err = new Error('Cannot determine produce valuation');
    err.statusCode = 400;
    err.errorCode = 'PULSE_003';
    throw err;
  }

  const produceValue = valuationPrice * produceQuantityQuintals;
  const maxLTV = 0.70;
  const maxEligible = Math.round(produceValue * maxLTV);

  // 3. Validate requested amount
  const approvedAmount = Math.min(requestedLoanAmount, maxEligible);
  const ltvApplied = approvedAmount / produceValue;

  // 4. Get PULSE forecast snapshot
  const forecasts = await PulsePriceForecast.findAll({
    where: { commodity_id: commodityId, is_active: true },
    order: [['forecast_date', 'DESC']],
    limit: 3
  });
  const forecastSnapshot = forecasts.map(f => ({
    horizonDays: f.horizon_days,
    predictedPrice: parseFloat(f.predicted_price),
    confidence: parseFloat(f.forecast_confidence)
  }));

  // 5. Calculate rates
  const baseRate = 7.0;
  const subventionRate = 3.0;
  const effectiveRate = Math.max(baseRate - subventionRate, 4.0);

  // 6. Calculate dates
  const disbursementDate = new Date();
  const maturityDate = new Date();
  maturityDate.setDate(maturityDate.getDate() + (requestedTenureDays || 90));

  // Determine recommended sell window from PULSE
  const bestForecast = forecasts.reduce((best, f) => {
    const fp = parseFloat(f.predicted_price);
    if (!best || fp > parseFloat(best.predicted_price)) return f;
    return best;
  }, null);
  const recommendedWindow = bestForecast
    ? `Sell within ${bestForecast.horizon_days} days`
    : 'Monitor prices daily';

  // 7. Create topup loan record
  const topup = await DicePostharvestTopupLoan.create({
    topup_uuid: generateUUID(),
    farmer_id: farmerId,
    parent_loan_application_id: parentLoanApplicationId,
    commodity_id: commodityId,
    produce_quantity_quintals: produceQuantityQuintals,
    produce_grade: produceGrade,
    produce_valuation_price: valuationPrice,
    produce_total_value: produceValue,
    topup_loan_amount: approvedAmount,
    ltv_ratio: Math.round(ltvApplied * 100) / 100,
    interest_rate_annual: baseRate,
    interest_subvention_applicable: true,
    effective_interest_rate: effectiveRate,
    loan_tenure_days: requestedTenureDays || 90,
    disbursement_date: disbursementDate,
    maturity_date: maturityDate,
    loan_status: 'applied',
    warehouse_id: warehouseId,
    warehouse_receipt_number: warehouseReceiptNumber,
    enwr_verified: false,
    storage_cost_per_quintal_per_day: parseFloat(warehouse.storage_rate_per_quintal_per_day),
    amount_outstanding: approvedAmount,
    pulse_forecast_at_application: forecastSnapshot,
    recommended_sell_window: recommendedWindow
  });

  // 8. Create initial hypothecation log
  await DiceProduceHypothecationLog.create({
    log_uuid: generateUUID(),
    topup_loan_id: topup.id,
    log_date: new Date(),
    event_type: 'deposit',
    quantity_quintals: produceQuantityQuintals,
    price_per_quintal: valuationPrice,
    total_value: produceValue,
    current_ltv_ratio: ltvApplied,
    margin_call_triggered: false,
    notes: `Initial deposit: ${produceQuantityQuintals} qtl of ${commodityId} at ${warehouseReceiptNumber}`
  });

  logger.info(`Post-harvest topup loan applied: farmer ${farmerId}, amount ${approvedAmount}, warehouse ${warehouseId}`);

  return {
    topupId: topup.id,
    topupUuid: topup.topup_uuid,
    status: 'applied',
    maxEligible,
    approvedAmount,
    ltvApplied: Math.round(ltvApplied * 100) / 100,
    effectiveRate,
    maturityDate,
    recommendedSellWindow: recommendedWindow
  };
};

/**
 * Get topup loan details with hypothecation logs and current PULSE forecast.
 */
const getTopupDetails = async (topupId, farmerId) => {
  const { DicePostharvestTopupLoan, DiceProduceHypothecationLog, PulsePriceForecast } = getDb();

  const topup = await DicePostharvestTopupLoan.findOne({
    where: { id: topupId, farmer_id: farmerId, is_active: true },
    include: [{ model: DiceProduceHypothecationLog, as: 'hypothecationLogs', where: { is_active: true }, required: false }]
  });
  if (!topup) {
    const err = new Error('Topup loan not found');
    err.statusCode = 404;
    err.errorCode = 'DICE_011';
    throw err;
  }

  // Current PULSE forecast
  const currentForecast = await PulsePriceForecast.findAll({
    where: { commodity_id: topup.commodity_id, is_active: true },
    order: [['forecast_date', 'DESC']],
    limit: 3
  });

  const currentProduceValue = parseFloat(topup.produce_valuation_price) * parseFloat(topup.produce_quantity_quintals);
  const currentLTV = parseFloat(topup.amount_outstanding) / (currentProduceValue || 1);
  const daysRemaining = Math.max(0, Math.ceil((new Date(topup.maturity_date) - new Date()) / (1000 * 60 * 60 * 24)));

  return {
    topupLoan: topup,
    hypothecationLogs: topup.hypothecationLogs || [],
    currentLTV: Math.round(currentLTV * 100) / 100,
    currentProduceValue: Math.round(currentProduceValue),
    daysRemaining,
    amountOutstanding: parseFloat(topup.amount_outstanding),
    pulseCurrentForecast: currentForecast.map(f => ({
      horizonDays: f.horizon_days,
      predictedPrice: parseFloat(f.predicted_price),
      confidence: parseFloat(f.forecast_confidence)
    }))
  };
};

/**
 * List all topup loans for a farmer.
 */
const listFarmerTopups = async (farmerId) => {
  const { DicePostharvestTopupLoan, PulseCommodity } = getDb();

  const topups = await DicePostharvestTopupLoan.findAll({
    where: { farmer_id: farmerId, is_active: true },
    include: [{ model: PulseCommodity, as: 'commodity', attributes: ['commodity_name', 'commodity_type'] }],
    order: [['created_at', 'DESC']]
  });

  return topups.map(t => ({
    topupId: t.id,
    commodity: t.commodity?.commodity_name,
    quantity: parseFloat(t.produce_quantity_quintals),
    loanAmount: parseFloat(t.topup_loan_amount),
    status: t.loan_status,
    currentProduceValue: parseFloat(t.produce_valuation_price) * parseFloat(t.produce_quantity_quintals),
    currentLTV: parseFloat(t.ltv_ratio),
    maturityDate: t.maturity_date
  }));
};

/**
 * Release produce (partial or full) when farmer sells.
 * Auto-repay the topup loan from sale proceeds.
 */
const releaseAndRepay = async ({ topupId, farmerId, releaseType, quantityQuintals, salePrice, mandiId, idempotencyKey }) => {
  const { DicePostharvestTopupLoan, DiceProduceHypothecationLog, sequelize } = getDb();

  // Idempotency guard: if the same release was already recorded (same
  // quintals + price + mandi + topup within the last hour), return the
  // prior log instead of applying the repayment twice. Explicit
  // idempotencyKey (from X-Idempotency-Key header) wins when supplied.
  if (idempotencyKey) {
    const prior = await DiceProduceHypothecationLog.findOne({
      where: { topup_loan_id: topupId, notes: { [require('sequelize').Op.like]: `%${idempotencyKey}%` } },
    });
    if (prior) {
      logger.info(`Topup release replay (key=${idempotencyKey}) for topup ${topupId}; returning prior log`);
      return {
        releaseLog: prior,
        repaymentAmount: parseFloat(prior.total_value),
        farmerReceives: 0,
        newOutstanding: null,
        produceRemaining: null,
        topupStatus: 'replayed',
      };
    }
  }

  const txn = await sequelize.transaction();
  let repaymentAmount;
  let newOutstanding;
  let remainingQty;
  let farmerReceives;
  let log;

  try {
    const where = { id: topupId, is_active: true };
    if (farmerId) where.farmer_id = farmerId; // Verify ownership when called from API
    const topup = await DicePostharvestTopupLoan.findOne({ where, lock: txn.LOCK.UPDATE, transaction: txn });
    if (!topup || topup.loan_status === 'closed') {
      const err = new Error('Invalid topup loan');
      err.statusCode = 400;
      err.errorCode = 'DICE_012';
      throw err;
    }

    const releasedValue = salePrice * quantityQuintals;
    remainingQty = parseFloat(topup.produce_quantity_quintals) - quantityQuintals;
    const outstanding = parseFloat(topup.amount_outstanding);

    // Calculate how much goes to loan repayment
    repaymentAmount = Math.min(releasedValue, outstanding);
    newOutstanding = outstanding - repaymentAmount;
    farmerReceives = releasedValue - repaymentAmount;

    // Update topup loan
    await topup.update({
      produce_quantity_quintals: remainingQty,
      amount_repaid: parseFloat(topup.amount_repaid) + repaymentAmount,
      amount_outstanding: newOutstanding,
      loan_status: newOutstanding <= 0 ? 'closed' : 'partially_repaid'
    }, { transaction: txn });

    // Log the release — include idempotency key if provided so future
    // replays can be detected.
    log = await DiceProduceHypothecationLog.create({
      log_uuid: generateUUID(),
      topup_loan_id: topupId,
      log_date: new Date(),
      event_type: releaseType === 'full' ? 'full_release' : 'partial_release',
      quantity_quintals: quantityQuintals,
      price_per_quintal: salePrice,
      total_value: releasedValue,
      current_ltv_ratio: remainingQty > 0 ? newOutstanding / (salePrice * remainingQty) : 0,
      notes: `Sold ${quantityQuintals} qtl at ₹${salePrice}/qtl at mandi ${mandiId}. Repaid ₹${repaymentAmount}.${idempotencyKey ? ` [idem:${idempotencyKey}]` : ''}`
    }, { transaction: txn });
    await txn.commit();
  } catch (err) {
    await txn.rollback();
    throw err;
  }

  logger.info(`Topup loan ${topupId}: released ${quantityQuintals} qtl, repaid ₹${repaymentAmount}, outstanding ₹${newOutstanding}`);

  return {
    releaseLog: log,
    repaymentAmount,
    farmerReceives,
    newOutstanding,
    produceRemaining: remainingQty,
    topupStatus: newOutstanding <= 0 ? 'closed' : 'partially_repaid'
  };
};

/**
 * List nearby warehouses for produce storage.
 */
const listWarehouses = async ({ districtId, stateId, enwr, coldStorage }) => {
  const { DiceWarehouseRegistry } = getDb();

  const where = { is_active: true };
  if (districtId) where.district_id = districtId;
  if (stateId) where.state_id = stateId;
  if (enwr) where.enwr_enabled = true;
  if (coldStorage) where.cold_storage_available = true;

  const warehouses = await DiceWarehouseRegistry.findAll({
    where,
    order: [['available_capacity_tonnes', 'DESC']],
    limit: 20
  });

  return warehouses.map(wh => ({
    warehouseId: wh.id,
    name: wh.warehouse_name,
    type: wh.warehouse_type,
    distanceKm: null, // TODO: calculate from farmer lat/lng
    storageRate: parseFloat(wh.storage_rate_per_quintal_per_day),
    capacityAvailable: wh.available_capacity_tonnes,
    enwr: wh.enwr_enabled,
    coldStorage: wh.cold_storage_available,
    gradingAvailable: wh.grading_facility_available,
    insuranceAvailable: wh.insurance_available
  }));
};

module.exports = {
  applyForTopup,
  getTopupDetails,
  listFarmerTopups,
  releaseAndRepay,
  listWarehouses,
};
