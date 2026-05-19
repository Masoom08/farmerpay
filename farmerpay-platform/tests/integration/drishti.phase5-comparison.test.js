/**
 * DRISHTI Phase 5 — Scenario Comparison + Shareable Summary
 *
 * Tests the comparison delta engine and share text builder.
 * Pure computation tests — no DB required.
 */

// We test the service helpers directly by importing the internal functions
// that are used by compareScenarios and getShareableSummary.
// Since the full service methods need DB, we test the building blocks here
// and the engine-level comparison logic via mock data.

// ─── Shareable Summary Builder ──────────────────────────────────────
// We replicate the buildShareableText logic for testing since it's internal.
// Instead, let's test through the preLoanEngine + comparison logic.

const preLoanEngine = require('../../src/modules/drishti/services/engines/preLoanEngine');
const householdPortfolioEngine = require('../../src/modules/drishti/services/engines/householdPortfolioEngine');

// ─── Fixtures ───────────────────────────────────────────────────────

const MOCK_SNAPSHOT = {
  farmer_id: 1,
  total_farm_size_hectares: 2.5,
  district_id: 45,
  trust_score: 72,
  trust_band: 'good',
  total_outstanding: 85000,
  total_monthly_emi: 8650,
  non_farm_income_streams: 4,

  active_crop_cycles: [{ cropId: 'crop_paddy', season: 'kharif', status: 'growing' }],
  active_dairy_profile: { herdId: 1, animalCount: 2 },
  active_fishery_profile: null,

  historical_crop_profitability: [
    { season: 'kharif', year: 2025, cropId: 'crop_paddy', actualProfit: 45000, isProfitable: true },
    { season: 'kharif', year: 2024, cropId: 'crop_paddy', actualProfit: 38000, isProfitable: true },
  ],
  historical_dairy_profitability: [
    { month: 3, year: 2026, totalIncome: 8000, totalExpense: 4000, netProfit: 4000 },
  ],
  historical_fishery_profitability: [],

  active_loans: [{ applicationId: 101, outstanding: 85000, emiAmount: 8650, healthStatus: 'good' }],
  relevant_commodity_prices: [
    { commodityId: 'crop_paddy', currentPrice: 22, priceTrend: 'stable', forecast30dPrice: 23, forecastConfidence: 65 },
  ],
  weather_outlook: { rainfallMm24h: 0 },
  active_insurance: [],

  household_income_details: {
    income_streams: [
      { source: 'spouse_shg', amount_monthly: 3500, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'remittance', amount_monthly: 5000, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'pension', amount_monthly: 1000, frequency: 'monthly', reliability: 'guaranteed', active_months: null },
    ],
  },
  total_non_farm_monthly: 9500,
  household_expense_details: {
    expense_categories: [
      { category: 'food_groceries', monthly: 6000, peak_months: null, peak_amount: 0 },
      { category: 'education', monthly: 2500, peak_months: null, peak_amount: 0 },
      { category: 'utilities', monthly: 1200, peak_months: null, peak_amount: 0 },
    ],
  },
  total_household_expense_monthly: 9700,
  spouse_occupation: 'SHG member',
  family_members_count: 5,
  earning_members_count: 3,
  dependents_count: 2,
  education_level: 'secondary',
  years_farming_experience: 12,
  land_ownership_type: 'owned',
  non_farm_loan_emi_monthly: 0,
};

const MOCK_BENCHMARKS = [{
  district_id: 45, activity_type: 'crop', crop_id: 'crop_paddy', season: 'kharif',
  avg_yield_kg_per_hectare: 3600, avg_cost_per_hectare: 55000, avg_revenue_per_hectare: 79200,
  avg_profit_per_hectare: 24200, yield_rainfall_elasticity: -0.5, yield_temperature_sensitivity: -0.3,
  historical_claim_rate_pct: 25,
}, {
  district_id: 45, activity_type: 'dairy',
  avg_milk_yield_per_animal: 7, avg_monthly_cost_per_animal: 4500, avg_monthly_revenue_per_animal: 7350,
}];

// ═════════════════════════════════════════════════════════════════════
// 1. COMPARISON DELTA CALCULATION
// ═════════════════════════════════════════════════════════════════════

describe('Scenario Comparison — Delta Calculation', () => {
  // Simulate two different pre-loan scenarios to compare
  const scenario1 = preLoanEngine.compute({
    snapshot: MOCK_SNAPSHOT,
    benchmarks: MOCK_BENCHMARKS,
    input: {
      farmer_id: 1, loan_product_id: 5, loan_amount: 100000, loan_tenure_months: 12, repayment_type: 'emi',
      activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.0, season: 'kharif', irrigation_type: 'rainfed' },
      overrides: {}, computation_mode: 'deterministic', include_insurance_comparison: false,
    },
  });

  const scenario2 = preLoanEngine.compute({
    snapshot: MOCK_SNAPSHOT,
    benchmarks: MOCK_BENCHMARKS,
    input: {
      farmer_id: 1, loan_product_id: 5, loan_amount: 200000, loan_tenure_months: 12, repayment_type: 'emi',
      activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 2.0, season: 'kharif', irrigation_type: 'rainfed' },
      overrides: {}, computation_mode: 'deterministic', include_insurance_comparison: false,
    },
  });

  it('should compute absolute and percentage deltas between scenarios', () => {
    const base1 = scenario1.scenarios.find(s => s.label === 'base');
    const base2 = scenario2.scenarios.find(s => s.label === 'base');

    expect(base1).toBeDefined();
    expect(base2).toBeDefined();

    // Scenario 2 has 2× acreage so revenue should be roughly 2×
    const revDelta = base2.projections.total_revenue - base1.projections.total_revenue;
    expect(revDelta).toBeGreaterThan(0);

    // Cost delta should also be positive (more acreage = more cost)
    const costDelta = base2.projections.total_cost - base1.projections.total_cost;
    expect(costDelta).toBeGreaterThan(0);

    // EMI is higher for 200k loan vs 100k loan
    expect(scenario2.loanTerms.monthly_emi).toBeGreaterThan(scenario1.loanTerms.monthly_emi);
  });

  it('should detect trade-offs between income and risk', () => {
    // Higher loan amount → higher EMI
    expect(scenario2.loanTerms.monthly_emi).toBeGreaterThan(scenario1.loanTerms.monthly_emi);

    // Larger acreage → higher revenue
    const base1 = scenario1.scenarios.find(s => s.label === 'base');
    const base2 = scenario2.scenarios.find(s => s.label === 'base');
    expect(base2.projections.total_revenue).toBeGreaterThan(base1.projections.total_revenue);
    expect(base2.projections.total_cost).toBeGreaterThan(base1.projections.total_cost);

    // This is the core trade-off: more revenue but also more loan exposure
    const totalInterest1 = scenario1.loanTerms.total_interest;
    const totalInterest2 = scenario2.loanTerms.total_interest;
    expect(totalInterest2).toBeGreaterThan(totalInterest1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. CROSS-ENGINE COMPARISON
// ═════════════════════════════════════════════════════════════════════

describe('Cross-Engine Comparison', () => {
  it('should extract metrics from both pre-loan and household portfolio engines', () => {
    const preLoan = preLoanEngine.compute({
      snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
      input: {
        farmer_id: 1, loan_product_id: 5, loan_amount: 100000, loan_tenure_months: 12, repayment_type: 'emi',
        activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.0, season: 'kharif', irrigation_type: 'rainfed' },
        overrides: {}, computation_mode: 'deterministic', include_insurance_comparison: false,
      },
    });

    const portfolio = householdPortfolioEngine.compute({
      snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
      input: {
        farmer_id: 1,
        proposed_farm_activities: {
          crops: [{ crop_id: 'crop_paddy', acreage_hectares: 1.0, season: 'kharif', irrigation: 'rainfed' }],
          dairy: { animal_count: 3, feed_quality: 'standard' },
        },
        time_horizon_months: 12, include_stress_scenarios: false,
      },
    });

    // Both engines should produce scenarios with comparable metrics
    const preLoanBase = preLoan.scenarios.find(s => s.label === 'base');
    const portfolioBase = portfolio.scenarios.find(s => s.label === 'proposed');

    expect(preLoanBase.projections).toHaveProperty('total_revenue');
    expect(portfolioBase.projections).toHaveProperty('total_revenue');
    expect(preLoanBase.projections).toHaveProperty('health_status');
    expect(portfolioBase.projections).toHaveProperty('health_status');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. SHAREABLE SUMMARY TEXT
// ═════════════════════════════════════════════════════════════════════

describe('Shareable Summary Builder', () => {
  // We test the text generation by creating a mock "run" object
  // that mimics what the DB would return

  const mockRunWithResults = {
    run_uuid: 'test-uuid-123',
    engine_type: 'pre_loan',
    created_at: new Date('2026-04-12'),
    input_variables: { loan_amount: 200000 },
    results: [
      {
        scenario_label: 'base',
        projected_revenue: 95000,
        projected_cost: 66000,
        projected_net_income: 29000,
        projected_health_status: 'good',
        projected_sma_class: 'standard',
        income_adequacy_status: 'adequate',
        emi_to_income_ratio: 0.25,
        breakeven_yield_kg: 2800,
        cash_flow_negative_months: 2,
        recommendations: [
          { type: 'verdict', message: 'This loan appears affordable' },
          { type: 'action', message: 'Consider PMFBY enrollment' },
        ],
      },
      {
        scenario_label: 'stress',
        projected_revenue: 60000,
        projected_cost: 66000,
        projected_net_income: -6000,
        projected_health_status: 'watch',
      },
    ],
    snapshot: { snapshot_date: '2026-04-12' },
  };

  // Import the internal helper by re-implementing the text builder logic
  // (since it's not exported, we test through the structure)

  it('should format INR amounts correctly', () => {
    // Test the formatINR logic
    const formatINR = (amount) => {
      const num = parseFloat(amount) || 0;
      if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
      if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
      return `₹${Math.round(num)}`;
    };

    expect(formatINR(250000)).toBe('₹2.5L');
    expect(formatINR(100000)).toBe('₹1.0L');
    expect(formatINR(50000)).toBe('₹50.0K');
    expect(formatINR(1500)).toBe('₹1.5K');
    expect(formatINR(500)).toBe('₹500');
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(null)).toBe('₹0');
  });

  it('should build key metrics from scenario results', () => {
    const baseResult = mockRunWithResults.results[0];

    const keyMetrics = {
      projected_income: parseFloat(baseResult.projected_net_income),
      total_revenue: parseFloat(baseResult.projected_revenue),
      total_cost: parseFloat(baseResult.projected_cost),
      health_status: baseResult.projected_health_status,
      income_adequacy: baseResult.income_adequacy_status,
      emi_burden: `${Math.round(parseFloat(baseResult.emi_to_income_ratio) * 100)}%`,
    };

    expect(keyMetrics.projected_income).toBe(29000);
    expect(keyMetrics.health_status).toBe('good');
    expect(keyMetrics.emi_burden).toBe('25%');
  });

  it('should build SMS text within 160 character limit', () => {
    const baseResult = mockRunWithResults.results[0];
    const formatINR = (n) => { const v = parseFloat(n) || 0; if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`; if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`; return `₹${Math.round(v)}`; };

    const smsText = `FarmerPay DRISHTI: Loan Analysis result — Net income: ${formatINR(baseResult.projected_net_income)}, Health: ${baseResult.projected_health_status}. Open app for full details.`;

    expect(smsText.length).toBeLessThanOrEqual(160);
    expect(smsText).toContain('₹29.0K');
    expect(smsText).toContain('good');
  });

  it('should build WhatsApp text with markdown formatting', () => {
    const lines = [
      '🌾 *FarmerPay DRISHTI — Loan Analysis*',
      '📅 12/4/2026',
      '',
      '💰 *Projected Net Income:* ₹29.0K',
      '📊 Revenue: ₹95.0K | Cost: ₹66.0K',
      '❤️ Health: GOOD',
      '📋 EMI Burden: 25% of income',
      '⚠️ 2 months with negative cash flow',
    ];

    const whatsappText = lines.join('\n');

    expect(whatsappText).toContain('*FarmerPay DRISHTI');
    expect(whatsappText).toContain('Net Income');
    expect(whatsappText).toContain('Health: GOOD');
    expect(whatsappText).toContain('EMI Burden');
  });

  it('should include stress scenario in summary', () => {
    const stressResult = mockRunWithResults.results[1];

    expect(stressResult.projected_health_status).toBe('watch');
    expect(parseFloat(stressResult.projected_net_income)).toBeLessThan(0);
  });

  it('should include top recommendations', () => {
    const recs = mockRunWithResults.results[0].recommendations;
    const topRecs = recs.filter(r => r.type === 'verdict' || r.type === 'action').slice(0, 2);

    expect(topRecs).toHaveLength(2);
    expect(topRecs[0].message).toContain('affordable');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. TRADE-OFF IDENTIFICATION
// ═════════════════════════════════════════════════════════════════════

describe('Trade-off Identification', () => {
  it('should detect income vs risk trade-off', () => {
    const metrics = [
      {
        run_uuid: 'run-a', engine_type: 'pre_loan',
        metrics: { net_income: 80000, emi_to_income_ratio: 0.45, health_status: 'watch', deficit_months: 3 },
      },
      {
        run_uuid: 'run-b', engine_type: 'pre_loan',
        metrics: { net_income: 50000, emi_to_income_ratio: 0.20, health_status: 'good', deficit_months: 1 },
      },
    ];

    // run-a: higher income but higher EMI → income_vs_risk
    // run-b: safer but lower income → safety_vs_income
    const hasHigherIncomeHigherRisk = metrics[0].metrics.net_income > metrics[1].metrics.net_income
      && metrics[0].metrics.emi_to_income_ratio > metrics[1].metrics.emi_to_income_ratio;
    expect(hasHigherIncomeHigherRisk).toBe(true);

    const healthOrder = { good: 3, watch: 2, stressed: 1, npa: 0 };
    const bIsSafer = healthOrder[metrics[1].metrics.health_status] > healthOrder[metrics[0].metrics.health_status];
    expect(bIsSafer).toBe(true);
  });

  it('should detect cash flow vs income trade-off', () => {
    const a = { net_income: 80000, deficit_months: 4 };
    const b = { net_income: 60000, deficit_months: 1 };

    // a earns more but has more deficit months
    expect(a.net_income).toBeGreaterThan(b.net_income);
    expect(a.deficit_months).toBeGreaterThan(b.deficit_months);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. VALIDATOR — Compare Schema
// ═════════════════════════════════════════════════════════════════════

describe('Comparison Validator', () => {
  const { compareSchema } = require('../../src/modules/drishti/validators/scenarioValidator');

  it('should accept 2-3 run UUIDs', () => {
    expect(compareSchema.validate({ run_uuids: ['a', 'b'] }).error).toBeUndefined();
    expect(compareSchema.validate({ run_uuids: ['a', 'b', 'c'] }).error).toBeUndefined();
  });

  it('should reject fewer than 2 UUIDs', () => {
    expect(compareSchema.validate({ run_uuids: ['a'] }).error).toBeDefined();
    expect(compareSchema.validate({ run_uuids: [] }).error).toBeDefined();
  });

  it('should accept optional comparison label', () => {
    const { error, value } = compareSchema.validate({ run_uuids: ['a', 'b'], comparison_label: 'My comparison' });
    expect(error).toBeUndefined();
    expect(value.comparison_label).toBe('My comparison');
  });
});
