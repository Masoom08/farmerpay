/**
 * Sell-Store Advisor Service — PULSE Dual-Loan Decision Engine
 *
 * Implements the full sell-vs-store decision model from the PULSE dashboard spec:
 *   - 5 scenarios: Sell Now (Open), Sell at MSP, Store 21d, Store 45d, Store 60d
 *   - Dual loan tracking: Pre-sowing KCC loan + Warehouse Receipt (WR) loan
 *   - Detailed cost breakdown: storage, handling, transport, interest, insurance, wastage, mandi fees
 *   - Warehouse presets: Mandi Yard, WDRA, Private Silo
 *   - Breakeven price calculation
 *   - Cashflow timeline with event-based cumulative position tracking
 *   - Per-quintal AND total view
 *   - CSV-ready data structure
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ─── Warehouse Presets ──────────────────────────────────────────────

const WAREHOUSE_PRESETS = {
  mandi: { name: 'Mandi Yard (nearby)', storageCostPerQtlPerDay: 2.1, handlingPerQtl: 35, transportPerQtl: 15 },
  wdra:  { name: 'WDRA Warehouse',      storageCostPerQtlPerDay: 1.8, handlingPerQtl: 40, transportPerQtl: 25 },
  silo:  { name: 'Private Silo',         storageCostPerQtlPerDay: 1.2, handlingPerQtl: 55, transportPerQtl: 35 },
};

// ─── Scenario Days ──────────────────────────────────────────────────

const SCENARIO_DAYS = { now: 0, msp: 0, d21: 21, d45: 45, d60: 60 };

// ─── Core Calculation Functions ─────────────────────────────────────

/**
 * Calculate holding cost per quintal for storing produce.
 */
function holdingCostPerQtl(days, basePrice, params) {
  const storage = params.storageCostPerQtlPerDay * days;
  const handling = params.handlingPerQtl;
  const transport = params.transportPerQtl;
  const interest = (basePrice * (params.annualInterestRate / 100) * days) / 365;
  const insurance = basePrice * (params.insuranceRate / 100);
  const wastage = basePrice * (params.wastageRate / 100);
  return { storage, handling, transport, interest, insurance, wastage, total: storage + handling + transport + interest + insurance + wastage };
}

/**
 * Calculate mandi fee deductions on sale price.
 */
function sellDeductions(price, mandiFeePct) {
  return price * (mandiFeePct / 100);
}

/**
 * Calculate pre-sowing loan repayment amount.
 * Interest accrues for elapsed days + scenario holding days.
 */
function preRepay(params, daysExtra) {
  if (!params.usePreSowing || params.preSowingAmount <= 0) return { principal: 0, interest: 0, fee: 0, total: 0 };
  const P = params.preSowingAmount;
  const r = params.preSowingRate / 100;
  const fee = P * (params.preSowingProcFee / 100);
  const totalDays = params.preSowingElapsedDays + daysExtra;
  const interest = P * r * (totalDays / 365);
  return { principal: P, interest: round(interest), fee: round(fee), total: round(P + interest + fee) };
}

/**
 * Calculate WR loan principal based on LTV and valuation.
 */
function wrPrincipal(params) {
  if (!params.useWrLoan) return 0;
  let valPrice;
  if (params.wrValuationBasis === 'open') valPrice = params.openMarketPrice;
  else if (params.wrValuationBasis === 'msp') valPrice = params.mspPrice;
  else valPrice = params.wrCustomValuation || params.openMarketPrice;
  return valPrice * params.quantityQuintals * (params.wrLtvPercent / 100);
}

/**
 * Calculate WR loan repayment for a given holding period.
 */
function wrRepay(params, days) {
  const P = wrPrincipal(params);
  if (P <= 0) return { principal: 0, interest: 0, fee: 0, total: 0 };
  const r = params.wrRate / 100;
  const fee = P * (params.wrProcFee / 100);
  const interest = P * r * (days / 365);
  return { principal: round(P), interest: round(interest), fee: round(fee), total: round(P + interest + fee) };
}

function round(v) { return Math.round(v * 100) / 100; }

// ─── Main: Calculate All 5 Scenarios ────────────────────────────────

/**
 * Calculate the full sell-vs-store analysis with dual loan tracking.
 *
 * @param {Object} params
 * @param {number} params.farmerId
 * @param {string} params.crop - Commodity name
 * @param {number} params.quantityQuintals
 * @param {number} params.openMarketPrice - Current open market price per qtl
 * @param {number} params.mspPrice - MSP per qtl
 * @param {number} params.priceChange21d - Expected price change % in 21 days
 * @param {number} params.priceChange45d
 * @param {number} params.priceChange60d
 * @param {string} params.warehouseType - 'mandi' | 'wdra' | 'silo'
 * @param {number} [params.storageCostPerQtlPerDay] - Override preset
 * @param {number} [params.handlingPerQtl] - Override preset
 * @param {number} [params.transportPerQtl] - Override preset
 * @param {number} params.annualInterestRate - Storage carrying interest %
 * @param {number} params.insuranceRate - Insurance % of value
 * @param {number} params.wastageRate - Wastage/shrinkage % of value
 * @param {number} params.mandiFeePercent - Mandi commission %
 * @param {boolean} params.usePreSowing - Use pre-sowing loan?
 * @param {number} params.preSowingAmount - Pre-sowing loan principal
 * @param {number} params.preSowingRate - Pre-sowing loan annual rate %
 * @param {number} params.preSowingProcFee - Processing fee %
 * @param {number} params.preSowingElapsedDays - Days since disbursement
 * @param {boolean} params.useWrLoan - Use WR pledge loan?
 * @param {number} params.wrLtvPercent - Loan-to-value %
 * @param {number} params.wrRate - WR loan annual rate %
 * @param {number} params.wrProcFee - WR processing fee %
 * @param {string} params.wrValuationBasis - 'open' | 'msp' | 'custom'
 * @param {number} [params.wrCustomValuation]
 */
const calculateSellStoreAnalysis = async (params) => {
  // Apply warehouse preset defaults (can be overridden)
  const preset = WAREHOUSE_PRESETS[params.warehouseType] || WAREHOUSE_PRESETS.wdra;
  const p = {
    ...params,
    storageCostPerQtlPerDay: params.storageCostPerQtlPerDay ?? preset.storageCostPerQtlPerDay,
    handlingPerQtl: params.handlingPerQtl ?? preset.handlingPerQtl,
    transportPerQtl: params.transportPerQtl ?? preset.transportPerQtl,
  };

  const open = p.openMarketPrice;
  const msp = p.mspPrice;
  const qty = p.quantityQuintals;

  // Scenario prices
  const scenarioPrices = {
    now: open,
    msp: msp,
    d21: open * (1 + p.priceChange21d / 100),
    d45: open * (1 + p.priceChange45d / 100),
    d60: open * (1 + p.priceChange60d / 100),
  };

  // Calculate each scenario
  const scenarios = {};
  for (const [key, days] of Object.entries(SCENARIO_DAYS)) {
    const salePrice = scenarioPrices[key];
    const feeDed = sellDeductions(salePrice, p.mandiFeePercent);
    const holdCost = days > 0 ? holdingCostPerQtl(days, open, p) : { storage: 0, handling: 0, transport: 0, interest: 0, insurance: 0, wastage: 0, total: 0 };

    const netPerQtl = salePrice - feeDed - (days > 0 ? holdCost.total : 0);
    const netTotal = netPerQtl * qty;

    const preRepayment = preRepay(p, days);
    const wrRepayment = wrRepay(p, days);
    const totalRepay = preRepayment.total + wrRepayment.total;
    const afterLoans = netTotal - totalRepay;

    scenarios[key] = {
      name: key === 'now' ? 'Sell now (Open)' : key === 'msp' ? 'Sell at MSP' : `Store & sell ${days}d`,
      days,
      salePrice: round(salePrice),
      mandiFees: round(feeDed),
      holdingCost: {
        storage: round(holdCost.storage),
        handling: round(holdCost.handling),
        transport: round(holdCost.transport),
        interest: round(holdCost.interest),
        insurance: round(holdCost.insurance),
        wastage: round(holdCost.wastage),
        total: round(holdCost.total),
      },
      netPerQtl: round(netPerQtl),
      netTotal: round(netTotal),
      preRepay: preRepayment,
      wrRepay: wrRepayment,
      totalRepay: round(totalRepay),
      afterLoans: round(afterLoans),
    };
  }

  // Best scenario (by net per qtl)
  const scenarioList = Object.values(scenarios);
  const best = scenarioList.reduce((a, b) => (b.netPerQtl > a.netPerQtl ? b : a));

  // Breakeven: price needed after 45d to beat MSP
  const holdCost45 = holdingCostPerQtl(45, open, p);
  const breakevenPrice45d = msp + holdCost45.total + sellDeductions(msp, p.mandiFeePercent);

  // WR loan principal
  const wrLoanPrincipal = round(wrPrincipal(p));

  // Recommendation
  const isNegative = best.afterLoans < 0;

  const recommendation = {
    bestOption: best.name,
    bestNetPerQtl: best.netPerQtl,
    bestNetTotal: best.netTotal,
    bestAfterLoans: best.afterLoans,
    isNegativeAfterLoans: isNegative,
    breakevenPrice45d: round(breakevenPrice45d),
    holdingCost45dPerQtl: round(holdCost45.total),
    rationale: isNegative
      ? `After repaying both loans, you owe Rs ${Math.abs(best.afterLoans).toLocaleString('en-IN')} under "${best.name}". Consider selling sooner.`
      : `"${best.name}" yields Rs ${best.netPerQtl.toLocaleString('en-IN')}/qtl. Holding 45d costs Rs ${round(holdCost45.total)}/qtl; need >= Rs ${round(breakevenPrice45d)}/qtl to beat MSP.`,
  };

  logger.info(`Sell-store analysis: farmer ${p.farmerId}, best=${best.name}, afterLoans=${best.afterLoans}`);

  return {
    inputs: {
      crop: p.crop,
      quantityQuintals: qty,
      openMarketPrice: open,
      mspPrice: msp,
      warehouse: { type: p.warehouseType, name: preset.name },
      priceForecasts: { d21: p.priceChange21d, d45: p.priceChange45d, d60: p.priceChange60d },
    },
    wrLoanPrincipal,
    scenarios,
    recommendation,
  };
};

// ─── Cashflow Timeline ──────────────────────────────────────────────

/**
 * Build cashflow timeline events for a specific scenario.
 * Returns chronological events + cumulative cash position series for charting.
 *
 * @param {Object} params - Same as calculateSellStoreAnalysis
 * @param {string} scenarioKey - 'now' | 'msp' | 'd21' | 'd45' | 'd60'
 */
const buildCashflowTimeline = async (params, scenarioKey) => {
  const preset = WAREHOUSE_PRESETS[params.warehouseType] || WAREHOUSE_PRESETS.wdra;
  const p = {
    ...params,
    storageCostPerQtlPerDay: params.storageCostPerQtlPerDay ?? preset.storageCostPerQtlPerDay,
    handlingPerQtl: params.handlingPerQtl ?? preset.handlingPerQtl,
    transportPerQtl: params.transportPerQtl ?? preset.transportPerQtl,
  };

  const days = SCENARIO_DAYS[scenarioKey] || 0;
  const open = p.openMarketPrice;
  const msp = p.mspPrice;
  const qty = p.quantityQuintals;

  // Sale price per qtl
  let salePerQtl;
  if (scenarioKey === 'now') salePerQtl = open;
  else if (scenarioKey === 'msp') salePerQtl = msp;
  else if (scenarioKey === 'd21') salePerQtl = open * (1 + p.priceChange21d / 100);
  else if (scenarioKey === 'd45') salePerQtl = open * (1 + p.priceChange45d / 100);
  else salePerQtl = open * (1 + p.priceChange60d / 100);

  const saleNetTotal = (salePerQtl - sellDeductions(salePerQtl, p.mandiFeePercent)) * qty;
  const holdCost = days > 0 ? holdingCostPerQtl(days, open, p) : { total: 0 };
  const holdingTotal = holdCost.total * qty;

  const wrP = wrPrincipal(p);
  const wrRep = wrRepay(p, days);
  const preRep = preRepay(p, days);

  // Build events
  const events = [];

  // Past event: Pre-sowing loan disbursement
  if (p.usePreSowing && p.preSowingAmount > 0) {
    events.push({
      day: -p.preSowingElapsedDays,
      label: 'Pre-sowing loan disbursed (past)',
      amount: round(p.preSowingAmount),
      type: 'info',
      category: 'loan_disbursement',
    });
  }

  // Day 0: WR loan disbursement (inflow)
  if (wrP > 0) {
    const wrFee = wrP * (p.wrProcFee / 100);
    events.push({
      day: 0,
      label: 'WR loan disbursed',
      amount: round(wrP),
      type: 'in',
      category: 'loan_disbursement',
    });
    if (wrFee > 0) {
      events.push({
        day: 0,
        label: 'WR processing fee',
        amount: round(-wrFee),
        type: 'out',
        category: 'fee',
      });
    }
  }

  // Day D: Storage costs (modeled as single outflow at sale day)
  if (holdingTotal > 0) {
    events.push({
      day: days,
      label: 'Storage + carrying costs',
      amount: round(-holdingTotal),
      type: 'out',
      category: 'storage',
    });
  }

  // Day D: Sale proceeds
  events.push({
    day: days,
    label: 'Sale proceeds (net of mandi fees)',
    amount: round(saleNetTotal),
    type: 'in',
    category: 'sale',
  });

  // Day D: Loan repayments
  if (preRep.total > 0) {
    events.push({
      day: days,
      label: 'Repay pre-sowing loan (P+I+fee)',
      amount: round(-preRep.total),
      type: 'out',
      category: 'loan_repayment',
    });
  }
  if (wrRep.total > 0) {
    events.push({
      day: days,
      label: 'Repay WR loan (P+I+fee)',
      amount: round(-wrRep.total),
      type: 'out',
      category: 'loan_repayment',
    });
  }

  // Sort by day
  events.sort((a, b) => a.day - b.day);

  // Build cumulative cash position series (for chart)
  const cumulativeSeries = [];
  let cum = 0;
  const minDay = Math.min(0, ...events.map(e => e.day));
  cumulativeSeries.push({ day: minDay, position: cum });

  for (const e of events) {
    if (e.type !== 'info') { // info events are past/non-cash
      cum += e.amount;
    }
    cumulativeSeries.push({ day: e.day, position: round(cum) });
  }

  // Net after all loans
  const netAfterLoans = round(saleNetTotal - holdingTotal - preRep.total - wrRep.total);

  return {
    scenario: {
      key: scenarioKey,
      name: scenarioKey === 'now' ? 'Sell now (Open)' : scenarioKey === 'msp' ? 'Sell at MSP' : `Store & sell ${days}d`,
      days,
      salePrice: round(salePerQtl),
    },
    netAfterLoans,
    events,
    cumulativeSeries,
    summary: {
      totalInflows: round(events.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0)),
      totalOutflows: round(events.filter(e => e.type === 'out').reduce((s, e) => s + Math.abs(e.amount), 0)),
      saleProceeds: round(saleNetTotal),
      storageCosts: round(holdingTotal),
      preSowingRepay: preRep.total,
      wrRepay: wrRep.total,
    },
  };
};

// ─── Smart Defaults from DB ─────────────────────────────────────────

/**
 * Fetch smart defaults for a farmer: current prices, MSP, loan info, warehouse rates.
 * Used to pre-populate the advisor inputs from actual DB data.
 */
const getSmartDefaults = async (farmerId, commodityId, mandiId) => {
  const {
    LoanApplication, PulseCommodity, PulsePriceRecord, PulsePriceForecast,
    PulseMsp, PulseMandi, DiceWarehouseRegistry
  } = getDb();

  const defaults = {
    openMarketPrice: 2350,
    mspPrice: 2300,
    priceChange21d: 4,
    priceChange45d: 7,
    priceChange60d: 10,
    preSowingAmount: 0,
    preSowingRate: 12,
    preSowingElapsedDays: 90,
    warehouse: null,
  };

  try {
    // Current price
    if (commodityId && mandiId) {
      const latestPrice = await PulsePriceRecord.findOne({
        where: { mandi_id: mandiId, commodity_id: commodityId, is_active: true },
        order: [['record_date', 'DESC']]
      });
      if (latestPrice) {
        defaults.openMarketPrice = parseFloat(latestPrice.modal_price || latestPrice.closing_price);
      }
    }

    // MSP
    if (commodityId) {
      const msp = await PulseMsp.findOne({
        where: { commodity_id: commodityId, is_active: true },
        order: [['msp_year', 'DESC']]
      });
      if (msp) defaults.mspPrice = parseFloat(msp.msp_price);
    }

    // Forecasts
    if (commodityId && mandiId) {
      const forecasts = await PulsePriceForecast.findAll({
        where: { commodity_id: commodityId, mandi_id: mandiId, is_active: true },
        order: [['forecast_date', 'DESC']]
      });
      for (const f of forecasts) {
        const predicted = parseFloat(f.predicted_price);
        const changePct = ((predicted - defaults.openMarketPrice) / defaults.openMarketPrice) * 100;
        if (f.horizon_days <= 21) defaults.priceChange21d = Math.round(changePct * 10) / 10;
        else if (f.horizon_days <= 45) defaults.priceChange45d = Math.round(changePct * 10) / 10;
        else if (f.horizon_days <= 60) defaults.priceChange60d = Math.round(changePct * 10) / 10;
      }
    }

    // Active loan
    if (farmerId) {
      const loan = await LoanApplication.findOne({
        where: { farmer_id: farmerId, is_active: true, approval_status: 'approved' },
        order: [['created_at', 'DESC']]
      });
      if (loan) {
        defaults.preSowingAmount = parseFloat(loan.apply_for_amount || 0);
        defaults.preSowingRate = parseFloat(loan.approval_interest_rate || 12);
        // Estimate elapsed days from disbursement
        if (loan.approved_at) {
          defaults.preSowingElapsedDays = Math.floor((Date.now() - new Date(loan.approved_at).getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    }

    // Nearest warehouse
    if (mandiId) {
      const mandi = await PulseMandi.findOne({ where: { id: mandiId } });
      if (mandi) {
        const warehouse = await DiceWarehouseRegistry.findOne({
          where: { district_id: mandi.mandi_district_id, enwr_enabled: true, is_active: true },
          order: [['available_capacity_tonnes', 'DESC']]
        });
        if (warehouse) {
          defaults.warehouse = {
            id: warehouse.id,
            name: warehouse.warehouse_name,
            storageRate: parseFloat(warehouse.storage_rate_per_quintal_per_day),
            enwr: warehouse.enwr_enabled,
            capacity: warehouse.available_capacity_tonnes,
          };
        }
      }
    }
  } catch (err) {
    logger.warn(`Smart defaults fetch error: ${err.message}`);
  }

  return defaults;
};

// ─── PHASE 1 — Auto-population from ROOTS + DICE ────────────────────
//
// The legacy getSmartDefaults() above seeds prices, MSP, and the
// pre-sowing loan from a couple of tables but never reads the actual
// cost-of-cultivation or harvest quantity from ROOTS. The new helper
// below fills that gap so the farmer-app /sell-or-store wizard can
// open with everything pre-filled and the farmer just confirms.
//
// Used by GET /pulse/sell-store-defaults-enriched/:farmerId

const loadDefaultsFromROOTSAndDICE = async (farmerId, cycleId, commodityId, mandiId) => {
  const {
    CultivationCycle, CultivationCycleExpenseSummary,
    HarvestRecord, HarvestSaleRecord, CultivationCycleIncomeSummary,
    LoanRepaymentSchedule, LoanApplication,
  } = getDb();

  // Start with the legacy smart defaults (prices, MSP, forecasts, warehouse)
  const baseDefaults = await getSmartDefaults(farmerId, commodityId, mandiId);

  // Layer the ROOTS cycle context on top — cycle_id may be the
  // numeric PK or the cycle_uuid. The ExpenseSummary + HarvestRecord
  // tables key on the STRING uuid, so we must resolve it first.
  let cycle = null;
  if (cycleId) {
    if (typeof cycleId === 'string' && cycleId.length === 36) {
      cycle = await CultivationCycle.findOne({ where: { cycle_uuid: cycleId, is_active: true } });
    } else {
      cycle = await CultivationCycle.findOne({ where: { id: parseInt(cycleId, 10), is_active: true } });
    }
  } else {
    // No cycleId — auto-pick the farmer's most recent cycle in
    // a "harvestable" state (harvesting / post_harvest / monitoring).
    cycle = await CultivationCycle.findOne({
      where: {
        farmer_id: farmerId,
        is_active: true,
        cycle_status: { [Op.in]: ['harvesting', 'post_harvest', 'monitoring'] },
      },
      order: [['cycle_actual_harvest_date', 'DESC'], ['cycle_expected_harvest_date', 'DESC']],
    });
  }

  let costOfCultivation = null;
  let costPerHectare = null;
  let quantityQuintals = null;
  let harvestDate = null;
  let cycleSummary = null;

  if (cycle) {
    cycleSummary = {
      cycleId: cycle.id,
      cycleUuid: cycle.cycle_uuid,
      cropId: cycle.crop_id,
      varietyId: cycle.variety_id,
      season: cycle.cycle_season,
      year: cycle.cycle_year,
      sowingDate: cycle.cycle_sowing_date,
      expectedHarvestDate: cycle.cycle_expected_harvest_date,
      actualHarvestDate: cycle.cycle_actual_harvest_date,
      status: cycle.cycle_status,
      selfDeclaredCrop: cycle.self_declared_crop,
    };

    // Cost of cultivation — read the rollup row keyed on cycle_uuid
    const expenseSummary = await CultivationCycleExpenseSummary.findOne({
      where: { cycle_id: cycle.cycle_uuid, is_active: true },
    });
    if (expenseSummary) {
      costOfCultivation = parseFloat(expenseSummary.total_expenses || 0);
      costPerHectare = parseFloat(expenseSummary.expense_per_hectare || 0);
    }

    // Harvest quantity — read the harvest_records row, convert kg → quintals
    const harvest = await HarvestRecord.findOne({
      where: { cycle_id: cycle.cycle_uuid, is_active: true },
      order: [['harvest_end_date', 'DESC']],
    });
    if (harvest) {
      quantityQuintals = parseFloat(harvest.total_harvest_quantity_kg || 0) / 100;
      harvestDate = harvest.harvest_end_date || harvest.harvest_start_date;
    }
  }

  // Layer the DICE next-EMI context on top — read from the
  // loan_repayment_schedules table directly so we get the next
  // unpaid instalment date and amount, plus the parent loan's
  // interest rate as the carrying cost for the calculator.
  let nextEmi = null;
  let activeLoanApplicationId = null;
  let preSowingAmount = baseDefaults.preSowingAmount;
  let preSowingRate = baseDefaults.preSowingRate;
  let preSowingElapsedDays = baseDefaults.preSowingElapsedDays;

  if (farmerId) {
    // Find the most recent disbursed loan
    const activeLoan = await LoanApplication.findOne({
      where: {
        farmer_id: farmerId,
        is_active: true,
        application_status: { [Op.in]: ['disbursed', 'approved', 'submitted'] },
      },
      order: [['applied_at', 'DESC']],
    });
    if (activeLoan) {
      activeLoanApplicationId = activeLoan.id;
      preSowingAmount = parseFloat(activeLoan.approval_amount || activeLoan.apply_for_amount || 0);
      preSowingRate = parseFloat(activeLoan.approval_interest_rate || baseDefaults.preSowingRate);
      const dispDate = activeLoan.approved_at || activeLoan.applied_at;
      if (dispDate) {
        preSowingElapsedDays = Math.floor(
          (Date.now() - new Date(dispDate).getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      // Pull the next unpaid instalment for the cash-flow nudge
      const nextSchedule = await LoanRepaymentSchedule.findOne({
        where: { application_id: activeLoan.id, is_paid: false, is_active: true },
        order: [['due_date', 'ASC']],
      });
      if (nextSchedule) {
        const dueDate = nextSchedule.due_date;
        const daysToEmi = Math.floor(
          (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        nextEmi = {
          scheduleNumber: nextSchedule.schedule_number,
          dueDate,
          dueAmount: parseFloat(nextSchedule.due_amount || 0),
          daysToEmi,
          status: nextSchedule.status,
        };
      }
    }
  }

  return {
    ...baseDefaults,
    // ROOTS-derived
    cycle: cycleSummary,
    costOfCultivation,
    costPerHectare,
    quantityQuintals,
    harvestDate,
    // DICE-derived
    nextEmi,
    activeLoanApplicationId,
    preSowingAmount,
    preSowingRate,
    preSowingElapsedDays,
  };
};

// ─── PHASE 1 — Persist the recommendation ──────────────────────────
//
// Writes a row to pulse_sell_recommendations so the farmer can come
// back and see what they decided, and so the banker dashboard /
// nudge service can read what's pending. Optional persistence —
// callers pass `persist: true` to opt in.

const saveRecommendation = async ({
  farmerId, cycleUuid, commodityId, scenarios, recommendation,
  linkedLoanApplicationId, loanOutstandingAtRecommendation,
}) => {
  const { PulseSellRecommendation } = getDb();

  const optimal = (() => {
    // Map the engine's bestOption string to the schema's enum
    const best = (recommendation?.bestOption || '').toLowerCase();
    if (best.includes('now') || best.includes('msp')) return 'sell_now';
    if (best.includes('21')) return 'store_15d';
    if (best.includes('45') || best.includes('60')) return 'store_30d';
    return 'sell_now';
  })();

  const row = await PulseSellRecommendation.create({
    recommendation_uuid: generateUUID(),
    farmer_id: farmerId,
    cycle_id: cycleUuid || null,
    commodity_id: commodityId,
    recommended_timing: recommendation?.bestOption || null,
    recommended_price: recommendation?.bestNetPerQtl || null,
    rationale: recommendation?.rationale || null,
    recommendation_generated_date: new Date(),
    linked_loan_application_id: linkedLoanApplicationId || null,
    loan_outstanding_at_recommendation: loanOutstandingAtRecommendation || null,
    sell_now_realisation: scenarios?.now?.netTotal || null,
    store_15d_realisation: scenarios?.d21?.netTotal || null,
    store_30d_realisation: scenarios?.d45?.netTotal || null,
    optimal_strategy: optimal,
    topup_loan_eligible: false,
    topup_loan_max_amount: null,
  });

  logger.info(`Sell recommendation saved: id=${row.id} farmer=${farmerId} cycle=${cycleUuid} optimal=${optimal}`);
  return row;
};

module.exports = {
  calculateSellStoreAnalysis,
  buildCashflowTimeline,
  getSmartDefaults,
  loadDefaultsFromROOTSAndDICE,
  saveRecommendation,
  WAREHOUSE_PRESETS,
  SCENARIO_DAYS,
};
