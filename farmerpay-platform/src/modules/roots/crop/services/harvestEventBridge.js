/**
 * Harvest Event Bridge — ROOTS → PULSE × DICE × SAGE Cross-Module Integration
 *
 * When a harvest is recorded (ROOTS), this bridge:
 *  1. Fetches PULSE price predictions (7/15/30 day) for the harvested commodity
 *  2. Fetches DICE loan position linked to this cultivation cycle
 *  3. Generates a PULSE sell-recommendation with loan-aware realisation scenarios
 *  4. Creates a SAGE advisory (storage_recommendation or market_price_alert)
 *  5. Returns the combined payload for the farmer's post-harvest dashboard
 *
 * This is the "HARVEST COMPLETE (ROOTS triggers)" step from the system flow.
 */

const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

/**
 * Triggered after ROOTS recordHarvest() sets cycle_status = 'post_harvest'.
 * Orchestrates the full PULSE x DICE farmer journey initiation.
 *
 * @param {Object} params
 * @param {number} params.farmerId - Farmer's user ID
 * @param {Object} params.cycle - CultivationCycle instance (post-harvest)
 * @param {Object} params.harvestRecord - HarvestRecord just created
 * @returns {Object} - Combined PULSE + DICE + SAGE payload
 */
const onHarvestComplete = async ({ farmerId, cycle, harvestRecord }) => {
  const {
    CultivationCycleLoanLinkage, LoanApplication,
    PulseCommodity, PulsePriceRecord, PulsePriceForecast, PulseMandi, PulseMsp,
    PulseSellRecommendation,
    DiceWarehouseRegistry, DicePriceRealisationSnapshot,
    SageAdvisory, SageAdvisoryType, SageAlert
  } = getDb();

  try {
    logger.info(`[HarvestEventBridge] Harvest complete for cycle ${cycle.cycle_uuid}, farmer ${farmerId}`);

    // ─── Step 1: Resolve commodity from cycle ──────────────────────
    const commodityId = cycle.crop_id;
    const commodity = await PulseCommodity.findOne({
      where: { commodity_id: commodityId, is_active: true }
    });
    if (!commodity) {
      logger.warn(`[HarvestEventBridge] No PULSE commodity found for crop_id ${commodityId}`);
      return { triggered: false, reason: 'commodity_not_found' };
    }

    // ─── Step 2: Find nearest mandi for farmer ────────────────────
    // Use the first available mandi (in production, would use farmer's GPS)
    const nearestMandi = await PulseMandi.findOne({
      where: { is_active: true },
      order: [['price_discovery_rank', 'ASC']]
    });

    // ─── Step 3: Fetch PULSE price data ───────────────────────────
    const latestPrice = nearestMandi ? await PulsePriceRecord.findOne({
      where: { mandi_id: nearestMandi.id, commodity_id: commodityId, is_active: true },
      order: [['record_date', 'DESC']]
    }) : null;

    const currentPrice = latestPrice
      ? parseFloat(latestPrice.modal_price || latestPrice.closing_price)
      : 0;

    // Fetch 7/15/30 day forecasts
    const forecasts = await PulsePriceForecast.findAll({
      where: {
        commodity_id: commodityId,
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
          confidence: parseFloat(f.forecast_confidence),
          forecastPriceMin: parseFloat(f.forecast_price_min),
          forecastPriceMax: parseFloat(f.forecast_price_max),
          riskScore: f.risk_score
        };
      }
    }

    // Fetch MSP
    const msp = await PulseMsp.findOne({
      where: { commodity_id: commodityId, is_active: true },
      order: [['msp_year', 'DESC']]
    });

    // ─── Step 4: Fetch DICE loan position ─────────────────────────
    let activeLoan = null;
    let loanOutstanding = 0;
    let interestRateAnnual = 7;

    // Check if cycle has a linked loan
    const loanLinkage = await CultivationCycleLoanLinkage.findOne({
      where: { cycle_id: cycle.cycle_uuid, is_active: true }
    });

    if (loanLinkage) {
      activeLoan = await LoanApplication.findOne({
        where: { id: loanLinkage.application_id, farmer_id: farmerId, is_active: true }
      });
    }

    if (!activeLoan) {
      // Fallback: find any active loan for this farmer
      activeLoan = await LoanApplication.findOne({
        where: {
          farmer_id: farmerId,
          is_active: true,
          application_status: { [Op.in]: ['disbursed', 'active', 'approved'] }
        },
        order: [['applied_at', 'DESC']]
      });
    }

    if (activeLoan) {
      loanOutstanding = parseFloat(activeLoan.apply_for_amount || 0);
      interestRateAnnual = parseFloat(activeLoan.approval_interest_rate || 7);
    }

    // ─── Step 5: Calculate sell-now vs store scenarios ─────────────
    const harvestQtyKg = parseFloat(harvestRecord.total_harvest_quantity_kg || 0);
    const harvestQtyQuintals = harvestQtyKg / 100; // 1 quintal = 100 kg
    const storageFactor = parseFloat(commodity.storage_factor) || 0.001;
    const transportCost = parseFloat(nearestMandi?.transport_cost_index || 500);
    const mandiChargeRate = 0.015;

    // Find nearest warehouse
    const nearestWarehouse = await DiceWarehouseRegistry.findOne({
      where: { enwr_enabled: true, is_active: true, available_capacity_tonnes: { [Op.gt]: 0 } },
      order: [['available_capacity_tonnes', 'DESC']]
    });
    const storageCostPerQtlPerDay = nearestWarehouse
      ? parseFloat(nearestWarehouse.storage_rate_per_quintal_per_day) : 3;

    const calcScenario = (price, daysStored) => {
      const qty = harvestQtyQuintals;
      const effectiveQty = qty * (1 - (storageFactor * daysStored));
      const grossRealisation = price * effectiveQty;
      const storageCost = storageCostPerQtlPerDay * qty * daysStored;
      const interestAccrued = loanOutstanding * (interestRateAnnual / 100) * (daysStored / 365);
      const mandiCharges = grossRealisation * mandiChargeRate;
      const netRealisation = grossRealisation - storageCost - interestAccrued - transportCost - mandiCharges;
      const surplusDeficit = netRealisation - loanOutstanding;
      return {
        grossRealisation: Math.round(grossRealisation),
        storageCost: Math.round(storageCost),
        interestAccrued: Math.round(interestAccrued),
        netRealisation: Math.round(netRealisation),
        surplusDeficit: Math.round(surplusDeficit)
      };
    };

    const sellNow = currentPrice > 0 ? calcScenario(currentPrice, 0) : null;
    const store15 = forecastMap[15] ? calcScenario(forecastMap[15].predictedPrice, 15) : null;
    const store30 = forecastMap[30] ? calcScenario(forecastMap[30].predictedPrice, 30) : null;

    // Determine optimal strategy
    let optimalStrategy = 'sell_now';
    if (store15 && store30 && sellNow) {
      const strategies = [
        { key: 'sell_now', weighted: sellNow.netRealisation },
        { key: 'store_15d', weighted: store15.netRealisation * ((forecastMap[15]?.confidence || 50) / 100) },
        { key: 'store_30d', weighted: store30.netRealisation * ((forecastMap[30]?.confidence || 40) / 100) }
      ];
      strategies.sort((a, b) => b.weighted - a.weighted);
      optimalStrategy = strategies[0].key;
    }

    // Top-up eligibility
    const produceValue = currentPrice * harvestQtyQuintals;
    const topupEligible = (
      optimalStrategy !== 'sell_now' &&
      (commodity.shelf_life_days || 90) > 30 &&
      nearestWarehouse != null &&
      activeLoan != null
    );
    const topupMaxAmount = Math.round(produceValue * 0.70);

    // ─── Step 6: Create PULSE sell-recommendation ─────────────────
    const mandiRecommendations = nearestMandi ? [{
      mandiId: nearestMandi.id,
      mandiName: nearestMandi.mandi_name,
      expectedPrice: currentPrice,
      transportCost: transportCost,
      netPrice: currentPrice * harvestQtyQuintals - transportCost
    }] : [];

    await PulseSellRecommendation.create({
      recommendation_uuid: generateUUID(),
      farmer_id: farmerId,
      cycle_id: cycle.cycle_uuid,
      commodity_id: commodityId,
      recommended_timing: optimalStrategy === 'sell_now' ? 'Sell immediately'
        : optimalStrategy === 'store_15d' ? 'Store 15 days, then sell'
        : 'Store 30 days, then sell',
      recommended_price: optimalStrategy === 'sell_now' ? currentPrice
        : optimalStrategy === 'store_15d' ? (forecastMap[15]?.predictedPrice || currentPrice)
        : (forecastMap[30]?.predictedPrice || currentPrice),
      rationale: generateRationale(optimalStrategy, sellNow, store15, store30),
      mandi_recommendations: JSON.stringify(mandiRecommendations),
      recommendation_generated_date: new Date(),
      linked_loan_application_id: activeLoan?.id || null,
      loan_outstanding_at_recommendation: loanOutstanding,
      sell_now_realisation: sellNow?.netRealisation || null,
      store_15d_realisation: store15?.netRealisation || null,
      store_30d_realisation: store30?.netRealisation || null,
      optimal_strategy: optimalStrategy,
      topup_loan_eligible: topupEligible,
      topup_loan_max_amount: topupEligible ? topupMaxAmount : null
    });

    // ─── Step 7: Save DICE price realisation snapshot ─────────────
    if (activeLoan && sellNow) {
      await DicePriceRealisationSnapshot.create({
        snapshot_uuid: generateUUID(),
        farmer_id: farmerId,
        loan_application_id: activeLoan.id,
        commodity_id: commodityId,
        snapshot_date: new Date(),
        produce_quantity_quintals: harvestQtyQuintals,
        loan_outstanding: loanOutstanding,
        current_mandi_price: currentPrice,
        sell_now_gross: sellNow.grossRealisation,
        sell_now_transport_cost: transportCost,
        sell_now_net: sellNow.netRealisation,
        sell_now_surplus_deficit: sellNow.surplusDeficit,
        predicted_price_15d: forecastMap[15]?.predictedPrice || null,
        confidence_15d: forecastMap[15]?.confidence || null,
        store_15d_storage_cost: store15?.storageCost || null,
        store_15d_interest_cost: store15?.interestAccrued || null,
        store_15d_gross: store15?.grossRealisation || null,
        store_15d_net: store15?.netRealisation || null,
        store_15d_surplus_deficit: store15?.surplusDeficit || null,
        predicted_price_30d: forecastMap[30]?.predictedPrice || null,
        confidence_30d: forecastMap[30]?.confidence || null,
        store_30d_storage_cost: store30?.storageCost || null,
        store_30d_interest_cost: store30?.interestAccrued || null,
        store_30d_gross: store30?.grossRealisation || null,
        store_30d_net: store30?.netRealisation || null,
        store_30d_surplus_deficit: store30?.surplusDeficit || null,
        recommended_strategy: optimalStrategy,
        topup_eligible: topupEligible,
        topup_max_amount: topupEligible ? topupMaxAmount : null
      });
    }

    // ─── Step 8: Create SAGE advisory ─────────────────────────────
    const advisoryType = await SageAdvisoryType.findOne({
      where: { advisory_type_code: optimalStrategy === 'sell_now' ? 'market_price_alert' : 'storage_recommendation', is_active: true }
    });

    if (advisoryType) {
      const advisoryContent = optimalStrategy === 'sell_now'
        ? `Your ${commodity.commodity_name} harvest of ${harvestQtyKg} kg is ready. Current mandi price is ₹${currentPrice}/quintal. Selling now is recommended — your net realisation after loan repayment is ₹${sellNow?.surplusDeficit || 0}.`
        : `Your ${commodity.commodity_name} harvest of ${harvestQtyKg} kg is ready. Prices are expected to rise ${Math.round(((forecastMap[optimalStrategy === 'store_15d' ? 15 : 30]?.predictedPrice || currentPrice) - currentPrice) / currentPrice * 100)}% in ${optimalStrategy === 'store_15d' ? '15' : '30'} days. Consider storing in a registered warehouse. You may be eligible for a top-up loan of up to ₹${topupMaxAmount}.`;

      await SageAdvisory.create({
        advisory_uuid: generateUUID(),
        farmer_id: farmerId,
        advisory_type_id: advisoryType.id,
        advisory_content: advisoryContent,
        advisory_language: 'en',
        advisory_urgency: optimalStrategy === 'sell_now' ? 'medium' : 'high',
        delivery_channel: 'in_app'
      });

      // Also create a SAGE alert
      await SageAlert.create({
        alert_uuid: generateUUID(),
        farmer_id: farmerId,
        alert_type: optimalStrategy === 'sell_now' ? 'market_price' : 'storage_opportunity',
        alert_message: advisoryContent,
        alert_urgency: optimalStrategy === 'sell_now' ? 'medium' : 'high',
        alert_triggered_at: new Date(),
        action_recommended: optimalStrategy === 'sell_now'
          ? `Sell at ${nearestMandi?.mandi_name || 'nearest mandi'}`
          : `Store at nearest eNWR warehouse and apply for top-up loan`
      });
    }

    logger.info(`[HarvestEventBridge] PULSE x DICE x SAGE triggered for farmer ${farmerId}, strategy: ${optimalStrategy}`);

    // ─── Return combined payload ──────────────────────────────────
    return {
      triggered: true,
      farmerId,
      cycleId: cycle.id,
      cycleUuid: cycle.cycle_uuid,
      commodity: {
        commodityId,
        commodityName: commodity.commodity_name,
        perishabilityIndex: commodity.perishability_index,
        volatilityClass: commodity.volatility_class,
        shelfLifeDays: commodity.shelf_life_days
      },
      harvest: {
        quantityKg: harvestQtyKg,
        quantityQuintals: harvestQtyQuintals,
        qualityGrade: harvestRecord.harvest_quality_grade
      },
      currentMarket: {
        mandiId: nearestMandi?.id,
        mandiName: nearestMandi?.mandi_name,
        currentPrice,
        mspPrice: msp ? parseFloat(msp.msp_price) : null,
        priceTrend: latestPrice?.price_trend
      },
      forecasts: forecastMap,
      loan: activeLoan ? {
        applicationId: activeLoan.id,
        outstanding: loanOutstanding,
        interestRate: interestRateAnnual
      } : null,
      scenarios: { sellNow, store15Days: store15, store30Days: store30 },
      recommendation: {
        optimalStrategy,
        topupEligible,
        topupMaxAmount: topupEligible ? topupMaxAmount : null,
        nearestWarehouse: nearestWarehouse ? {
          id: nearestWarehouse.id,
          name: nearestWarehouse.warehouse_name,
          storageRate: storageCostPerQtlPerDay,
          enwr: nearestWarehouse.enwr_enabled
        } : null
      }
    };

  } catch (err) {
    logger.error(`[HarvestEventBridge] Error: ${err.message}`, err);
    // Non-blocking — harvest recording should still succeed even if bridge fails
    return { triggered: false, reason: err.message };
  }
};

/**
 * Called when a harvest sale is recorded via ROOTS.
 * If the cycle has a linked post-harvest top-up loan, auto-triggers repayment.
 *
 * @param {Object} params
 * @param {number} params.farmerId
 * @param {Object} params.saleRecord - HarvestSaleRecord just created
 * @param {Object} params.harvestRecord - Parent HarvestRecord
 */
const onHarvestSaleRecorded = async ({ farmerId, saleRecord, harvestRecord }) => {
  const { DicePostharvestTopupLoan, DiceProduceHypothecationLog } = getDb();

  try {
    // Check if farmer has an active post-harvest topup loan for this commodity
    const activeTopup = await DicePostharvestTopupLoan.findOne({
      where: {
        farmer_id: farmerId,
        loan_status: { [Op.in]: ['disbursed', 'partially_repaid'] },
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    if (!activeTopup) return { autoRepayTriggered: false };

    const saleValue = parseFloat(saleRecord.net_sale_value || saleRecord.gross_sale_value || 0);
    const outstanding = parseFloat(activeTopup.amount_outstanding);
    const repaymentAmount = Math.min(saleValue, outstanding);
    const newOutstanding = outstanding - repaymentAmount;
    const quantityQuintals = parseFloat(saleRecord.quantity_sold_kg) / 100;

    // Update topup loan
    await activeTopup.update({
      produce_quantity_quintals: Math.max(0, parseFloat(activeTopup.produce_quantity_quintals) - quantityQuintals),
      amount_repaid: parseFloat(activeTopup.amount_repaid) + repaymentAmount,
      amount_outstanding: newOutstanding,
      loan_status: newOutstanding <= 0 ? 'closed' : 'partially_repaid'
    });

    // Log the release
    await DiceProduceHypothecationLog.create({
      log_uuid: generateUUID(),
      topup_loan_id: activeTopup.id,
      log_date: new Date(),
      event_type: newOutstanding <= 0 ? 'full_release' : 'partial_release',
      quantity_quintals: quantityQuintals,
      price_per_quintal: parseFloat(saleRecord.price_per_kg) * 100,
      total_value: saleValue,
      current_ltv_ratio: newOutstanding > 0 ? newOutstanding / saleValue : 0,
      notes: `Auto-repay from ROOTS harvest sale. Sold ${saleRecord.quantity_sold_kg} kg at ₹${saleRecord.price_per_kg}/kg.`
    });

    logger.info(`[HarvestEventBridge] Auto-repay ₹${repaymentAmount} from sale, topup ${activeTopup.id} → ${newOutstanding <= 0 ? 'closed' : 'partially_repaid'}`);

    return {
      autoRepayTriggered: true,
      repaymentAmount,
      newOutstanding,
      topupStatus: newOutstanding <= 0 ? 'closed' : 'partially_repaid'
    };

  } catch (err) {
    logger.error(`[HarvestEventBridge] Sale auto-repay error: ${err.message}`, err);
    return { autoRepayTriggered: false, reason: err.message };
  }
};

function generateRationale(strategy, sellNow, store15, store30) {
  if (strategy === 'sell_now') {
    return 'Current price is favorable relative to forecast. Selling now minimizes storage and interest costs.';
  }
  if (strategy === 'store_15d') {
    const gain = (store15?.netRealisation || 0) - (sellNow?.netRealisation || 0);
    return `Price expected to improve. Storing 15 days could yield ₹${gain} more after all costs.`;
  }
  const gain = (store30?.netRealisation || 0) - (sellNow?.netRealisation || 0);
  return `Significant price increase expected. Storing 30 days could yield ₹${gain} more after storage, interest, and spoilage.`;
}

module.exports = {
  onHarvestComplete,
  onHarvestSaleRecorded,
};
