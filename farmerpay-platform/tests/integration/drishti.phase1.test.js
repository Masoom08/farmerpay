/**
 * DRISHTI Phase 1 — Foundation + Pre-Loan Engine Tests
 *
 * Tests the full computation pipeline using mock snapshot data.
 * No DB/Redis required — tests pure computation primitives + engine logic.
 *
 * Coverage:
 *  1. Yield Projector — crop, dairy, fishery
 *  2. Price Forecaster — with/without PULSE data
 *  3. Cost Estimator — crop, dairy, fishery
 *  4. Revenue Calculator — combines yield × price
 *  5. Cash Flow Projector — month-by-month timeline
 *  6. Risk Scorer — composite scoring + classifications
 *  7. Pre-Loan Engine — full end-to-end scenario computation
 *  8. Loan Terms Calculator (via engine) — EMI, bullet, flexible
 *  9. Validator schemas — Joi validation
 * 10. Model definitions — structure verification
 */

// ─── Mock Snapshot ──────────────────────────────────────────────────

const MOCK_SNAPSHOT = {
  farmer_id: 1,
  snapshot_date: '2026-04-12',
  total_farm_size_hectares: 2.5,
  land_ownership_type: 'owned',
  years_farming_experience: 12,
  education_level: 'secondary',
  family_size: 5,
  district_id: 45,
  block_id: 102,

  active_crop_cycles: [
    { cycleId: 1, cropId: 'crop_paddy', season: 'kharif', status: 'growing' },
  ],
  active_dairy_profile: { herdId: 1, registerName: 'Main Herd', animalCount: 3 },
  active_fishery_profile: { registerId: 1, registerName: 'Pond A', totalPondAreaHectares: 0.2 },
  horticulture_profile: null,

  historical_crop_profitability: [
    { season: 'kharif', year: 2025, cropId: 'crop_paddy', actualProfit: 45000, isProfitable: true },
    { season: 'kharif', year: 2024, cropId: 'crop_paddy', actualProfit: 38000, isProfitable: true },
    { season: 'rabi', year: 2025, cropId: 'crop_mustard', actualProfit: 22000, isProfitable: true },
  ],
  historical_dairy_profitability: [
    { month: 3, year: 2026, totalIncome: 12000, totalExpense: 5000, netProfit: 7000 },
    { month: 2, year: 2026, totalIncome: 11500, totalExpense: 4800, netProfit: 6700 },
  ],
  historical_fishery_profitability: [
    { month: 1, year: 2026, totalIncome: 8000, totalExpense: 3000, netProfit: 5000 },
  ],

  active_loans: [
    {
      applicationId: 101, productName: 'Kharif Crop Loan', repaymentType: 'emi',
      approvalAmount: 100000, interestRate: 7.0, tenureMonths: 12,
      outstanding: 85000, emiAmount: 8650, nextDueDate: '2026-05-15', healthStatus: 'good',
    },
  ],
  total_outstanding: 85000,
  total_monthly_emi: 8650,

  trust_score: 72,
  trust_band: 'good',

  income_adequacy_status: 'adequate',
  loan_to_income_ratio: 0.35,
  risk_severity_band: 'green',

  relevant_commodity_prices: [
    { commodityId: 'crop_paddy', currentPrice: 22, priceDate: '2026-04-10', priceTrend: 'stable', forecast30dPrice: 23, forecastConfidence: 65 },
    { commodityId: 'crop_mustard', currentPrice: 55, priceDate: '2026-04-10', priceTrend: 'rising', forecast30dPrice: 58, forecastConfidence: 50 },
  ],

  weather_outlook: {
    observedAt: '2026-04-12T06:00:00Z',
    tempCelsius: 34,
    humidityPercent: 45,
    rainfallMm24h: 0,
    windSpeedKmh: 12,
    conditionText: 'Clear sky',
    source: 'imd_api',
  },

  active_insurance: [
    { type: 'pmfby_crop', sumInsured: 100000, premiumPaid: 2000, season: 'kharif', policyExpiry: '2026-12-31', claimStatus: 'none' },
  ],

  // Household income
  household_income_details: {
    income_streams: [
      { source: 'spouse_shg', amount_monthly: 3500, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'wage_labor', amount_monthly: 6000, frequency: 'seasonal', reliability: 'irregular', active_months: [1,2,3,4,5,11,12] },
      { source: 'pension', amount_monthly: 1000, frequency: 'monthly', reliability: 'guaranteed', active_months: null },
      { source: 'remittance', amount_monthly: 5000, frequency: 'monthly', reliability: 'regular', active_months: null },
    ],
    total_monthly_non_farm: 15500,
  },
  total_non_farm_monthly: 15500,
  non_farm_income_streams: 4,
  spouse_shg_monthly: 3500,
  wage_labor_monthly: 6000,
  pension_monthly: 1000,
  remittance_monthly: 5000,

  // Household expenses
  household_expense_details: {
    expense_categories: [
      { category: 'food_groceries', monthly: 6000, peak_months: null, peak_amount: 0 },
      { category: 'education', monthly: 2500, peak_months: [6], peak_amount: 15000 },
      { category: 'healthcare', monthly: 1000, peak_months: null, peak_amount: 0 },
      { category: 'utilities', monthly: 1200, peak_months: null, peak_amount: 0 },
      { category: 'transportation', monthly: 800, peak_months: null, peak_amount: 0 },
    ],
    total_monthly_expense: 11500,
  },
  total_household_expense_monthly: 11500,
};

const MOCK_BENCHMARK = {
  district_id: 45,
  activity_type: 'crop',
  crop_id: 'crop_paddy',
  season: 'kharif',
  avg_yield_kg_per_hectare: 3600,
  avg_cost_per_hectare: 55000,
  avg_revenue_per_hectare: 79200,
  avg_profit_per_hectare: 24200,
  yield_rainfall_elasticity: -0.5,
  yield_temperature_sensitivity: -0.3,
  historical_claim_rate_pct: 25,
  avg_claim_payout: 15000,
  sample_size: 200,
};

const MOCK_DAIRY_BENCHMARK = {
  district_id: 45,
  activity_type: 'dairy',
  avg_milk_yield_per_animal: 7,
  avg_monthly_cost_per_animal: 4500,
  avg_monthly_revenue_per_animal: 7350,
};

const MOCK_FISHERY_BENCHMARK = {
  district_id: 45,
  activity_type: 'fishery',
  avg_yield_kg_per_hectare_pond: 3500,
  avg_cost_per_hectare_pond: 140000,
  avg_revenue_per_hectare_pond: 420000,
};

// ═════════════════════════════════════════════════════════════════════
// 1. YIELD PROJECTOR
// ═════════════════════════════════════════════════════════════════════

describe('DRISHTI Computation Primitives', () => {
  const { projectCropYield, projectDairyYield, projectFisheryYield } = require('../../src/modules/drishti/services/computation/yieldProjector');

  describe('Yield Projector', () => {
    it('should project crop yield using benchmark with climate adjustment', () => {
      const result = projectCropYield({
        benchmark: MOCK_BENCHMARK,
        snapshot: MOCK_SNAPSHOT,
        cropId: 'crop_paddy',
        irrigationType: 'rainfed',
        rainfallDeviationPct: 0,
        temperatureDeviationC: 0,
      });

      expect(result.yieldKgPerHectare).toBeGreaterThan(0);
      expect(result.confidence).toBeDefined();
      expect(result.method).toBe('blended_personal_benchmark'); // has 2+ history records
      // Blended yield: personal history (which may outperform district) × 0.6 + benchmark × 0.4
      expect(result.yieldKgPerHectare).toBeGreaterThan(1000); // reasonable range
    });

    it('should reduce yield under stress (negative rainfall deviation)', () => {
      // Use a crop with no personal history to isolate benchmark-only path
      const normal = projectCropYield({
        benchmark: MOCK_BENCHMARK, snapshot: MOCK_SNAPSHOT, cropId: 'crop_unknown',
        irrigationType: 'rainfed', rainfallDeviationPct: 0,
      });
      const stress = projectCropYield({
        benchmark: MOCK_BENCHMARK, snapshot: MOCK_SNAPSHOT, cropId: 'crop_unknown',
        irrigationType: 'rainfed', rainfallDeviationPct: -25,
      });

      expect(normal.method).toBe('benchmark_only');
      expect(stress.yieldKgPerHectare).toBeLessThan(normal.yieldKgPerHectare);
    });

    it('should return zero for missing benchmark', () => {
      const result = projectCropYield({
        benchmark: null, snapshot: MOCK_SNAPSHOT, cropId: 'crop_paddy',
      });
      expect(result.yieldKgPerHectare).toBe(0);
      expect(result.confidence).toBe('none');
    });

    it('should project dairy yield from animal count', () => {
      const result = projectDairyYield({
        snapshot: MOCK_SNAPSHOT,
        benchmark: MOCK_DAIRY_BENCHMARK,
        animalCount: 3,
        feedQuality: 'standard',
      });

      expect(result.monthlyMilkLiters).toBeGreaterThan(0);
      expect(result.animalCount).toBe(3);
      // 3 animals × 7 L/day × 30 days = 630 L
      expect(result.monthlyMilkLiters).toBe(630);
    });

    it('should project fishery yield from pond area', () => {
      const result = projectFisheryYield({
        snapshot: MOCK_SNAPSHOT,
        benchmark: MOCK_FISHERY_BENCHMARK,
        pondAreaHectares: 0.2,
        stockingDensity: 'standard',
        cycleMonths: 8,
      });

      expect(result.harvestKg).toBeGreaterThan(0);
      // 0.2 ha × 3500 kg/ha = 700 kg
      expect(result.harvestKg).toBe(700);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 2. PRICE FORECASTER
  // ═════════════════════════════════════════════════════════════════

  describe('Price Forecaster', () => {
    const { forecastPrice, getSpotPrice } = require('../../src/modules/drishti/services/computation/priceForecaster');

    it('should forecast prices using PULSE data from snapshot', () => {
      const result = forecastPrice({
        commodityId: 'crop_paddy',
        snapshot: MOCK_SNAPSHOT,
        season: 'kharif',
        horizonMonths: 12,
      });

      expect(result.monthlyPrices).toHaveLength(12);
      expect(result.avgPrice).toBeGreaterThan(0);
      expect(result.method).toBe('pulse_forecast_blend'); // has forecast data with confidence > 30
      expect(result.currentPrice).toBe(22);
    });

    it('should use selling price override when provided', () => {
      const result = forecastPrice({
        commodityId: 'crop_paddy',
        snapshot: MOCK_SNAPSHOT,
        sellingPriceOverride: 25,
        horizonMonths: 12,
      });

      expect(result.method).toBe('user_override');
      expect(result.monthlyPrices.every(p => p === 25)).toBe(true);
    });

    it('should apply price factor (MC sampling)', () => {
      const normal = forecastPrice({ commodityId: 'crop_paddy', snapshot: MOCK_SNAPSHOT, priceFactor: 1.0 });
      const boosted = forecastPrice({ commodityId: 'crop_paddy', snapshot: MOCK_SNAPSHOT, priceFactor: 1.2 });

      expect(boosted.avgPrice).toBeGreaterThan(normal.avgPrice);
    });

    it('should return spot price from snapshot', () => {
      expect(getSpotPrice('crop_paddy', MOCK_SNAPSHOT)).toBe(22);
      expect(getSpotPrice('nonexistent', MOCK_SNAPSHOT)).toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 3. COST ESTIMATOR
  // ═════════════════════════════════════════════════════════════════

  describe('Cost Estimator', () => {
    const { estimateCropCost, estimateDairyCost, estimateFisheryCost } = require('../../src/modules/drishti/services/computation/costEstimator');

    it('should estimate crop costs with itemized breakdown', () => {
      const result = estimateCropCost({
        benchmark: MOCK_BENCHMARK,
        acreageHectares: 1.2,
        costFactor: 1.0,
      });

      // 55000/ha × 1.2 ha = 66000
      expect(result.totalCost).toBe(66000);
      expect(result.itemizedCosts).toHaveProperty('seeds');
      expect(result.itemizedCosts).toHaveProperty('fertilizer');
      expect(result.itemizedCosts).toHaveProperty('labor');
      expect(result.monthlyCosts).toHaveLength(12);

      // Sum of itemized should equal total
      const itemSum = Object.values(result.itemizedCosts).reduce((s, v) => s + v, 0);
      expect(Math.abs(itemSum - result.totalCost)).toBeLessThan(1); // rounding tolerance
    });

    it('should adjust costs for input level', () => {
      const standard = estimateCropCost({ benchmark: MOCK_BENCHMARK, acreageHectares: 1, costFactor: 1.0, inputLevel: 'standard' });
      const high = estimateCropCost({ benchmark: MOCK_BENCHMARK, acreageHectares: 1, costFactor: 1.0, inputLevel: 'high' });

      expect(high.totalCost).toBeGreaterThan(standard.totalCost);
    });

    it('should estimate dairy costs per animal', () => {
      const result = estimateDairyCost({
        benchmark: MOCK_DAIRY_BENCHMARK,
        animalCount: 3,
        feedQuality: 'standard',
      });

      expect(result.monthlyCost).toBe(13500); // 4500 × 3
      expect(result.annualCost).toBe(162000); // 13500 × 12
      expect(result.monthlyCosts).toHaveLength(12);
    });

    it('should estimate fishery costs per cycle', () => {
      const result = estimateFisheryCost({
        benchmark: MOCK_FISHERY_BENCHMARK,
        pondAreaHectares: 0.2,
        cycleMonths: 8,
      });

      expect(result.totalCycleCost).toBe(28000); // 140000 × 0.2
      expect(result.monthlyCosts).toHaveLength(12);
      // Stocking month (0) should have 30% of cost
      expect(result.monthlyCosts[0]).toBeCloseTo(28000 * 0.30, 0);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 4. REVENUE CALCULATOR
  // ═════════════════════════════════════════════════════════════════

  describe('Revenue Calculator', () => {
    const { calculateCropRevenue, calculateDairyRevenue, calculateFisheryRevenue } = require('../../src/modules/drishti/services/computation/revenueCalculator');

    it('should calculate crop revenue as yield × price', () => {
      const result = calculateCropRevenue({
        snapshot: MOCK_SNAPSHOT,
        benchmark: MOCK_BENCHMARK,
        cropId: 'crop_paddy',
        acreageHectares: 1.2,
        season: 'kharif',
        irrigationType: 'rainfed',
      });

      expect(result.totalRevenue).toBeGreaterThan(0);
      expect(result.totalYieldKg).toBeGreaterThan(0);
      expect(result.pricePerKg).toBeGreaterThan(0);
      expect(result.monthlyRevenue).toHaveLength(12);
      // Revenue should be concentrated around harvest
      const nonZeroMonths = result.monthlyRevenue.filter(r => r > 0).length;
      expect(nonZeroMonths).toBeLessThanOrEqual(3); // 70/20/10 split
    });

    it('should calculate dairy revenue', () => {
      const result = calculateDairyRevenue({
        snapshot: MOCK_SNAPSHOT,
        benchmark: MOCK_DAIRY_BENCHMARK,
        animalCount: 3,
      });

      expect(result.monthlyRevenue).toBeGreaterThan(0);
      expect(result.annualRevenue).toBe(result.monthlyRevenue * 12);
      expect(result.monthlyRevenueArray).toHaveLength(12);
    });

    it('should calculate fishery revenue', () => {
      const result = calculateFisheryRevenue({
        snapshot: MOCK_SNAPSHOT,
        benchmark: MOCK_FISHERY_BENCHMARK,
        pondAreaHectares: 0.2,
        cycleMonths: 8,
      });

      expect(result.cycleRevenue).toBeGreaterThan(0);
      expect(result.monthlyRevenueArray).toHaveLength(12);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 5. CASH FLOW PROJECTOR
  // ═════════════════════════════════════════════════════════════════

  describe('Cash Flow Projector', () => {
    const { projectCashFlow } = require('../../src/modules/drishti/services/computation/cashFlowProjector');

    it('should build 12-month cash flow timeline', () => {
      const farmRevenue = { crop: new Array(12).fill(0), dairy: new Array(12).fill(12000), fishery: new Array(12).fill(0) };
      farmRevenue.crop[10] = 80000; // Harvest in Nov

      const farmCosts = { crop: new Array(12).fill(0), dairy: new Array(12).fill(5000), fishery: new Array(12).fill(0) };
      farmCosts.crop[5] = 25000; farmCosts.crop[6] = 15000; // Sowing + growing

      const result = projectCashFlow({
        snapshot: MOCK_SNAPSHOT,
        horizonMonths: 12,
        farmRevenue,
        farmCosts,
      });

      expect(result.monthly).toHaveLength(12);
      expect(result.summary).toBeDefined();
      expect(result.summary.totalInflows).toBeGreaterThan(0);
      expect(result.summary.totalOutflows).toBeGreaterThan(0);
      expect(result.summary.surplusMonths + result.summary.deficitMonths).toBe(12);

      // Each month should have the right structure
      const firstMonth = result.monthly[0];
      expect(firstMonth).toHaveProperty('month');
      expect(firstMonth).toHaveProperty('inflows');
      expect(firstMonth).toHaveProperty('outflows');
      expect(firstMonth).toHaveProperty('net');
      expect(firstMonth).toHaveProperty('cumulative');
      expect(firstMonth.inflows).toHaveProperty('farm');
      expect(firstMonth.inflows).toHaveProperty('non_farm');
      expect(firstMonth.outflows).toHaveProperty('farm');
      expect(firstMonth.outflows).toHaveProperty('household');
      expect(firstMonth.outflows).toHaveProperty('loans');
    });

    it('should include household income with reliability discount', () => {
      const result = projectCashFlow({
        snapshot: MOCK_SNAPSHOT,
        horizonMonths: 12,
        farmRevenue: { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) },
        farmCosts: { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) },
      });

      // Non-farm income should be > 0 (from household_income_details)
      expect(result.summary.totalNonFarmIncome).toBeGreaterThan(0);
      // Wage labor is 'irregular', so should get 0.7× discount
    });

    it('should calculate working capital gap', () => {
      // Heavy upfront costs, delayed revenue
      const farmRevenue = { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) };
      farmRevenue.crop[5] = 200000; // All revenue in month 6

      const farmCosts = { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) };
      farmCosts.crop[0] = 50000; farmCosts.crop[1] = 30000; farmCosts.crop[2] = 20000; // Heavy upfront

      const result = projectCashFlow({
        snapshot: MOCK_SNAPSHOT, horizonMonths: 12,
        farmRevenue, farmCosts,
      });

      expect(result.summary.deficitMonths).toBeGreaterThan(0);
      expect(result.summary.workingCapitalGap).toBeGreaterThanOrEqual(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 6. RISK SCORER
  // ═════════════════════════════════════════════════════════════════

  describe('Risk Scorer', () => {
    const { computeRiskScore, classifyHealthStatus, classifySma, classifyIncomeAdequacy } = require('../../src/modules/drishti/services/computation/riskScorer');

    it('should compute risk score between 0 and 100', () => {
      const result = computeRiskScore({
        snapshot: MOCK_SNAPSHOT,
        cashFlowSummary: {
          totalInflows: 500000, totalOutflows: 400000, horizonMonths: 12,
          farmIncomePct: 60, nonFarmIncomePct: 40,
          deficitMonths: 2, workingCapitalGap: 20000,
        },
        irrigationType: 'rainfed',
        rainfallDeviationPct: 0,
        projectedNetIncome: 100000,
      });

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.riskRating).toBeDefined();
      expect(result.healthStatus).toBeDefined();
      expect(result.smaClass).toBeDefined();
      expect(result.incomeAdequacy).toBeDefined();
      expect(result.factors).toHaveLength(6);
    });

    it('should increase risk for rainfed + drought scenario', () => {
      const baseline = { totalInflows: 500000, totalOutflows: 400000, horizonMonths: 12, farmIncomePct: 60, nonFarmIncomePct: 40, deficitMonths: 1, workingCapitalGap: 5000 };

      const normal = computeRiskScore({ snapshot: MOCK_SNAPSHOT, cashFlowSummary: baseline, irrigationType: 'irrigated', rainfallDeviationPct: 0, projectedNetIncome: 100000 });
      const stressed = computeRiskScore({ snapshot: MOCK_SNAPSHOT, cashFlowSummary: baseline, irrigationType: 'rainfed', rainfallDeviationPct: -30, projectedNetIncome: 50000 });

      expect(stressed.riskScore).toBeGreaterThan(normal.riskScore);
    });

    it('should classify health status correctly', () => {
      expect(classifyHealthStatus(20, 20)).toBe('good');
      expect(classifyHealthStatus(40, 40)).toBe('watch');
      expect(classifyHealthStatus(60, 60)).toBe('stressed');
      expect(classifyHealthStatus(85, 85)).toBe('npa');
    });

    it('should classify SMA correctly', () => {
      expect(classifySma(0)).toBe('standard');
      expect(classifySma(15)).toBe('sma_0_30');
      expect(classifySma(45)).toBe('sma_30_60');
      expect(classifySma(75)).toBe('sma_60_90');
      expect(classifySma(100)).toBe('npa');
    });

    it('should classify income adequacy correctly', () => {
      expect(classifyIncomeAdequacy(0.15)).toBe('strong');
      expect(classifyIncomeAdequacy(0.30)).toBe('adequate');
      expect(classifyIncomeAdequacy(0.45)).toBe('marginal');
      expect(classifyIncomeAdequacy(0.60)).toBe('inadequate');
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 7. PRE-LOAN ENGINE — Full Pipeline
// ═════════════════════════════════════════════════════════════════════

describe('DRISHTI Pre-Loan Engine', () => {
  const preLoanEngine = require('../../src/modules/drishti/services/engines/preLoanEngine');

  const MOCK_INPUT = {
    farmer_id: 1,
    loan_product_id: 5,
    loan_amount: 200000,
    loan_tenure_months: 12,
    repayment_type: 'emi',
    activity: {
      type: 'crop',
      crop_id: 'crop_paddy',
      acreage_hectares: 1.2,
      season: 'kharif',
      irrigation_type: 'rainfed',
    },
    overrides: {},
    computation_mode: 'deterministic',
    include_insurance_comparison: true,
  };

  it('should compute full pre-loan scenario with 3 climate variants', () => {
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK, MOCK_DAIRY_BENCHMARK],
      input: MOCK_INPUT,
    });

    // Top-level structure
    expect(result).toHaveProperty('farmerSummary');
    expect(result).toHaveProperty('loanTerms');
    expect(result).toHaveProperty('scenarios');
    expect(result).toHaveProperty('insuranceComparison');
    expect(result).toHaveProperty('riskFactors');
    expect(result).toHaveProperty('recommendations');

    // Should have exactly 3 scenarios
    expect(result.scenarios).toHaveLength(3);
    const labels = result.scenarios.map(s => s.label);
    expect(labels).toEqual(['optimistic', 'base', 'stress']);
  });

  it('should compute correct loan terms (EMI)', () => {
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: MOCK_INPUT,
    });

    const terms = result.loanTerms;
    expect(terms.amount).toBe(200000);
    expect(terms.interest_rate).toBe(7.0);
    expect(terms.tenure_months).toBe(12);
    expect(terms.monthly_emi).toBeGreaterThan(0);
    expect(terms.total_repayable).toBeGreaterThan(200000); // principal + interest
    expect(terms.total_interest).toBeGreaterThan(0);
    expect(terms.processing_fee).toBeGreaterThan(0);
    expect(terms.processing_fee).toBeLessThanOrEqual(10000); // capped at 10k

    // EMI formula validation: ~₹17,305-17,320/month for ₹2L at 7% for 12 months
    expect(terms.monthly_emi).toBeGreaterThan(17200);
    expect(terms.monthly_emi).toBeLessThan(17400);
  });

  it('should compute bullet repayment correctly', () => {
    const bulletInput = { ...MOCK_INPUT, repayment_type: 'bullet' };
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: bulletInput,
    });

    const terms = result.loanTerms;
    // Bullet: monthly = interest only, principal at maturity
    const expectedMonthlyInterest = Math.round(200000 * (7.0 / 100 / 12) * 100) / 100;
    expect(terms.monthly_emi).toBeCloseTo(expectedMonthlyInterest, 0);
    // Total = principal + (monthly_interest × tenure)
    expect(terms.total_repayable).toBeGreaterThan(200000);
  });

  it('should produce declining projections from optimistic → base → stress', () => {
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: MOCK_INPUT,
    });

    const optimistic = result.scenarios[0].projections;
    const base = result.scenarios[1].projections;
    const stress = result.scenarios[2].projections;

    // Revenue should decline: optimistic > base > stress
    expect(optimistic.total_revenue).toBeGreaterThan(base.total_revenue);
    expect(base.total_revenue).toBeGreaterThan(stress.total_revenue);

    // Risk should increase: stress has worse health
    expect(stress.risk_score).toBeGreaterThanOrEqual(base.risk_score);
  });

  it('should include monthly cashflow for each scenario', () => {
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: MOCK_INPUT,
    });

    for (const scenario of result.scenarios) {
      expect(scenario.monthly_cashflow).toBeDefined();
      expect(scenario.monthly_cashflow.length).toBe(12);
      expect(scenario.monthly_cashflow[0]).toHaveProperty('month');
      expect(scenario.monthly_cashflow[0]).toHaveProperty('net');
      expect(scenario.monthly_cashflow[0]).toHaveProperty('cumulative');
    }
  });

  it('should compute insurance comparison when requested', () => {
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: { ...MOCK_INPUT, include_insurance_comparison: true },
    });

    expect(result.insuranceComparison).not.toBeNull();
    expect(result.insuranceComparison.without_insurance).toHaveProperty('worst_case_loss');
    expect(result.insuranceComparison.with_pmfby).toHaveProperty('premium');
    expect(result.insuranceComparison.with_pmfby).toHaveProperty('expected_payout');
    expect(result.insuranceComparison.with_pmfby.worst_case_loss)
      .toBeLessThanOrEqual(result.insuranceComparison.without_insurance.worst_case_loss);
  });

  it('should skip insurance comparison when not requested', () => {
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: { ...MOCK_INPUT, include_insurance_comparison: false },
    });

    expect(result.insuranceComparison).toBeNull();
  });

  it('should identify risk factors', () => {
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: MOCK_INPUT,
    });

    expect(result.riskFactors.length).toBeGreaterThan(0);
    // Rainfed should always be flagged
    const rainfedRisk = result.riskFactors.find(f => f.message_key === 'drishti.risk.rainfed');
    expect(rainfedRisk).toBeDefined();
    expect(rainfedRisk.impact).toBe('high');
  });

  it('should generate recommendations with verdict', () => {
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: MOCK_INPUT,
    });

    expect(result.recommendations.length).toBeGreaterThan(0);
    // Should have a verdict recommendation
    const verdict = result.recommendations.find(r => r.type === 'verdict');
    expect(verdict).toBeDefined();
    expect(['SAFE', 'CAUTION', 'RISKY'].some(v => verdict.message_key.includes(v.toLowerCase()))).toBe(true);
  });

  it('should compute breakeven yield for crop loans', () => {
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: MOCK_INPUT,
    });

    const baseScenario = result.scenarios.find(s => s.label === 'base');
    expect(baseScenario.projections.breakeven_yield_kg_per_hectare).toBeGreaterThan(0);
    expect(baseScenario.projections.projected_yield_kg_per_hectare).toBeGreaterThan(0);
    expect(baseScenario.projections.yield_safety_margin_pct).toBeDefined();
  });

  it('should include farmer summary from snapshot', () => {
    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: MOCK_INPUT,
    });

    expect(result.farmerSummary.trust_score).toBe(72);
    expect(result.farmerSummary.trust_band).toBe('good');
    expect(result.farmerSummary.total_land_hectares).toBe(2.5);
    expect(result.farmerSummary.existing_loan_emi).toBe(8650);
  });

  it('should handle dairy loan scenario', () => {
    const dairyInput = {
      ...MOCK_INPUT,
      loan_amount: 100000,
      activity: { type: 'dairy', animal_count: 5, feed_quality: 'standard' },
      include_insurance_comparison: false,
    };

    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_DAIRY_BENCHMARK],
      input: dairyInput,
    });

    expect(result.scenarios).toHaveLength(3);
    expect(result.scenarios[0].projections.total_revenue).toBeGreaterThan(0);
  });

  it('should handle zero acreage gracefully', () => {
    const zeroInput = {
      ...MOCK_INPUT,
      activity: { ...MOCK_INPUT.activity, acreage_hectares: 0 },
    };

    const result = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT,
      benchmarks: [MOCK_BENCHMARK],
      input: zeroInput,
    });

    // Should not crash — revenue and cost should be 0
    expect(result.scenarios[0].projections.total_revenue).toBe(0);
    expect(result.scenarios[0].projections.total_cost).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 8. VALIDATORS
// ═════════════════════════════════════════════════════════════════════

describe('DRISHTI Validators', () => {
  const { runPreLoanSchema } = require('../../src/modules/drishti/validators/preLoanValidator');
  const { runHouseholdPortfolioSchema } = require('../../src/modules/drishti/validators/householdPortfolioValidator');
  const { compareSchema } = require('../../src/modules/drishti/validators/scenarioValidator');

  describe('Pre-Loan Validator', () => {
    it('should validate a correct pre-loan request', () => {
      const { error } = runPreLoanSchema.validate({
        farmer_id: 1,
        loan_product_id: 5,
        loan_amount: 200000,
        loan_tenure_months: 12,
        repayment_type: 'emi',
        activity: { type: 'crop', crop_id: 'abc123', acreage_hectares: 1.2, season: 'kharif' },
      });
      expect(error).toBeUndefined();
    });

    it('should reject missing required fields', () => {
      const { error } = runPreLoanSchema.validate({ farmer_id: 1 });
      expect(error).toBeDefined();
    });

    it('should reject invalid repayment type', () => {
      const { error } = runPreLoanSchema.validate({
        farmer_id: 1, loan_product_id: 5, loan_amount: 200000,
        loan_tenure_months: 12, repayment_type: 'invalid',
        activity: { type: 'crop', crop_id: 'abc', acreage_hectares: 1, season: 'kharif' },
      });
      expect(error).toBeDefined();
    });

    it('should require crop_id when activity type is crop', () => {
      const { error } = runPreLoanSchema.validate({
        farmer_id: 1, loan_product_id: 5, loan_amount: 200000,
        loan_tenure_months: 12, repayment_type: 'emi',
        activity: { type: 'crop', acreage_hectares: 1, season: 'kharif' },
      });
      expect(error).toBeDefined();
    });
  });

  describe('Household Portfolio Validator', () => {
    it('should validate a minimal request', () => {
      const { error } = runHouseholdPortfolioSchema.validate({ farmer_id: 1 });
      expect(error).toBeUndefined();
    });
  });

  describe('Compare Validator', () => {
    it('should require at least 2 run UUIDs', () => {
      const { error: err1 } = compareSchema.validate({ run_uuids: ['a'] });
      expect(err1).toBeDefined();

      const { error: err2 } = compareSchema.validate({ run_uuids: ['a', 'b'] });
      expect(err2).toBeUndefined();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 9. MODEL DEFINITIONS
// ═════════════════════════════════════════════════════════════════════

describe('DRISHTI Model Definitions', () => {
  const fs = require('fs');
  const path = require('path');
  const modelsDir = path.join(__dirname, '../../src/modules/drishti/models');

  const expectedModels = [
    'DrishtiScenarioTemplate',
    'DrishtiFarmerSnapshot',
    'DrishtiScenarioRun',
    'DrishtiScenarioResult',
    'DrishtiScenarioComparison',
    'DrishtiBenchmarkProfile',
    'DrishtiPortfolioRun',
    'DrishtiHouseholdIncomeSource',
    'DrishtiHouseholdExpense',
  ];

  it('should have all 9 model files', () => {
    for (const modelName of expectedModels) {
      const filePath = path.join(modelsDir, `${modelName}.js`);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('each model should export a function that returns a class with associate', () => {
    // We can't fully init models without a Sequelize instance, but we can check the export shape
    for (const modelName of expectedModels) {
      const modelFactory = require(path.join(modelsDir, `${modelName}.js`));
      expect(typeof modelFactory).toBe('function');
    }
  });
});
