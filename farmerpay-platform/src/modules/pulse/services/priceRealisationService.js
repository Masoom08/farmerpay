/**
 * Price Realisation Service — PULSE x DICE Bridge
 * Calculates sell-now vs store-15d vs store-30d scenarios for farmers with active crop loans.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Calculate sell-now vs store-15d vs store-30d scenarios.
 * Core PULSE x DICE integration logic.
 */
const calculateRealisation = async ({ farmerId, loanApplicationId, commodityId, quantityQuintals, mandiId }) => {
  const {
    LoanApplication, PulseCommodity, PulsePriceRecord, PulsePriceForecast,
    PulseMsp, PulseMandi, DiceWarehouseRegistry, DicePriceRealisationSnapshot,
    User, FarmerProfile
  } = getDb();

  // 0. Fetch farmer name
  const farmerProfile = await FarmerProfile.findOne({ where: { farmer_id: farmerId, is_active: true } }).catch(() => null);
  const farmerName = farmerProfile ? `${farmerProfile.first_name || ''} ${farmerProfile.last_name || ''}`.trim() : null;

  // 1. Fetch loan position from DICE
  const loan = await LoanApplication.findOne({
    where: { id: loanApplicationId, farmer_id: farmerId, is_active: true }
  });
  if (!loan) {
    const err = new Error('Active loan not found');
    err.statusCode = 404;
    err.errorCode = 'DICE_001';
    throw err;
  }

  const principalOutstanding = parseFloat(loan.apply_for_amount || 0);
  if (isNaN(principalOutstanding) || principalOutstanding < 0) {
    const err = new Error('Invalid loan principal amount');
    err.statusCode = 400; err.errorCode = 'DICE_002'; throw err;
  }
  const interestRateAnnual = parseFloat(loan.approval_interest_rate || 7);
  if (isNaN(interestRateAnnual) || interestRateAnnual < 0 || interestRateAnnual > 50) {
    const err = new Error('Invalid interest rate');
    err.statusCode = 400; err.errorCode = 'DICE_003'; throw err;
  }
  const interestOutstanding = interestRateAnnual * principalOutstanding * 0.01;
  const loanOutstanding = principalOutstanding + interestOutstanding;

  // 2. Fetch commodity metadata
  const commodity = await PulseCommodity.findOne({
    where: { commodity_id: commodityId, is_active: true }
  });
  if (!commodity) {
    const err = new Error('Commodity not found');
    err.statusCode = 404;
    err.errorCode = 'PULSE_001';
    throw err;
  }

  const storageFactor = parseFloat(commodity.storage_factor) || 0.001;
  const shelfLifeDays = commodity.shelf_life_days || 90;
  const perishabilityIndex = commodity.perishability_index || 3;

  // 3. Fetch current mandi price from PULSE
  const latestPrice = await PulsePriceRecord.findOne({
    where: { mandi_id: mandiId, commodity_id: commodityId, is_active: true },
    order: [['record_date', 'DESC']]
  });
  const currentPrice = latestPrice
    ? parseFloat(latestPrice.modal_price || latestPrice.closing_price)
    : 0;

  if (currentPrice <= 0) {
    const err = new Error('No price data available for this commodity at this mandi');
    err.statusCode = 404;
    err.errorCode = 'PULSE_002';
    throw err;
  }

  // 4. Fetch PULSE forecasts (7, 15, 30 days) for this mandi
  const forecasts = await PulsePriceForecast.findAll({
    where: {
      commodity_id: commodityId,
      mandi_id: mandiId,
      is_active: true,
      horizon_days: { [Op.in]: [7, 15, 30] }
    },
    order: [['forecast_date', 'DESC'], ['horizon_days', 'ASC']]
  });

  const forecastMap = {};
  for (const f of forecasts) {
    if (!forecastMap[f.horizon_days]) {
      forecastMap[f.horizon_days] = {
        predictedPrice: parseFloat(f.predicted_price),
        confidenceLow: parseFloat(f.forecast_price_min),
        confidenceHigh: parseFloat(f.forecast_price_max),
        confidence: parseFloat(f.forecast_confidence),
        riskScore: f.risk_score,
        factors: f.forecast_factors
      };
    }
  }

  // 5. Fetch MSP
  const msp = await PulseMsp.findOne({
    where: { commodity_id: commodityId, is_active: true },
    order: [['msp_year', 'DESC']]
  });
  const mspPrice = msp ? parseFloat(msp.msp_price) : null;

  // 6. Fetch mandi details
  const mandi = await PulseMandi.findOne({ where: { id: mandiId } });
  const transportCost = parseFloat(mandi?.transport_cost_index || 500);
  const mandiChargeRate = 0.015; // 1.5% mandi cess

  // 7. Fetch nearest warehouse
  const nearestWarehouse = await DiceWarehouseRegistry.findOne({
    where: {
      district_id: mandi?.mandi_district_id,
      enwr_enabled: true,
      is_active: true,
      available_capacity_tonnes: { [Op.gt]: 0 }
    },
    order: [['available_capacity_tonnes', 'DESC']]
  });
  const storageCostPerQtlPerDay = nearestWarehouse
    ? parseFloat(nearestWarehouse.storage_rate_per_quintal_per_day)
    : 3;

  // 8. Calculate scenarios
  const qty = parseFloat(quantityQuintals);

  const calcScenario = (price, daysStored) => {
    const effectiveQty = qty * (1 - (storageFactor * daysStored));
    const grossRealisation = price * effectiveQty;
    const storageCost = storageCostPerQtlPerDay * qty * daysStored;
    const interestAccrued = loanOutstanding * (interestRateAnnual / 100) * (daysStored / 365);
    const spoilageLoss = (qty - effectiveQty) * price;
    const mandiCharges = grossRealisation * mandiChargeRate;
    const netRealisation = grossRealisation - storageCost - interestAccrued - transportCost - mandiCharges;
    const surplusDeficit = netRealisation - loanOutstanding;
    const surplusDeficitPercent = loanOutstanding > 0 ? (surplusDeficit / loanOutstanding) * 100 : 0;

    return {
      grossRealisation: Math.round(grossRealisation * 100) / 100,
      storageCost: Math.round(storageCost * 100) / 100,
      interestAccrued: Math.round(interestAccrued * 100) / 100,
      spoilageLoss: Math.round(spoilageLoss * 100) / 100,
      transportCost: Math.round(transportCost * 100) / 100,
      mandiCharges: Math.round(mandiCharges * 100) / 100,
      netRealisation: Math.round(netRealisation * 100) / 100,
      loanRepayment: Math.round(loanOutstanding * 100) / 100,
      surplusDeficit: Math.round(surplusDeficit * 100) / 100,
      surplusDeficitPercent: Math.round(surplusDeficitPercent * 10) / 10
    };
  };

  const sellNow = calcScenario(currentPrice, 0);
  const store15 = calcScenario(forecastMap[15]?.predictedPrice || currentPrice, 15);
  const store30 = calcScenario(forecastMap[30]?.predictedPrice || currentPrice, 30);

  // Attach forecast metadata to store scenarios
  store15.predictedPrice = forecastMap[15]?.predictedPrice || currentPrice;
  store15.confidencePercent = forecastMap[15]?.confidence || 0;
  store15.confidenceLow = forecastMap[15]?.confidenceLow || currentPrice;
  store15.confidenceHigh = forecastMap[15]?.confidenceHigh || currentPrice;
  store15.incrementalGainOverSellNow = Math.round((store15.netRealisation - sellNow.netRealisation) * 100) / 100;

  store30.predictedPrice = forecastMap[30]?.predictedPrice || currentPrice;
  store30.confidencePercent = forecastMap[30]?.confidence || 0;
  store30.confidenceLow = forecastMap[30]?.confidenceLow || currentPrice;
  store30.confidenceHigh = forecastMap[30]?.confidenceHigh || currentPrice;
  store30.incrementalGainOverSellNow = Math.round((store30.netRealisation - sellNow.netRealisation) * 100) / 100;

  // 9. Determine optimal strategy (confidence-weighted)
  const strategies = [
    { key: 'sell_now', net: sellNow.netRealisation, confidence: 100 },
    { key: 'store_15d', net: store15.netRealisation, confidence: store15.confidencePercent },
    { key: 'store_30d', net: store30.netRealisation, confidence: store30.confidencePercent }
  ];
  const weighted = strategies.map(s => ({
    ...s,
    weighted: s.net * (s.confidence / 100)
  }));
  weighted.sort((a, b) => b.weighted - a.weighted);
  const optimalStrategy = weighted[0].key;

  // 10. Top-up loan eligibility
  const produceValue = currentPrice * qty;
  const maxLTV = 0.70;
  const topupMaxAmount = Math.round(produceValue * maxLTV);
  const topupEligible = (
    optimalStrategy !== 'sell_now' &&
    shelfLifeDays > 30 &&
    nearestWarehouse != null &&
    qty > 0
  );

  // 11. Save snapshot
  await DicePriceRealisationSnapshot.create({
    snapshot_uuid: generateUUID(),
    farmer_id: farmerId,
    loan_application_id: loanApplicationId,
    commodity_id: commodityId,
    snapshot_date: new Date(),
    produce_quantity_quintals: qty,
    loan_outstanding: loanOutstanding,
    current_mandi_price: currentPrice,
    sell_now_gross: sellNow.grossRealisation,
    sell_now_transport_cost: sellNow.transportCost,
    sell_now_net: sellNow.netRealisation,
    sell_now_surplus_deficit: sellNow.surplusDeficit,
    predicted_price_15d: store15.predictedPrice,
    confidence_15d: store15.confidencePercent,
    store_15d_storage_cost: store15.storageCost,
    store_15d_interest_cost: store15.interestAccrued,
    store_15d_spoilage_loss: store15.spoilageLoss,
    store_15d_gross: store15.grossRealisation,
    store_15d_net: store15.netRealisation,
    store_15d_surplus_deficit: store15.surplusDeficit,
    predicted_price_30d: store30.predictedPrice,
    confidence_30d: store30.confidencePercent,
    store_30d_storage_cost: store30.storageCost,
    store_30d_interest_cost: store30.interestAccrued,
    store_30d_spoilage_loss: store30.spoilageLoss,
    store_30d_gross: store30.grossRealisation,
    store_30d_net: store30.netRealisation,
    store_30d_surplus_deficit: store30.surplusDeficit,
    recommended_strategy: optimalStrategy,
    topup_eligible: topupEligible,
    topup_max_amount: topupMaxAmount
  });

  logger.info(`Price realisation calculated for farmer ${farmerId}, loan ${loanApplicationId}, strategy: ${optimalStrategy}`);

  // 12. Return full response
  return {
    farmer: { farmerId, farmerName },
    loan: {
      applicationId: loan.id,
      productName: loan.intended_use || 'Crop Loan',
      principalOutstanding,
      interestOutstanding,
      totalOutstanding: loanOutstanding,
      interestRateAnnual,
      nextEmiDate: null,
      daysToMaturity: null
    },
    produce: {
      commodityId,
      commodityName: commodity.commodity_name,
      quantityQuintals: qty,
      perishabilityIndex,
      storageFactor,
      shelfLifeDays
    },
    currentMarket: {
      mandiId,
      mandiName: mandi?.mandi_name,
      currentModalPrice: currentPrice,
      mspPrice,
      priceTrend: latestPrice?.price_trend
    },
    scenarios: {
      sellNow,
      store15Days: store15,
      store30Days: store30
    },
    recommendation: {
      optimalStrategy,
      rationale: generateRationale(optimalStrategy, sellNow, store15, store30),
      riskWarning: generateRiskWarning(store15, store30, commodity),
      bestMandi: {
        mandiId,
        mandiName: mandi?.mandi_name,
        expectedNetPrice: sellNow ? Math.round(sellNow.netRealisation) : null,
        distanceKm: null // TODO: calculate from farmer GPS coordinates
      }
    },
    topupLoan: {
      eligible: topupEligible,
      maxLoanAmount: topupMaxAmount,
      ltvRatio: maxLTV,
      interestRate: interestRateAnnual,
      effectiveRate: Math.max(interestRateAnnual - 3, 4),
      subventionApplicable: true,
      nearestWarehouse: nearestWarehouse ? {
        warehouseId: nearestWarehouse.id,
        name: nearestWarehouse.warehouse_name,
        distanceKm: null, // TODO: calculate from farmer GPS coordinates
        storageRate: storageCostPerQtlPerDay,
        enwr: nearestWarehouse.enwr_enabled
      } : null,
      estimatedStorageCost30Days: Math.round(storageCostPerQtlPerDay * qty * 30)
    }
  };
};

function generateRationale(strategy, sellNow, store15, store30) {
  if (strategy === 'sell_now') {
    return 'Current price is favorable relative to forecast. Selling now minimizes storage and interest costs.';
  }
  if (strategy === 'store_15d') {
    const gain = store15.incrementalGainOverSellNow;
    return `Price expected to improve. Storing 15 days could yield ₹${gain} more after all costs.`;
  }
  const gain = store30.incrementalGainOverSellNow;
  return `Significant price increase expected. Storing 30 days could yield ₹${gain} more after storage, interest, and spoilage.`;
}

function generateRiskWarning(store15, store30, commodity) {
  const warnings = [];
  if (store30.confidencePercent < 60) {
    warnings.push('30-day forecast confidence is below 60%.');
  }
  if (commodity.volatility_class === 'ultra_high' || commodity.volatility_class === 'high') {
    warnings.push(`${commodity.commodity_name} has ${(commodity.volatility_class || '').replace('_', '-')} price volatility.`);
  }
  if (commodity.perishability_index > 6) {
    warnings.push('High perishability — significant spoilage risk if stored beyond shelf life.');
  }
  return warnings.join(' ') || 'Normal risk levels.';
}

module.exports = {
  calculateRealisation,
};
