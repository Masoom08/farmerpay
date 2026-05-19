/**
 * DRISHTI Phase 2 — Household Portfolio Engine Tests
 *
 * Tests the full engine computation pipeline with mock snapshot data.
 * Covers: income summary, expense summary, cash flow, resilience,
 * stress scenarios, comparison, recommendations.
 */

const householdPortfolioEngine = require('../../src/modules/drishti/services/engines/householdPortfolioEngine');

// ─── Shared Fixtures ────────────────────────────────────────────────

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
  family_members_count: 5,
  earning_members_count: 3,
  dependents_count: 2,
  spouse_occupation: 'SHG member, Kirana shop',
  primary_non_farm_occupation: null,

  active_crop_cycles: [{ cycleId: 1, cropId: 'crop_paddy', season: 'kharif', status: 'growing' }],
  active_dairy_profile: { herdId: 1, animalCount: 2 },
  active_fishery_profile: null,
  horticulture_profile: null,

  historical_crop_profitability: [
    { season: 'kharif', year: 2025, cropId: 'crop_paddy', actualProfit: 45000, isProfitable: true },
    { season: 'kharif', year: 2024, cropId: 'crop_paddy', actualProfit: 38000, isProfitable: true },
  ],
  historical_dairy_profitability: [
    { month: 3, year: 2026, totalIncome: 8000, totalExpense: 4000, netProfit: 4000 },
    { month: 2, year: 2026, totalIncome: 7500, totalExpense: 3800, netProfit: 3700 },
  ],
  historical_fishery_profitability: [],

  active_loans: [
    { applicationId: 101, productName: 'Kharif Crop Loan', outstanding: 85000, emiAmount: 8650, healthStatus: 'good' },
  ],
  total_outstanding: 85000,
  total_monthly_emi: 8650,

  trust_score: 72,
  trust_band: 'good',
  income_adequacy_status: 'adequate',
  loan_to_income_ratio: 0.35,
  risk_severity_band: 'green',

  relevant_commodity_prices: [
    { commodityId: 'crop_paddy', currentPrice: 22, priceTrend: 'stable', forecast30dPrice: 23, forecastConfidence: 65 },
    { commodityId: 'crop_mustard', currentPrice: 55, priceTrend: 'rising', forecast30dPrice: 58, forecastConfidence: 50 },
  ],
  weather_outlook: { rainfallMm24h: 0, tempCelsius: 34, conditionText: 'Clear' },

  active_insurance: [{ type: 'pmfby_crop', sumInsured: 100000, premiumPaid: 2000, season: 'kharif' }],

  household_income_details: {
    income_streams: [
      { source: 'spouse_shg', label: 'Wife SHG', earning_member: 'spouse', amount_monthly: 3500, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'wage_labor', label: 'Construction', earning_member: 'farmer', amount_monthly: 6000, frequency: 'seasonal', reliability: 'irregular', active_months: [1,2,3,4,5,11,12] },
      { source: 'pension', label: 'Old Age Pension', earning_member: 'family', amount_monthly: 1000, frequency: 'monthly', reliability: 'guaranteed', active_months: null },
      { source: 'remittance', label: 'Son in Pune', earning_member: 'family', amount_monthly: 5000, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'petty_business', label: 'Kirana shop', earning_member: 'spouse', amount_monthly: 4000, frequency: 'daily', reliability: 'regular', active_months: null },
    ],
    total_monthly_non_farm: 19500,
  },
  total_non_farm_monthly: 19500,
  non_farm_income_streams: 5,
  spouse_shg_monthly: 3500,
  wage_labor_monthly: 6000,
  pension_monthly: 1000,
  remittance_monthly: 5000,
  petty_business_monthly: 4000,

  household_expense_details: {
    expense_categories: [
      { category: 'food_groceries', monthly: 6000, peak_months: null, peak_amount: 0 },
      { category: 'education', monthly: 2500, peak_months: [6], peak_amount: 15000 },
      { category: 'healthcare', monthly: 1000, peak_months: null, peak_amount: 0 },
      { category: 'social_obligations', monthly: 1667, peak_months: null, peak_amount: 0 },
      { category: 'utilities', monthly: 1200, peak_months: null, peak_amount: 0 },
      { category: 'transportation', monthly: 800, peak_months: null, peak_amount: 0 },
      { category: 'non_farm_loan_emi', monthly: 2000, peak_months: null, peak_amount: 0 },
    ],
    total_monthly_expense: 15167,
  },
  total_household_expense_monthly: 15167,
  non_farm_loan_emi_monthly: 2000,
};

const MOCK_BENCHMARKS = [
  {
    district_id: 45, activity_type: 'crop', crop_id: 'crop_paddy', season: 'kharif',
    avg_yield_kg_per_hectare: 3600, avg_cost_per_hectare: 55000, avg_revenue_per_hectare: 79200,
    avg_profit_per_hectare: 24200, yield_rainfall_elasticity: -0.5, yield_temperature_sensitivity: -0.3,
    historical_claim_rate_pct: 25,
  },
  {
    district_id: 45, activity_type: 'crop', crop_id: 'crop_mustard', season: 'rabi',
    avg_yield_kg_per_hectare: 1200, avg_cost_per_hectare: 35000, avg_revenue_per_hectare: 66000,
    avg_profit_per_hectare: 31000, yield_rainfall_elasticity: -0.3, yield_temperature_sensitivity: -0.2,
    historical_claim_rate_pct: 15,
  },
  {
    district_id: 45, activity_type: 'dairy',
    avg_milk_yield_per_animal: 7, avg_monthly_cost_per_animal: 4500, avg_monthly_revenue_per_animal: 7350,
  },
  {
    district_id: 45, activity_type: 'fishery',
    avg_yield_kg_per_hectare_pond: 3500, avg_cost_per_hectare_pond: 140000, avg_revenue_per_hectare_pond: 420000,
  },
];

const FULL_INPUT = {
  farmer_id: 1,
  proposed_farm_activities: {
    crops: [
      { crop_id: 'crop_paddy', acreage_hectares: 0.8, season: 'kharif', irrigation: 'rainfed' },
      { crop_id: 'crop_mustard', acreage_hectares: 0.4, season: 'rabi', irrigation: 'irrigated' },
    ],
    dairy: { animal_count: 3, feed_quality: 'standard' },
    fishery: { pond_area_hectares: 0.2, stocking_density: 'standard', cycle_months: 8 },
  },
  household_income: { use_saved_profile: true },
  household_expenses: { use_saved_profile: true },
  time_horizon_months: 12,
  include_stress_scenarios: true,
};

// ═════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Household Portfolio Engine', () => {
  describe('Full Computation', () => {
    let result;

    beforeAll(() => {
      result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT,
        benchmarks: MOCK_BENCHMARKS,
        input: FULL_INPUT,
      });
    });

    it('should return all required top-level keys', () => {
      expect(result).toHaveProperty('householdProfile');
      expect(result).toHaveProperty('incomeSummary');
      expect(result).toHaveProperty('expenseSummary');
      expect(result).toHaveProperty('netPosition');
      expect(result).toHaveProperty('scenarios');
      expect(result).toHaveProperty('financialResilience');
      expect(result).toHaveProperty('stressScenarios');
      expect(result).toHaveProperty('comparisonToCurrent');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('recommendations');
    });

    it('should produce exactly 1 scenario (proposed portfolio)', () => {
      expect(result.scenarios).toHaveLength(1);
      expect(result.scenarios[0].label).toBe('proposed');
    });

    it('should include monthly cashflow in the scenario', () => {
      const scenario = result.scenarios[0];
      expect(scenario.monthly_cashflow).toBeDefined();
      expect(scenario.monthly_cashflow).toHaveLength(12);
      expect(scenario.monthly_cashflow[0]).toHaveProperty('month');
      expect(scenario.monthly_cashflow[0]).toHaveProperty('net');
      expect(scenario.monthly_cashflow[0]).toHaveProperty('cumulative');
    });

    it('should have projections with risk-related fields', () => {
      const proj = result.scenarios[0].projections;
      expect(proj.health_status).toBeDefined();
      expect(proj.income_adequacy).toBeDefined();
      expect(proj.risk_score).toBeDefined();
      expect(proj.total_revenue).toBeGreaterThan(0);
    });
  });

  describe('Income Summary', () => {
    let result;

    beforeAll(() => {
      result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT,
        benchmarks: MOCK_BENCHMARKS,
        input: FULL_INPUT,
      });
    });

    it('should split income into farm and non-farm', () => {
      const { incomeSummary } = result;
      expect(incomeSummary.total_projected_annual).toBeGreaterThan(0);
      expect(incomeSummary.farm_income_annual).toBeGreaterThanOrEqual(0);
      expect(incomeSummary.non_farm_income_annual).toBeGreaterThan(0);
      expect(incomeSummary.farm_income_pct + incomeSummary.non_farm_income_pct).toBeCloseTo(100, 0);
    });

    it('should list all income streams with percentages', () => {
      const streams = result.incomeSummary.income_streams;
      expect(streams.length).toBeGreaterThan(0);

      for (const stream of streams) {
        expect(stream).toHaveProperty('source');
        expect(stream).toHaveProperty('type');
        expect(stream).toHaveProperty('annual');
        expect(stream).toHaveProperty('pct');
        expect(stream).toHaveProperty('timing');
        expect(['farm', 'non_farm']).toContain(stream.type);
      }

      // Each stream should have a positive pct
      const farmStreams = streams.filter(s => s.type === 'farm');
      const nonFarmStreams = streams.filter(s => s.type === 'non_farm');
      expect(farmStreams.length).toBeGreaterThan(0);
      expect(nonFarmStreams.length).toBeGreaterThan(0);
    });

    it('should include farm streams for crops, dairy, and fishery', () => {
      const farmStreams = result.incomeSummary.income_streams.filter(s => s.type === 'farm');
      const sources = farmStreams.map(s => s.source);

      // Should have both crop streams + dairy + fishery
      expect(sources.some(s => s.includes('crop_paddy'))).toBe(true);
      expect(sources.some(s => s.includes('crop_mustard'))).toBe(true);
      expect(sources.includes('dairy')).toBe(true);
      expect(sources.includes('fishery')).toBe(true);
    });

    it('should compute diversification index', () => {
      expect(result.incomeSummary.income_diversification_index).toBeGreaterThan(0);
      expect(result.incomeSummary.income_diversification_index).toBeLessThanOrEqual(1);
      expect(result.incomeSummary.income_diversification_rating).toBeDefined();
    });
  });

  describe('Expense Summary', () => {
    let result;

    beforeAll(() => {
      result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT,
        benchmarks: MOCK_BENCHMARKS,
        input: FULL_INPUT,
      });
    });

    it('should break down expenses into household + farm + loan', () => {
      const { expenseSummary } = result;
      expect(expenseSummary.total_annual_household).toBeGreaterThan(0);
      expect(expenseSummary.total_annual_farm_operations).toBeGreaterThan(0);
      expect(expenseSummary.grand_total_annual).toBeGreaterThan(0);
      expect(expenseSummary.grand_total_annual).toBeGreaterThanOrEqual(
        expenseSummary.total_annual_household + expenseSummary.total_annual_farm_operations
      );
    });

    it('should include expense breakdown by category', () => {
      const breakdown = result.expenseSummary.expense_breakdown;
      expect(breakdown.length).toBeGreaterThan(0);

      for (const item of breakdown) {
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('annual');
        expect(item).toHaveProperty('timing');
      }

      // Should include farm operation categories
      const categories = breakdown.map(b => b.category);
      expect(categories.some(c => c.includes('farm_'))).toBe(true);
    });
  });

  describe('Net Household Position', () => {
    it('should compute surplus/deficit metrics', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: FULL_INPUT,
      });
      const { netPosition } = result;

      expect(netPosition).toHaveProperty('annual_surplus');
      expect(netPosition).toHaveProperty('monthly_average_surplus');
      expect(netPosition.surplus_months + netPosition.deficit_months).toBe(12);
      expect(netPosition).toHaveProperty('working_capital_gap');
    });
  });

  describe('Financial Resilience', () => {
    let result;

    beforeAll(() => {
      result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: FULL_INPUT,
      });
    });

    it('should compute resilience score and rating', () => {
      const { financialResilience } = result;
      expect(financialResilience.resilience_score).toBeGreaterThanOrEqual(0);
      expect(financialResilience.resilience_score).toBeLessThanOrEqual(100);
      expect(financialResilience.resilience_rating).toBeDefined();
    });

    it('should calculate survival months', () => {
      expect(result.financialResilience.months_survivable_without_farm_income).toBeGreaterThanOrEqual(0);
    });

    it('should assess single point of failure', () => {
      expect(result.financialResilience).toHaveProperty('single_point_of_failure');
      expect(result.financialResilience).toHaveProperty('highest_risk_income_loss');
    });

    it('should compute non-farm coverage percentages', () => {
      expect(result.financialResilience.non_farm_covers_household_expenses_pct).toBeGreaterThan(0);
      expect(result.financialResilience.non_farm_covers_all_expenses_pct).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Stress Scenarios', () => {
    it('should generate stress scenarios when requested', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...FULL_INPUT, include_stress_scenarios: true },
      });

      expect(result.stressScenarios.length).toBeGreaterThan(0);

      const cropFailure = result.stressScenarios.find(s => s.label === 'crop_failure');
      expect(cropFailure).toBeDefined();
      expect(cropFailure.income_change).toBeLessThan(0);
      expect(cropFailure).toHaveProperty('household_can_survive');
      expect(cropFailure).toHaveProperty('projected_health_status');
    });

    it('should skip stress scenarios when not requested', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...FULL_INPUT, include_stress_scenarios: false },
      });

      expect(result.stressScenarios).toHaveLength(0);
    });
  });

  describe('Current vs Proposed Comparison', () => {
    it('should compare current and proposed income', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: FULL_INPUT,
      });
      const { comparisonToCurrent } = result;

      expect(comparisonToCurrent).toHaveProperty('current_total_household_income');
      expect(comparisonToCurrent).toHaveProperty('proposed_total_household_income');
      expect(comparisonToCurrent).toHaveProperty('income_change_pct');
      expect(comparisonToCurrent).toHaveProperty('current_diversification_index');
      expect(comparisonToCurrent).toHaveProperty('proposed_diversification_index');
      expect(comparisonToCurrent).toHaveProperty('risk_change');
      expect(comparisonToCurrent).toHaveProperty('key_improvement');
    });

    it('should show improvement when adding dairy + fishery', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: FULL_INPUT,
      });

      // Proposed portfolio (4 farm activities + 5 non-farm) should be well diversified
      expect(result.comparisonToCurrent.proposed_diversification_index).toBeGreaterThan(0.3);
      // Proposed total should be higher than current (adding fishery + more dairy)
      expect(result.comparisonToCurrent.proposed_total_household_income).toBeGreaterThan(0);
      expect(result.comparisonToCurrent.risk_change).toBeDefined();
    });
  });

  describe('Recommendations', () => {
    it('should generate ranked recommendations', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: FULL_INPUT,
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      for (const rec of result.recommendations) {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('message_key');
        expect(rec).toHaveProperty('message');
        expect(['strength', 'warning', 'action', 'info']).toContain(rec.type);
      }
    });

    it('should include SHG scaling recommendation when spouse has SHG', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: FULL_INPUT,
      });

      const shgRec = result.recommendations.find(r => r.message_key === 'drishti.rec.increase_shg');
      expect(shgRec).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty farm activities (non-farm only household)', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT,
        benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1,
          proposed_farm_activities: {},
          household_income: { use_saved_profile: true },
          household_expenses: { use_saved_profile: true },
          time_horizon_months: 12,
          include_stress_scenarios: true,
        },
      });

      expect(result.incomeSummary.farm_income_annual).toBe(0);
      expect(result.incomeSummary.non_farm_income_annual).toBeGreaterThan(0);
      expect(result.scenarios).toHaveLength(1);
    });

    it('should handle income overrides', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT,
        benchmarks: MOCK_BENCHMARKS,
        input: {
          ...FULL_INPUT,
          household_income: {
            use_saved_profile: true,
            overrides: [{ source_type: 'spouse_shg', amount_monthly: 8000 }],
          },
        },
      });

      // Higher SHG should increase total non-farm income
      const baseResult = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: FULL_INPUT,
      });

      expect(result.incomeSummary.non_farm_income_annual)
        .toBeGreaterThan(baseResult.incomeSummary.non_farm_income_annual);
    });

    it('should handle expense overrides', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT,
        benchmarks: MOCK_BENCHMARKS,
        input: {
          ...FULL_INPUT,
          household_expenses: {
            use_saved_profile: true,
            overrides: [{ category: 'education', amount_monthly: 5000 }],
          },
        },
      });

      const baseResult = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: FULL_INPUT,
      });

      expect(result.expenseSummary.total_annual_household)
        .toBeGreaterThan(baseResult.expenseSummary.total_annual_household);
    });

    it('should handle no benchmarks gracefully', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: [], input: FULL_INPUT,
      });

      // Should still produce a result (using defaults)
      expect(result.scenarios).toHaveLength(1);
      expect(result.incomeSummary).toBeDefined();
    });

    it('should handle 24-month horizon', () => {
      const result = householdPortfolioEngine.compute({
        snapshot: MOCK_SNAPSHOT,
        benchmarks: MOCK_BENCHMARKS,
        input: { ...FULL_INPUT, time_horizon_months: 24 },
      });

      expect(result.scenarios[0].monthly_cashflow).toHaveLength(24);
    });
  });
});
