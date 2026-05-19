/**
 * DRISHTI Phase 3 — Monte Carlo Simulator + Climate Stress Engine
 *
 * Tests:
 *  1. Monte Carlo Simulator — distribution sampling, percentiles, aggregation
 *  2. Climate Stress Engine — deterministic scenarios, impact cascade, MC mode
 */

// ─── Shared Fixtures ────────────────────────────────────────────────

const MOCK_SNAPSHOT = {
  farmer_id: 1,
  total_farm_size_hectares: 2.5,
  district_id: 45,
  block_id: 102,
  family_members_count: 5,
  earning_members_count: 3,
  dependents_count: 2,
  trust_score: 72,
  trust_band: 'good',
  total_outstanding: 85000,
  total_monthly_emi: 8650,
  non_farm_income_streams: 4,
  spouse_occupation: 'SHG member',

  active_crop_cycles: [
    { cycleId: 1, cropId: 'crop_paddy', season: 'kharif', status: 'growing' },
  ],
  active_dairy_profile: { herdId: 1, animalCount: 3 },
  active_fishery_profile: { registerId: 1, totalPondAreaHectares: 0.2 },

  historical_crop_profitability: [
    { season: 'kharif', year: 2025, cropId: 'crop_paddy', actualProfit: 45000, isProfitable: true },
    { season: 'kharif', year: 2024, cropId: 'crop_paddy', actualProfit: 38000, isProfitable: true },
  ],
  historical_dairy_profitability: [
    { month: 3, year: 2026, totalIncome: 12000, totalExpense: 5000, netProfit: 7000 },
  ],
  historical_fishery_profitability: [],

  active_loans: [{ applicationId: 101, outstanding: 85000, emiAmount: 8650, healthStatus: 'good' }],

  relevant_commodity_prices: [
    { commodityId: 'crop_paddy', currentPrice: 22, priceTrend: 'stable', forecast30dPrice: 23, forecastConfidence: 65 },
  ],
  weather_outlook: { rainfallMm24h: 0, tempCelsius: 34 },

  active_insurance: [],

  household_income_details: {
    income_streams: [
      { source: 'spouse_shg', amount_monthly: 3500, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'remittance', amount_monthly: 5000, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'pension', amount_monthly: 1000, frequency: 'monthly', reliability: 'guaranteed', active_months: null },
    ],
    total_monthly_non_farm: 9500,
  },
  total_non_farm_monthly: 9500,

  household_expense_details: {
    expense_categories: [
      { category: 'food_groceries', monthly: 6000, peak_months: null, peak_amount: 0 },
      { category: 'education', monthly: 2500, peak_months: null, peak_amount: 0 },
      { category: 'utilities', monthly: 1200, peak_months: null, peak_amount: 0 },
    ],
    total_monthly_expense: 9700,
  },
  total_household_expense_monthly: 9700,
};

const MOCK_BENCHMARKS = [
  {
    district_id: 45, activity_type: 'crop', crop_id: 'crop_paddy', season: 'kharif',
    avg_yield_kg_per_hectare: 3600, avg_cost_per_hectare: 55000, avg_revenue_per_hectare: 79200,
    avg_profit_per_hectare: 24200, yield_rainfall_elasticity: -0.5, yield_temperature_sensitivity: -0.3,
    historical_claim_rate_pct: 25,
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
// 1. MONTE CARLO SIMULATOR
// ═════════════════════════════════════════════════════════════════════

describe('Monte Carlo Simulator', () => {
  const {
    runMonteCarlo, sampleDistribution, sampleNormal,
    createSeededRng, percentile, stddev, DEFAULT_DISTRIBUTIONS,
  } = require('../../src/modules/drishti/services/computation/monteCarloSimulator');

  describe('Distribution Sampling', () => {
    it('should sample from normal distribution with correct mean (seeded)', () => {
      const rng = createSeededRng(42);
      const samples = Array.from({ length: 5000 }, () =>
        sampleDistribution({ mean: 100, stddev: 10, min: 50, max: 150, type: 'normal' }, rng)
      );

      const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
      // Mean should be close to 100 (within ±2 for 5000 samples)
      expect(avg).toBeGreaterThan(97);
      expect(avg).toBeLessThan(103);
    });

    it('should clamp samples to min/max', () => {
      const rng = createSeededRng(123);
      const samples = Array.from({ length: 1000 }, () =>
        sampleDistribution({ mean: 0, stddev: 100, min: -10, max: 10, type: 'normal' }, rng)
      );

      expect(Math.min(...samples)).toBeGreaterThanOrEqual(-10);
      expect(Math.max(...samples)).toBeLessThanOrEqual(10);
    });

    it('should sample uniform distribution within bounds', () => {
      const rng = createSeededRng(77);
      const samples = Array.from({ length: 1000 }, () =>
        sampleDistribution({ mean: 5, stddev: 0, min: 0, max: 10, type: 'uniform' }, rng)
      );

      expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...samples)).toBeLessThanOrEqual(10);
      // Uniform mean should be ~5
      const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
      expect(avg).toBeGreaterThan(4);
      expect(avg).toBeLessThan(6);
    });

    it('should produce reproducible results with same seed', () => {
      const rng1 = createSeededRng(42);
      const rng2 = createSeededRng(42);
      const s1 = Array.from({ length: 10 }, () => sampleNormal(0, 1, rng1));
      const s2 = Array.from({ length: 10 }, () => sampleNormal(0, 1, rng2));
      expect(s1).toEqual(s2);
    });
  });

  describe('Statistical Helpers', () => {
    it('should compute correct percentiles', () => {
      const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      expect(percentile(sorted, 0)).toBe(10);
      expect(percentile(sorted, 50)).toBe(55);
      expect(percentile(sorted, 100)).toBe(100);
    });

    it('should compute standard deviation', () => {
      const arr = [2, 4, 4, 4, 5, 5, 7, 9];
      const sd = stddev(arr);
      expect(sd).toBeGreaterThan(1.5);
      expect(sd).toBeLessThan(2.5);
    });
  });

  describe('Full MC Run', () => {
    it('should run N iterations and return summary + percentiles + probabilities', () => {
      const computeFn = (vars) => ({
        netIncome: 100000 * vars.yield_factor * vars.price_factor - 60000 * vars.cost_factor,
        healthStatus: (100000 * vars.yield_factor - 60000) > 20000 ? 'good' : 'stressed',
        smaClass: (100000 * vars.yield_factor - 60000) > 0 ? 'standard' : 'npa',
        deficitMonths: vars.yield_factor < 0.7 ? 4 : 1,
      });

      const result = runMonteCarlo({
        computeFn,
        baseVariables: { yield_factor: 1.0, price_factor: 1.0, cost_factor: 1.0 },
        distributions: DEFAULT_DISTRIBUTIONS,
        numRuns: 500,
        seed: 42,
      });

      expect(result.summary.num_runs).toBe(500);
      expect(result.summary.mean_income).toBeDefined();
      expect(result.summary.median_income).toBeDefined();
      expect(result.summary.stddev_income).toBeGreaterThan(0);

      expect(result.percentiles.income_p10).toBeLessThan(result.percentiles.income_p50);
      expect(result.percentiles.income_p50).toBeLessThan(result.percentiles.income_p90);

      expect(result.probabilities.profitable).toBeGreaterThan(0);
      expect(result.probabilities.profitable).toBeLessThanOrEqual(1);

      expect(result.distribution.health_status).toBeDefined();
      expect(result.distribution.sma_class).toBeDefined();
    });

    it('should vary only specified variables', () => {
      let callCount = 0;
      const computeFn = (vars) => {
        callCount++;
        return { netIncome: vars.yield_factor * 100, healthStatus: 'good', smaClass: 'standard' };
      };

      runMonteCarlo({
        computeFn,
        baseVariables: { yield_factor: 1.0, price_factor: 1.0 },
        numRuns: 100,
        varyVariables: ['yield_factor'], // only vary yield
        seed: 42,
      });

      expect(callCount).toBe(100);
    });

    it('should center distributions around base variables', () => {
      const incomes = [];
      const computeFn = (vars) => {
        incomes.push(vars.yield_factor);
        return { netIncome: vars.yield_factor * 100000, healthStatus: 'good', smaClass: 'standard' };
      };

      runMonteCarlo({
        computeFn,
        baseVariables: { yield_factor: 0.7 }, // stressed center
        distributions: { yield_factor: { mean: 0.7, stddev: 0.1, min: 0.2, max: 1.5, type: 'normal' } },
        numRuns: 1000,
        varyVariables: ['yield_factor'],
        seed: 42,
      });

      const avg = incomes.reduce((s, v) => s + v, 0) / incomes.length;
      expect(avg).toBeGreaterThan(0.65);
      expect(avg).toBeLessThan(0.75);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. CLIMATE STRESS ENGINE
// ═════════════════════════════════════════════════════════════════════

describe('Climate Stress Engine', () => {
  const climateStressEngine = require('../../src/modules/drishti/services/engines/climateStressEngine');

  const BASE_INPUT = {
    farmer_id: 1,
    climate_scenario: {
      rainfall_deviation_pct: -25,
      temperature_deviation_celsius: 2,
      delayed_monsoon_weeks: 0,
    },
    include_household_impact: true,
    computation_mode: 'deterministic',
  };

  describe('Deterministic Mode', () => {
    let result;

    beforeAll(() => {
      result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });
    });

    it('should return all required top-level keys', () => {
      expect(result).toHaveProperty('farmerSummary');
      expect(result).toHaveProperty('climateScenario');
      expect(result).toHaveProperty('impactCascade');
      expect(result).toHaveProperty('scenarios');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('recommendations');
      expect(result.monteCarlo).toBeNull(); // deterministic mode
    });

    it('should produce baseline and stress scenarios', () => {
      expect(result.scenarios).toHaveLength(2);
      expect(result.scenarios[0].label).toBe('baseline');
      expect(result.scenarios[1].label).toBe('stress');
    });

    it('should classify climate scenario', () => {
      expect(result.climateScenario.scenario_type).toBe('severe_drought');
      expect(result.climateScenario.severity).toBeDefined();
      expect(['mild', 'moderate', 'severe', 'extreme']).toContain(result.climateScenario.severity);
    });

    it('should show stress revenue lower than baseline', () => {
      const baseline = result.scenarios[0].projections;
      const stress = result.scenarios[1].projections;
      expect(stress.total_revenue).toBeLessThan(baseline.total_revenue);
    });

    it('should include monthly cashflow for each scenario', () => {
      for (const scenario of result.scenarios) {
        expect(scenario.monthly_cashflow).toHaveLength(12);
        expect(scenario.monthly_cashflow[0]).toHaveProperty('net');
      }
    });
  });

  describe('Impact Cascade', () => {
    it('should cascade rainfall → yield → revenue → income → loan stress', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });
      const cascade = result.impactCascade;

      expect(cascade).toHaveProperty('yield_impact');
      expect(cascade).toHaveProperty('revenue_impact');
      expect(cascade).toHaveProperty('cost_impact');
      expect(cascade).toHaveProperty('income_impact');
      expect(cascade).toHaveProperty('loan_stress');
      expect(cascade).toHaveProperty('cash_flow_stress');

      // Revenue should decrease under drought
      expect(cascade.revenue_impact.change).toBeLessThan(0);
      expect(cascade.revenue_impact.change_pct).toBeLessThan(0);

      // Income should decrease
      expect(cascade.income_impact.change).toBeLessThan(0);
    });

    it('should show dairy feed cost increase during drought', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      expect(result.impactCascade.cost_impact.dairy_feed_multiplier).toBeGreaterThan(1.0);
    });

    it('should track SMA migration', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      expect(result.impactCascade.loan_stress).toHaveProperty('baseline_health');
      expect(result.impactCascade.loan_stress).toHaveProperty('stress_health');
      expect(result.impactCascade.loan_stress).toHaveProperty('sma_migration');
    });
  });

  describe('Climate Scenarios', () => {
    it('should handle severe drought (-35% rainfall)', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, climate_scenario: { rainfall_deviation_pct: -35, temperature_deviation_celsius: 2.5, delayed_monsoon_weeks: 2 } },
      });

      expect(result.climateScenario.scenario_type).toBe('severe_drought');
      // Severe drought should cause revenue drop (buffered by dairy/fishery)
      const revChange = result.impactCascade.revenue_impact.change_pct;
      expect(revChange).toBeLessThan(0);
    });

    it('should handle flood scenario (+45% rainfall)', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, climate_scenario: { rainfall_deviation_pct: 45, temperature_deviation_celsius: -1, delayed_monsoon_weeks: 0 } },
      });

      expect(result.climateScenario.scenario_type).toBe('flood');
      // Flood should damage crops
      expect(result.impactCascade.yield_impact.flood_damage_pct).toBeGreaterThan(0);
    });

    it('should handle delayed monsoon (4 weeks)', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, climate_scenario: { rainfall_deviation_pct: -10, temperature_deviation_celsius: 1, delayed_monsoon_weeks: 4 } },
      });

      expect(result.climateScenario.scenario_type).toBe('delayed_monsoon');
      expect(result.impactCascade.yield_impact.monsoon_delay_penalty_pct).toBe(25); // 4 weeks = 25% penalty
    });

    it('should handle heatwave (+4°C)', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, climate_scenario: { rainfall_deviation_pct: -5, temperature_deviation_celsius: 4, delayed_monsoon_weeks: 0 } },
      });

      expect(result.climateScenario.scenario_type).toBe('heatwave');
    });
  });

  describe('Monte Carlo Mode', () => {
    it('should run MC simulation and return probability distributions', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: {
          ...BASE_INPUT,
          computation_mode: 'monte_carlo',
          monte_carlo_runs: 200, // keep fast for tests
        },
      });

      expect(result.monteCarlo).not.toBeNull();
      expect(result.monteCarlo.num_runs).toBe(200);
      expect(result.monteCarlo.probability_profitable).toBeGreaterThanOrEqual(0);
      expect(result.monteCarlo.probability_profitable).toBeLessThanOrEqual(1);
      expect(result.monteCarlo.probability_sma_stress).toBeGreaterThanOrEqual(0);
      expect(result.monteCarlo.probability_loan_default).toBeGreaterThanOrEqual(0);

      expect(result.monteCarlo.income_p10).toBeLessThanOrEqual(result.monteCarlo.income_p50);
      expect(result.monteCarlo.income_p50).toBeLessThanOrEqual(result.monteCarlo.income_p90);

      expect(result.monteCarlo.health_status_distribution).toBeDefined();
      expect(result.monteCarlo.sma_distribution).toBeDefined();
    }, 15000); // 15s timeout for MC

    it('should skip MC when mode is deterministic', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, computation_mode: 'deterministic' },
      });

      expect(result.monteCarlo).toBeNull();
    });
  });

  describe('Risk Factors', () => {
    it('should flag drought risk under severe rainfall deficit', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      const droughtRisk = result.riskFactors.find(r => r.message_key === 'drishti.risk.drought');
      expect(droughtRisk).toBeDefined();
      expect(droughtRisk.impact).toBe('high');
    });

    it('should flag missing insurance', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      const insuranceRisk = result.riskFactors.find(r => r.message_key === 'drishti.risk.no_insurance_climate');
      expect(insuranceRisk).toBeDefined();
    });

    it('should flag dairy feed cost spike', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      const feedRisk = result.riskFactors.find(r => r.message_key === 'drishti.risk.dairy_feed');
      expect(feedRisk).toBeDefined();
    });
  });

  describe('Recommendations', () => {
    it('should generate actionable recommendations', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      for (const rec of result.recommendations) {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('message_key');
        expect(rec).toHaveProperty('message');
      }
    });

    it('should recommend insurance when not enrolled', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      const insuranceRec = result.recommendations.find(r => r.message_key === 'drishti.rec.get_insurance');
      expect(insuranceRec).toBeDefined();
    });

    it('should recommend irrigation for rainfall-dependent scenarios', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      const irrigRec = result.recommendations.find(r => r.message_key === 'drishti.rec.irrigation');
      expect(irrigRec).toBeDefined();
    });

    it('should include MC probability info when in MC mode', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, computation_mode: 'monte_carlo', monte_carlo_runs: 100 },
      });

      const mcRec = result.recommendations.find(r => r.message_key === 'drishti.rec.mc_probability');
      expect(mcRec).toBeDefined();
      expect(mcRec.message).toContain('100 simulations');
    }, 15000);
  });

  describe('Edge Cases', () => {
    it('should handle no active crops gracefully', () => {
      const noCropSnapshot = { ...MOCK_SNAPSHOT, active_crop_cycles: [] };
      const result = climateStressEngine.compute({
        snapshot: noCropSnapshot, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      expect(result.scenarios).toHaveLength(2);
      // Farm revenue should be from dairy + fishery only
    });

    it('should handle no benchmarks', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: [], input: BASE_INPUT,
      });

      expect(result.scenarios).toHaveLength(2);
    });

    it('should handle zero rainfall deviation (control scenario)', () => {
      const result = climateStressEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, climate_scenario: { rainfall_deviation_pct: 0, temperature_deviation_celsius: 0, delayed_monsoon_weeks: 0 } },
      });

      // Baseline and stress should be identical
      const base = result.scenarios[0].projections;
      const stress = result.scenarios[1].projections;
      expect(Math.abs(base.total_revenue - stress.total_revenue)).toBeLessThan(1);
    });
  });

  describe('Climate Templates', () => {
    it('should export pre-built scenario templates', () => {
      const { CLIMATE_TEMPLATES } = climateStressEngine;
      expect(CLIMATE_TEMPLATES).toBeDefined();
      expect(CLIMATE_TEMPLATES.severe_drought).toBeDefined();
      expect(CLIMATE_TEMPLATES.flood).toBeDefined();
      expect(CLIMATE_TEMPLATES.delayed_monsoon).toBeDefined();
      expect(CLIMATE_TEMPLATES.heatwave).toBeDefined();
    });
  });
});
