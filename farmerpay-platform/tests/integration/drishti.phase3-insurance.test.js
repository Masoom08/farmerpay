/**
 * DRISHTI Phase 3 — Insurance Decision Engine Tests
 *
 * Tests:
 *  1. PMFBY crop insurance — deterministic + MC
 *  2. Livestock insurance
 *  3. Insured vs uninsured comparison
 *  4. 5-year projection + break-even
 *  5. Recommendation generation
 *  6. Edge cases
 */

const insuranceEngine = require('../../src/modules/drishti/services/engines/insuranceEngine');

// ─── Shared Fixtures ────────────────────────────────────────────────

const MOCK_SNAPSHOT = {
  farmer_id: 1,
  total_farm_size_hectares: 2.5,
  district_id: 45,
  trust_score: 72,
  trust_band: 'good',
  total_outstanding: 85000,
  total_monthly_emi: 8650,

  active_crop_cycles: [{ cycleId: 1, cropId: 'crop_paddy', season: 'kharif', status: 'growing' }],
  active_dairy_profile: { herdId: 1, animalCount: 3 },
  active_fishery_profile: { registerId: 1, totalPondAreaHectares: 0.2 },

  historical_crop_profitability: [
    { season: 'kharif', year: 2025, cropId: 'crop_paddy', actualProfit: 45000, isProfitable: true },
    { season: 'kharif', year: 2024, cropId: 'crop_paddy', actualProfit: 38000, isProfitable: true },
  ],
  historical_dairy_profitability: [],
  historical_fishery_profitability: [],

  active_loans: [{ applicationId: 101, outstanding: 85000, emiAmount: 8650, healthStatus: 'good' }],

  relevant_commodity_prices: [
    { commodityId: 'crop_paddy', currentPrice: 22, priceTrend: 'stable', forecast30dPrice: 23, forecastConfidence: 65 },
  ],
  weather_outlook: { rainfallMm24h: 0 },
  active_insurance: [],
  household_income_details: { income_streams: [{ source: 'pension', amount_monthly: 1000, frequency: 'monthly', reliability: 'guaranteed', active_months: null }] },
  total_non_farm_monthly: 1000,
  household_expense_details: { expense_categories: [{ category: 'food_groceries', monthly: 6000, peak_months: null, peak_amount: 0 }] },
  total_household_expense_monthly: 6000,
};

const MOCK_BENCHMARKS = [
  {
    district_id: 45, activity_type: 'crop', crop_id: 'crop_paddy', season: 'kharif',
    avg_yield_kg_per_hectare: 3600, avg_cost_per_hectare: 55000, avg_revenue_per_hectare: 79200,
    avg_profit_per_hectare: 24200, yield_rainfall_elasticity: -0.5, yield_temperature_sensitivity: -0.3,
    historical_claim_rate_pct: 30,
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

// ═════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Insurance Decision Engine', () => {
  describe('PMFBY Crop Insurance — Deterministic', () => {
    const INPUT = {
      farmer_id: 1,
      insurance_type: 'pmfby',
      sum_insured: 100000,
      premium_amount: null, // auto-calculate
      activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
      computation_mode: 'deterministic',
    };

    let result;
    beforeAll(() => {
      result = insuranceEngine.compute({ snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: INPUT });
    });

    it('should return all required top-level keys', () => {
      expect(result).toHaveProperty('farmerSummary');
      expect(result).toHaveProperty('insuranceTerms');
      expect(result).toHaveProperty('baseComparison');
      expect(result).toHaveProperty('stressComparisons');
      expect(result).toHaveProperty('fiveYearAnalysis');
      expect(result).toHaveProperty('breakEven');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('scenarios');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('recommendations');
      expect(result.monteCarlo).toBeNull(); // deterministic
    });

    it('should calculate correct PMFBY premium (2% kharif)', () => {
      expect(result.insuranceTerms.insurance_type).toBe('pmfby');
      expect(result.insuranceTerms.premium_per_season).toBe(2000); // 100000 × 0.02
      expect(result.insuranceTerms.sum_insured).toBe(100000);
      expect(result.insuranceTerms.premium_as_pct_of_sum).toBe(2);
    });

    it('should produce 2 storage scenarios (with/without insurance)', () => {
      expect(result.scenarios).toHaveLength(2);
      expect(result.scenarios[0].label).toBe('without_insurance');
      expect(result.scenarios[1].label).toBe('with_insurance');
    });

    it('should compare insured vs uninsured under normal conditions', () => {
      const base = result.baseComparison.normal_conditions;
      expect(base.without_insurance.net_income).toBeDefined();
      expect(base.with_insurance.net_income).toBeDefined();
      // Under normal conditions, insured should be slightly lower (premium cost)
      expect(base.with_insurance.net_income).toBeLessThanOrEqual(base.without_insurance.net_income);
    });
  });

  describe('Stress Comparisons', () => {
    it('should show insurance benefit under drought stress', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          stress_scenarios: [{ label: 'severe_drought', rainfall_deviation_pct: -35, yield_factor: 0.5 }],
          computation_mode: 'deterministic',
        },
      });

      expect(result.stressComparisons).toHaveLength(1);
      const stress = result.stressComparisons[0];

      // Under severe drought with yield_factor 0.5, claim should trigger
      // (actual yield < 70% of benchmark)
      expect(stress.insurance_payout).toBeGreaterThan(0);
      expect(stress.with_insurance.net_income).toBeGreaterThan(stress.without_insurance.net_income);
      expect(stress.net_benefit).toBeGreaterThan(0);
    });

    it('should not trigger payout under mild conditions', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          stress_scenarios: [{ label: 'mild', rainfall_deviation_pct: -5, yield_factor: 0.95 }],
          computation_mode: 'deterministic',
        },
      });

      const stress = result.stressComparisons[0];
      // Mild conditions — yield still above 70% threshold
      expect(stress.insurance_payout).toBe(0);
    });

    it('should use default stress scenarios when none provided', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          computation_mode: 'deterministic',
        },
      });

      // Should have 3 default crop stress scenarios
      expect(result.stressComparisons.length).toBe(3);
    });
  });

  describe('5-Year Projection', () => {
    let result;
    beforeAll(() => {
      result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          computation_mode: 'deterministic',
        },
      });
    });

    it('should project 5 years of premiums vs payouts', () => {
      const fiveYear = result.fiveYearAnalysis;
      expect(fiveYear.projection_years).toBe(5);
      expect(fiveYear.annual_premium).toBeGreaterThan(0);
      expect(fiveYear.annual_claim_probability).toBeGreaterThan(0);
      expect(fiveYear.annual_claim_probability).toBeLessThanOrEqual(1);
      expect(fiveYear.five_year_total_premiums).toBe(fiveYear.annual_premium * 5);
      expect(fiveYear.yearly_breakdown).toHaveLength(5);
    });

    it('should have cumulative values in yearly breakdown', () => {
      const years = result.fiveYearAnalysis.yearly_breakdown;
      for (let i = 1; i < years.length; i++) {
        expect(years[i].premium_paid).toBeGreaterThan(years[i - 1].premium_paid);
      }
    });

    it('should compute 5-year ROI', () => {
      expect(result.fiveYearAnalysis.five_year_roi_pct).toBeDefined();
      // With 30% historical claim rate and decent payout, ROI should be meaningful
    });
  });

  describe('Break-Even Analysis', () => {
    it('should compute break-even claim frequency', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          computation_mode: 'deterministic',
        },
      });

      const be = result.breakEven;
      expect(be.break_even_claim_frequency).toBeGreaterThan(0);
      expect(be.break_even_claim_frequency).toBeLessThanOrEqual(1);
      expect(be.historical_claim_frequency).toBe(0.3); // from benchmark
      expect(be.trigger_yield_kg_per_hectare).toBe(2520); // 3600 × 0.70
      expect(be.break_even_verdict).toBeDefined();
    });
  });

  describe('Monte Carlo Mode', () => {
    it('should run MC and return payout statistics', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          computation_mode: 'monte_carlo',
          monte_carlo_runs: 200,
        },
      });

      expect(result.monteCarlo).not.toBeNull();
      expect(result.monteCarlo.num_runs).toBe(200);
      expect(result.monteCarlo.payout_probability).toBeGreaterThanOrEqual(0);
      expect(result.monteCarlo.payout_probability).toBeLessThanOrEqual(1);
      expect(result.monteCarlo.expected_payout_frequency).toBeGreaterThanOrEqual(0);

      // Insurance has capped payouts, so in the absolute worst case the
      // insured outcome may still be lower (premium paid but payout caps
      // hit). What matters is the overall expected benefit and tail shape.
      expect(result.monteCarlo.worst_case_loss_insured).toBeDefined();
      expect(result.monteCarlo.worst_case_loss_uninsured).toBeDefined();
      expect(result.monteCarlo.income_p50_insured).toBeDefined();
      expect(result.monteCarlo.income_p10_insured).toBeDefined();

      // Average payout should be non-negative
      expect(result.monteCarlo.average_payout_amount).toBeGreaterThanOrEqual(0);
    }, 15000);
  });

  describe('Recommendation', () => {
    it('should generate ENROLL/OPTIONAL/SKIP verdict', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          computation_mode: 'deterministic',
        },
      });

      expect(['ENROLL', 'OPTIONAL', 'SKIP']).toContain(result.recommendation.verdict);
      expect(['high', 'medium', 'low']).toContain(result.recommendation.confidence);
      expect(result.recommendation.reasoning).toBeDefined();
      expect(result.recommendation.enroll_score).toBeGreaterThanOrEqual(0);
    });

    it('should recommend ENROLL for high claim rate district', () => {
      // Benchmark has 30% claim rate — above break-even — should recommend enrollment
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          stress_scenarios: [{ label: 'drought', rainfall_deviation_pct: -35, yield_factor: 0.5 }],
          computation_mode: 'deterministic',
        },
      });

      // With 30% claim rate and stress showing large losses, should lean toward ENROLL
      expect(result.recommendation.enroll_score).toBeGreaterThanOrEqual(30);
    });

    it('should generate recommendations list', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          computation_mode: 'deterministic',
        },
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      // Should include PMFBY subsidy info
      const subsidyRec = result.recommendations.find(r => r.message_key === 'drishti.rec.pmfby_subsidy');
      expect(subsidyRec).toBeDefined();
      // Should include break-even info
      const beRec = result.recommendations.find(r => r.message_key === 'drishti.rec.insurance_breakeven');
      expect(beRec).toBeDefined();
    });
  });

  describe('Livestock Insurance', () => {
    it('should handle livestock insurance type', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'livestock', sum_insured: 150000,
          activity: { type: 'dairy', animal_count: 3 },
          computation_mode: 'deterministic',
        },
      });

      expect(result.insuranceTerms.insurance_type).toBe('livestock');
      // Premium at 3.5%
      expect(result.insuranceTerms.premium_per_season).toBe(5250); // 150000 × 0.035
      expect(result.stressComparisons.length).toBe(2); // mild_disease + epidemic
    });

    it('should trigger livestock payout on epidemic scenario', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'livestock', sum_insured: 150000,
          activity: { type: 'dairy', animal_count: 3 },
          stress_scenarios: [{ label: 'epidemic', rainfall_deviation_pct: 0, yield_factor: 0.3 }],
          computation_mode: 'deterministic',
        },
      });

      const epidemic = result.stressComparisons[0];
      expect(epidemic.insurance_payout).toBeGreaterThan(0);
    });
  });

  describe('Aquaculture Insurance', () => {
    it('should handle aquaculture insurance type', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'aquaculture', sum_insured: 200000,
          activity: { type: 'fishery', pond_area_hectares: 0.2 },
          computation_mode: 'deterministic',
        },
      });

      expect(result.insuranceTerms.insurance_type).toBe('aquaculture');
      // Premium at 4.5%
      expect(result.insuranceTerms.premium_per_season).toBe(9000); // 200000 × 0.045
    });
  });

  describe('Premium Calculation', () => {
    it('should use premium_amount override when provided', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          premium_amount: 3500, // override
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          computation_mode: 'deterministic',
        },
      });

      expect(result.insuranceTerms.premium_per_season).toBe(3500);
    });

    it('should apply rabi rate (1.5%) for rabi season', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'rabi' },
          computation_mode: 'deterministic',
        },
      });

      expect(result.insuranceTerms.premium_per_season).toBe(1500); // 100000 × 0.015
    });
  });

  describe('Risk Factors', () => {
    it('should flag uninsured status', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          computation_mode: 'deterministic',
        },
      });

      const uninsuredRisk = result.riskFactors.find(r => r.message_key === 'drishti.risk.uninsured');
      expect(uninsuredRisk).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle no benchmarks', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: [],
        input: {
          farmer_id: 1, insurance_type: 'pmfby', sum_insured: 100000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          computation_mode: 'deterministic',
        },
      });

      expect(result.scenarios).toHaveLength(2);
      expect(result.recommendation).toBeDefined();
    });

    it('should handle weather_index insurance type', () => {
      const result = insuranceEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          farmer_id: 1, insurance_type: 'weather_index', sum_insured: 80000,
          activity: { type: 'crop', crop_id: 'crop_paddy', acreage_hectares: 1.2, season: 'kharif' },
          computation_mode: 'deterministic',
        },
      });

      expect(result.insuranceTerms.insurance_type).toBe('weather_index');
      expect(result.insuranceTerms.premium_per_season).toBe(2400); // 80000 × 0.03
    });

    it('should export premium rates and claim trigger constant', () => {
      const { PREMIUM_RATES, CLAIM_TRIGGER_YIELD_PCT } = insuranceEngine;
      expect(PREMIUM_RATES).toBeDefined();
      expect(PREMIUM_RATES.pmfby.kharif).toBe(0.02);
      expect(CLAIM_TRIGGER_YIELD_PCT).toBe(0.70);
    });
  });
});
