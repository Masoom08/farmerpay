/**
 * Post-Harvest Market Timing Engine
 *
 * Answers: "Should I sell now or store?"
 *
 * Takes farmer snapshot + commodity, current quantity, storage details and:
 *  1. Models sell-now scenario (current price × quantity)
 *  2. Models store-and-sell-later for 1/2/3+ month windows
 *  3. Accounts for: warehousing cost, quality degradation/spoilage,
 *     interest cost of active loans, and PULSE price forecasts
 *  4. Runs Monte Carlo over price distributions per time window
 *  5. Optionally simulates a post-harvest topup loan (DICE integration)
 *
 * Returns: optimal sell window, expected price trajectory, storage ROI,
 *   risk-of-holding analysis, and recommendation.
 *
 * No DB access — pure function on snapshot + benchmarks.
 */

const { forecastPrice, SEASONAL_INDICES } = require('../computation/priceForecaster');
const { runMonteCarlo, DEFAULT_DISTRIBUTIONS } = require('../computation/monteCarloSimulator');
const { comparePriceToMarket } = require('../computation/benchmarkComparer');

// ─── Default Storage Parameters (Indian warehousing context) ────────

const DEFAULT_WAREHOUSING_COST_PER_QUINTAL_MONTH = 50; // ₹50/quintal/month (typical WDRA-registered warehouse)
const DEFAULT_QUALITY_DEGRADATION_PCT_PER_MONTH = 1.0; // 1% weight/quality loss per month
const DEFAULT_INTEREST_RATE_ANNUAL = 7.0; // Opportunity cost / loan interest

// ─── Main Compute ───────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot
 * @param {Array}  params.benchmarks
 * @param {object} params.input - Validated request body
 * @returns {object} Full result matching Market Timing API contract
 */
const compute = ({ snapshot, benchmarks, input }) => {
  const {
    commodity_id,
    quantity_quintals,
    current_price_per_quintal,
    storage_options = {},
    active_loan_id,
    include_topup_loan_simulation = false,
    computation_mode = 'deterministic',
    monte_carlo_runs = 1000,
  } = input;

  // ── Resolve current market price ──
  const spotPrice = resolveSpotPrice(snapshot, commodity_id, current_price_per_quintal);

  // ── Storage parameters ──
  const warehousingCost = storage_options.warehousing_cost_per_quintal_month || DEFAULT_WAREHOUSING_COST_PER_QUINTAL_MONTH;
  const degradationPct = storage_options.quality_degradation_pct_per_month || DEFAULT_QUALITY_DEGRADATION_PCT_PER_MONTH;
  const storageDurations = storage_options.storage_duration_months || [1, 2, 3];

  // ── Active loan interest cost ──
  const loanInterestMonthly = resolveLoanInterestCost(snapshot, active_loan_id, spotPrice, quantity_quintals);

  // ── Price forecast from snapshot ──
  const priceProjection = forecastPrice({
    commodityId: commodity_id,
    snapshot,
    season: detectSeason(),
    activityType: 'crop',
    horizonMonths: Math.max(...storageDurations) + 1,
  });

  // ── Sell-now scenario ──
  const sellNow = computeSellNow(spotPrice, quantity_quintals);

  // ── Store-and-sell scenarios ──
  const storageScenarios = storageDurations.map(months =>
    computeStorageScenario({
      spotPrice, quantity_quintals, months,
      warehousingCost, degradationPct, loanInterestMonthly,
      priceProjection, snapshot, commodity_id,
    })
  );

  // ── Monte Carlo (if requested) ──
  let monteCarloResults = null;
  if (computation_mode === 'monte_carlo') {
    monteCarloResults = storageDurations.map(months =>
      runStorageMC({
        spotPrice, quantity_quintals, months,
        warehousingCost, degradationPct, loanInterestMonthly,
        numRuns: monte_carlo_runs, snapshot, commodity_id,
      })
    );
  }

  // ── Topup loan simulation (optional) ──
  let topupLoanSimulation = null;
  if (include_topup_loan_simulation) {
    topupLoanSimulation = simulateTopupLoan(spotPrice, quantity_quintals, storageScenarios);
  }

  // ── Price comparison to market ──
  const benchmark = findCropBenchmark(benchmarks, commodity_id);
  const priceComparison = comparePriceToMarket({
    farmerPrice: spotPrice,
    benchmarkPrice: benchmark ? parseFloat(benchmark.avg_revenue_per_hectare) / (parseFloat(benchmark.avg_yield_kg_per_hectare) / 100 || 1) : null,
    commodityId: commodity_id,
  });

  // ── Find optimal window ──
  const optimal = findOptimalWindow(sellNow, storageScenarios, monteCarloResults);

  // ── Build scenarios for drishtiService storage ──
  const scenarios = [
    formatScenario('sell_now', sellNow, spotPrice),
    ...storageScenarios.map((s, i) =>
      formatScenario(`store_${s.months}m`, s, spotPrice)
    ),
  ];

  // ── Recommendations ──
  const recommendations = generateRecommendations(
    sellNow, storageScenarios, optimal, monteCarloResults, priceProjection, topupLoanSimulation
  );

  return {
    farmerSummary: buildFarmerSummary(snapshot),
    commodity: {
      commodity_id,
      quantity_quintals,
      current_price_per_quintal: spotPrice,
      current_total_value: sellNow.netProceeds,
      price_trend: priceProjection.priceTrend,
      price_confidence: priceProjection.confidence,
    },
    storageParameters: {
      warehousing_cost_per_quintal_month: warehousingCost,
      quality_degradation_pct_per_month: degradationPct,
      loan_interest_cost_monthly: loanInterestMonthly,
      durations_analyzed: storageDurations,
    },
    sellNow: {
      price_per_quintal: spotPrice,
      gross_value: sellNow.grossValue,
      net_proceeds: sellNow.netProceeds,
    },
    storageScenarios: storageScenarios.map((s, i) => ({
      months: s.months,
      projected_price: s.projectedPrice,
      projected_price_range: s.priceRange,
      gross_value_at_sale: s.grossValueAtSale,
      storage_cost: s.storageCost,
      quality_loss_value: s.qualityLossValue,
      interest_cost: s.interestCost,
      net_proceeds: s.netProceeds,
      net_gain_vs_sell_now: s.netGainVsSellNow,
      storage_roi_pct: s.storageRoiPct,
      probability_of_gain: monteCarloResults ? monteCarloResults[i].probabilityOfGain : null,
    })),
    priceTrajectory: {
      monthly_prices: priceProjection.monthlyPrices.slice(0, Math.max(...storageDurations) + 1),
      method: priceProjection.method,
      confidence: priceProjection.confidence,
    },
    monteCarlo: monteCarloResults ? monteCarloResults.map((mc, i) => ({
      storage_months: storageDurations[i],
      num_runs: mc.numRuns,
      probability_of_gain: mc.probabilityOfGain,
      expected_gain: mc.expectedGain,
      gain_p10: mc.gainP10,
      gain_p50: mc.gainP50,
      gain_p90: mc.gainP90,
      max_loss: mc.maxLoss,
      max_gain: mc.maxGain,
    })) : null,
    optimalWindow: optimal,
    topupLoanSimulation,
    priceComparison,
    scenarios,
    riskFactors: identifyRiskFactors(storageScenarios, priceProjection, monteCarloResults),
    recommendations,
  };
};

// ─── Sell Now ───────────────────────────────────────────────────────

const computeSellNow = (spotPrice, quantity) => {
  const grossValue = round2(spotPrice * quantity);
  // Assume 1% market fee + transportation
  const marketFees = round2(grossValue * 0.01);
  const netProceeds = round2(grossValue - marketFees);

  return { grossValue, marketFees, netProceeds, price: spotPrice };
};

// ─── Storage Scenario ───────────────────────────────────────────────

const computeStorageScenario = ({
  spotPrice, quantity_quintals, months,
  warehousingCost, degradationPct, loanInterestMonthly,
  priceProjection, snapshot, commodity_id,
}) => {
  // Projected price at sale time
  const projectedPrice = priceProjection.monthlyPrices[months] || spotPrice;
  const priceMin = round2(projectedPrice * 0.85);
  const priceMax = round2(projectedPrice * 1.15);

  // Quality degradation: reduced effective quantity
  const effectiveQuantity = round2(quantity_quintals * Math.pow(1 - degradationPct / 100, months));
  const quantityLost = round2(quantity_quintals - effectiveQuantity);

  // Revenue at future price
  const grossValueAtSale = round2(projectedPrice * effectiveQuantity);

  // Costs
  const storageCost = round2(warehousingCost * quantity_quintals * months);
  const qualityLossValue = round2(quantityLost * projectedPrice);
  const interestCost = round2(loanInterestMonthly * months);

  const totalCosts = round2(storageCost + interestCost);
  const marketFees = round2(grossValueAtSale * 0.01);
  const netProceeds = round2(grossValueAtSale - totalCosts - marketFees);

  // Compare to sell-now
  const sellNowNet = computeSellNow(spotPrice, quantity_quintals).netProceeds;
  const netGainVsSellNow = round2(netProceeds - sellNowNet);
  const storageRoiPct = totalCosts > 0
    ? round2((netGainVsSellNow / totalCosts) * 100)
    : netGainVsSellNow > 0 ? 100 : 0;

  return {
    months,
    projectedPrice,
    priceRange: { min: priceMin, max: priceMax },
    effectiveQuantity,
    quantityLost,
    grossValueAtSale,
    storageCost,
    qualityLossValue,
    interestCost,
    totalCosts,
    netProceeds,
    netGainVsSellNow,
    storageRoiPct,
  };
};

// ─── Monte Carlo Storage ────────────────────────────────────────────

const runStorageMC = ({
  spotPrice, quantity_quintals, months,
  warehousingCost, degradationPct, loanInterestMonthly,
  numRuns, snapshot, commodity_id,
}) => {
  const gains = [];
  const sellNowNet = computeSellNow(spotPrice, quantity_quintals).netProceeds;

  const computeFn = (vars) => {
    const futurePrice = spotPrice * vars.price_factor;
    const effectiveQty = quantity_quintals * Math.pow(1 - degradationPct / 100, months);
    const grossValue = futurePrice * effectiveQty;
    const costs = (warehousingCost * quantity_quintals * months) + (loanInterestMonthly * months);
    const marketFee = grossValue * 0.01;
    const netProceeds = grossValue - costs - marketFee;
    const gain = netProceeds - sellNowNet;

    gains.push(gain);

    return {
      netIncome: gain,
      net_income: gain,
      healthStatus: gain >= 0 ? 'good' : 'stressed',
      smaClass: gain >= 0 ? 'standard' : 'npa',
    };
  };

  // Price factor distribution centered on projected seasonal movement
  const seasonalIdx = SEASONAL_INDICES.kharif || SEASONAL_INDICES.default;
  const now = new Date();
  const futureMonthIdx = (now.getMonth() + months) % 12;
  const currentMonthIdx = now.getMonth();
  const seasonalShift = seasonalIdx[futureMonthIdx] / (seasonalIdx[currentMonthIdx] || 1);

  runMonteCarlo({
    computeFn,
    baseVariables: { price_factor: seasonalShift },
    distributions: {
      price_factor: { mean: seasonalShift, stddev: 0.12, min: 0.5, max: 2.0, type: 'normal' },
    },
    numRuns,
    varyVariables: ['price_factor'],
  });

  gains.sort((a, b) => a - b);

  const probabilityOfGain = gains.filter(g => g > 0).length / numRuns;
  const expectedGain = round2(gains.reduce((s, g) => s + g, 0) / numRuns);

  return {
    months,
    numRuns,
    probabilityOfGain: round2(probabilityOfGain),
    expectedGain,
    gainP10: percentile(gains, 10),
    gainP50: percentile(gains, 50),
    gainP90: percentile(gains, 90),
    maxLoss: round2(gains[0] || 0),
    maxGain: round2(gains[gains.length - 1] || 0),
  };
};

// ─── Topup Loan Simulation ──────────────────────────────────────────

const simulateTopupLoan = (spotPrice, quantity, storageScenarios) => {
  // Post-harvest topup: bank lends ~70% of produce value against warehouse receipt
  const produceValue = spotPrice * quantity;
  const loanAmount = round2(produceValue * 0.70);
  const interestRate = 7.0;
  const monthlyInterest = round2(loanAmount * (interestRate / 100 / 12));

  const scenarios = storageScenarios.map(s => {
    const totalInterest = round2(monthlyInterest * s.months);
    const netAfterRepayment = round2(s.netProceeds - loanAmount - totalInterest);
    const immediateAccess = loanAmount; // Farmer gets cash immediately

    return {
      storage_months: s.months,
      loan_amount: loanAmount,
      interest_paid: totalInterest,
      sale_proceeds: s.netProceeds,
      net_after_repayment: netAfterRepayment,
      immediate_cash_access: immediateAccess,
      benefit: `Immediate ₹${Math.round(loanAmount).toLocaleString('en-IN')} cash while storing produce`,
    };
  });

  return {
    eligible_loan_amount: loanAmount,
    interest_rate: interestRate,
    collateral: `${quantity} quintals warehouse receipt`,
    scenarios,
  };
};

// ─── Optimal Window Finder ──────────────────────────────────────────

const findOptimalWindow = (sellNow, storageScenarios, monteCarloResults) => {
  // Score each option
  const options = [
    {
      action: 'sell_now',
      months: 0,
      netProceeds: sellNow.netProceeds,
      gainVsSellNow: 0,
      probabilityOfGain: 1.0, // certainty
      score: sellNow.netProceeds, // baseline
    },
    ...storageScenarios.map((s, i) => {
      const mcProb = monteCarloResults ? monteCarloResults[i].probabilityOfGain : (s.netGainVsSellNow > 0 ? 0.6 : 0.3);
      // Score = expected value adjusted for risk
      // Higher probability of gain and higher gain = higher score
      const riskAdjustedGain = s.netGainVsSellNow * mcProb;
      return {
        action: `store_${s.months}m`,
        months: s.months,
        netProceeds: s.netProceeds,
        gainVsSellNow: s.netGainVsSellNow,
        probabilityOfGain: round2(mcProb),
        score: sellNow.netProceeds + riskAdjustedGain,
      };
    }),
  ];

  // Sort by score descending
  options.sort((a, b) => b.score - a.score);
  const best = options[0];

  return {
    recommended_action: best.action,
    recommended_months: best.months,
    expected_net_proceeds: best.netProceeds,
    gain_vs_sell_now: best.gainVsSellNow,
    probability_of_gain: best.probabilityOfGain,
    confidence: best.probabilityOfGain >= 0.65 ? 'high' : best.probabilityOfGain >= 0.45 ? 'medium' : 'low',
    all_options: options,
  };
};

// ─── Risk Factors ───────────────────────────────────────────────────

const identifyRiskFactors = (storageScenarios, priceProjection, mcResults) => {
  const factors = [];

  // Price forecast confidence
  if (priceProjection.confidence === 'none' || priceProjection.confidence === 'low') {
    factors.push({
      factor: 'Low price forecast confidence',
      impact: 'high',
      message_key: 'drishti.risk.price_uncertainty',
      message: 'Price forecasts have low confidence — actual prices may vary significantly',
    });
  }

  // Quality degradation risk
  const longestStorage = storageScenarios[storageScenarios.length - 1];
  if (longestStorage && longestStorage.quantityLost > 0) {
    const lossPct = round2((longestStorage.quantityLost / (longestStorage.effectiveQuantity + longestStorage.quantityLost)) * 100);
    factors.push({
      factor: 'Storage quality loss',
      impact: lossPct > 3 ? 'medium' : 'low',
      message_key: 'drishti.risk.quality_loss',
      message: `Storing for ${longestStorage.months} months causes ~${lossPct}% quality/weight loss`,
    });
  }

  // MC risk
  if (mcResults) {
    const worstMC = mcResults.find(mc => mc.probabilityOfGain < 0.5);
    if (worstMC) {
      factors.push({
        factor: 'Price decline risk',
        impact: 'high',
        message_key: 'drishti.risk.price_decline',
        message: `Storing for ${worstMC.months} months has ${Math.round((1 - worstMC.probabilityOfGain) * 100)}% chance of loss`,
      });
    }
  }

  // Falling price trend
  if (priceProjection.priceTrend === 'falling') {
    factors.push({
      factor: 'Falling price trend',
      impact: 'high',
      message_key: 'drishti.risk.falling_prices',
      message: 'Current price trend is downward — storing may result in selling at lower prices',
    });
  }

  return factors;
};

// ─── Recommendations ────────────────────────────────────────────────

const generateRecommendations = (sellNow, storageScenarios, optimal, mcResults, priceProjection, topupLoan) => {
  const recs = [];

  // Primary recommendation
  if (optimal.recommended_action === 'sell_now') {
    recs.push({
      type: 'action',
      message_key: 'drishti.rec.sell_now',
      message: `Sell now at ₹${Math.round(sellNow.price).toLocaleString('en-IN')}/quintal — storage costs and quality loss outweigh potential price gains`,
    });
  } else {
    const gain = Math.round(optimal.gain_vs_sell_now);
    recs.push({
      type: 'action',
      message_key: 'drishti.rec.store_and_sell',
      message: `Store for ${optimal.recommended_months} month(s) — expected gain of ₹${gain.toLocaleString('en-IN')} over selling today (${Math.round(optimal.probability_of_gain * 100)}% confidence)`,
    });
  }

  // Price trend info
  if (priceProjection.priceTrend === 'rising') {
    recs.push({
      type: 'info',
      message_key: 'drishti.rec.price_rising',
      message: 'Prices are trending upward — storing may capture further gains',
    });
  } else if (priceProjection.priceTrend === 'falling') {
    recs.push({
      type: 'warning',
      message_key: 'drishti.rec.price_falling',
      message: 'Prices are trending downward — consider selling sooner rather than later',
    });
  }

  // Topup loan option
  if (topupLoan) {
    recs.push({
      type: 'info',
      message_key: 'drishti.rec.topup_loan',
      message: `You can get a post-harvest topup loan of ₹${Math.round(topupLoan.eligible_loan_amount).toLocaleString('en-IN')} against your warehouse receipt — access cash while waiting for better prices`,
    });
  }

  // Best storage window details
  const profitableWindows = storageScenarios.filter(s => s.netGainVsSellNow > 0);
  if (profitableWindows.length > 0) {
    const bestWindow = profitableWindows.reduce((best, s) =>
      s.storageRoiPct > best.storageRoiPct ? s : best
    );
    recs.push({
      type: 'info',
      message_key: 'drishti.rec.best_roi',
      message: `Best storage ROI: ${bestWindow.months} month(s) with ${bestWindow.storageRoiPct}% return on storage costs`,
    });
  }

  // Quality warning for long storage
  const longestStorage = storageScenarios[storageScenarios.length - 1];
  if (longestStorage && longestStorage.quantityLost > 0.5) {
    recs.push({
      type: 'warning',
      message_key: 'drishti.rec.quality_warning',
      message: `Storing for ${longestStorage.months} months loses ${round2(longestStorage.quantityLost)} quintals to degradation`,
    });
  }

  return recs;
};

// ─── Helpers ────────────────────────────────────────────────────────

const resolveSpotPrice = (snapshot, commodityId, override) => {
  if (override && override > 0) return override;
  const prices = snapshot.relevant_commodity_prices || [];
  const match = prices.find(p => p.commodityId === commodityId);
  if (match && match.currentPrice) return match.currentPrice;
  return 2200; // default ₹2200/quintal (rough average for food grains)
};

const resolveLoanInterestCost = (snapshot, activeLoanId, spotPrice, quantity) => {
  if (!activeLoanId && !snapshot.active_loans) return 0;

  // If farmer has active loans, the opportunity cost of holding produce
  // instead of selling and repaying is the monthly interest on outstanding
  const loans = snapshot.active_loans || [];
  const loan = activeLoanId
    ? loans.find(l => l.applicationId === activeLoanId)
    : loans[0]; // use first active loan

  if (!loan) return 0;

  const outstanding = parseFloat(loan.outstanding) || 0;
  const interestRate = parseFloat(loan.interestRate) || DEFAULT_INTEREST_RATE_ANNUAL;
  return round2(outstanding * (interestRate / 100 / 12));
};

const detectSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 11) return 'kharif';
  if (month >= 11 || month <= 3) return 'rabi';
  return 'summer';
};

const findCropBenchmark = (benchmarks, cropId) => {
  if (!benchmarks || benchmarks.length === 0) return null;
  return benchmarks.find(b => b.crop_id === cropId && b.activity_type === 'crop')
    || benchmarks.find(b => b.activity_type === 'crop')
    || null;
};

const formatScenario = (label, data, spotPrice) => ({
  label,
  label_key: `drishti.scenario.${label}`,
  description: label === 'sell_now'
    ? `Sell immediately at ₹${Math.round(spotPrice)}/quintal`
    : `Store for ${data.months} month(s), sell at projected price`,
  assumptions: {
    months: data.months || 0,
    projected_price: data.projectedPrice || spotPrice,
  },
  projections: {
    total_revenue: data.grossValueAtSale || data.grossValue || 0,
    total_cost: data.totalCosts || data.marketFees || 0,
    net_farm_income: data.netProceeds || 0,
    total_income_with_other: data.netProceeds || 0,
    emi_burden_monthly: 0,
    emi_to_income_ratio: 0,
    breakeven_yield_kg_per_hectare: null,
    projected_yield_kg_per_hectare: null,
    yield_safety_margin_pct: null,
    health_status: (data.netGainVsSellNow || 0) >= 0 ? 'good' : 'watch',
    sma_classification: 'standard',
    income_adequacy: 'adequate',
    risk_score: null,
  },
  monthly_cashflow: [],
  cash_flow_summary: {},
});

const buildFarmerSummary = (snapshot) => ({
  district_id: snapshot.district_id,
  total_land_hectares: parseFloat(snapshot.total_farm_size_hectares) || 0,
  trust_score: snapshot.trust_score,
  existing_loan_emi: parseFloat(snapshot.total_monthly_emi) || 0,
});

const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return round2(sorted[lo]);
  return round2(sorted[lo] * (1 - (idx - lo)) + sorted[hi] * (idx - lo));
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = { compute };
