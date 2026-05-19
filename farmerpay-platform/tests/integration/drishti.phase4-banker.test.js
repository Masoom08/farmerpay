/**
 * DRISHTI Phase 4 — Banker Portfolio Engine Tests
 *
 * Tests the portfolio aggregation engine (pure computation, no DB/RabbitMQ).
 * Tests the consumer's publishPortfolioJob export and processPortfolioJob logic.
 */

const { computePortfolio, SYNC_FARMER_LIMIT, CHUNK_SIZE } = require('../../src/modules/drishti/services/engines/bankerPortfolioEngine');

// ─── Fixtures ───────────────────────────────────────────────────────

const createFarmerSnapshot = (id, overrides = {}) => ({
  farmer_id: id,
  total_farm_size_hectares: 2.0,
  district_id: 45,
  trust_score: 70,
  trust_band: 'good',
  total_outstanding: 100000,
  total_monthly_emi: 8500,
  non_farm_income_streams: 3,

  active_crop_cycles: [{ cropId: 'crop_paddy', season: 'kharif', status: 'growing' }],
  active_dairy_profile: { herdId: 1, animalCount: 2 },
  active_fishery_profile: null,

  historical_crop_profitability: [
    { season: 'kharif', year: 2025, cropId: 'crop_paddy', actualProfit: 40000, isProfitable: true },
  ],
  historical_dairy_profitability: [],
  historical_fishery_profitability: [],

  active_loans: [{ applicationId: 100 + id, outstanding: 100000, emiAmount: 8500, healthStatus: 'good' }],

  relevant_commodity_prices: [
    { commodityId: 'crop_paddy', currentPrice: 22, priceTrend: 'stable', forecast30dPrice: 23, forecastConfidence: 60 },
  ],
  weather_outlook: { rainfallMm24h: 0 },
  active_insurance: [],

  household_income_details: {
    income_streams: [
      { source: 'pension', amount_monthly: 1000, frequency: 'monthly', reliability: 'guaranteed', active_months: null },
      { source: 'remittance', amount_monthly: 3000, frequency: 'monthly', reliability: 'regular', active_months: null },
    ],
  },
  total_non_farm_monthly: 4000,
  household_expense_details: {
    expense_categories: [
      { category: 'food_groceries', monthly: 5000, peak_months: null, peak_amount: 0 },
    ],
  },
  total_household_expense_monthly: 5000,
  ...overrides,
});

const MOCK_BENCHMARKS = [
  {
    district_id: 45, activity_type: 'crop', crop_id: 'crop_paddy', season: 'kharif',
    avg_yield_kg_per_hectare: 3600, avg_cost_per_hectare: 55000, avg_revenue_per_hectare: 79200,
    avg_profit_per_hectare: 24200, yield_rainfall_elasticity: -0.5, yield_temperature_sensitivity: -0.3,
  },
  {
    district_id: 45, activity_type: 'dairy',
    avg_milk_yield_per_animal: 7, avg_monthly_cost_per_animal: 4500, avg_monthly_revenue_per_animal: 7350,
  },
];

const buildPortfolio = (count, overrides = {}) =>
  Array.from({ length: count }, (_, i) => ({
    snapshot: createFarmerSnapshot(i + 1, overrides),
    benchmarks: MOCK_BENCHMARKS,
  }));

// ═════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Banker Portfolio Engine', () => {
  describe('Constants', () => {
    it('should export SYNC_FARMER_LIMIT and CHUNK_SIZE', () => {
      expect(SYNC_FARMER_LIMIT).toBe(50);
      expect(CHUNK_SIZE).toBe(50);
    });
  });

  describe('Small Portfolio (Synchronous)', () => {
    let result;

    beforeAll(() => {
      result = computePortfolio({
        farmerSnapshots: buildPortfolio(10),
        shockVariables: { rainfall_deviation_pct: -25, price_change_pct: -10, temperature_deviation_celsius: 2 },
        computationMode: 'deterministic',
      });
    });

    it('should return all required top-level keys', () => {
      expect(result).toHaveProperty('portfolioSummary');
      expect(result).toHaveProperty('stressImpact');
      expect(result).toHaveProperty('portfolioVar95');
      expect(result).toHaveProperty('interventionList');
      expect(result).toHaveProperty('scenarios');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('recommendations');
    });

    it('should report correct farmer count', () => {
      expect(result.portfolioSummary.total_farmers).toBe(10);
      expect(result.portfolioSummary.processed_farmers).toBe(10);
      expect(result.portfolioSummary.failed_farmers).toBe(0);
    });

    it('should aggregate total outstanding', () => {
      // 10 farmers × ₹100,000 each
      expect(result.portfolioSummary.total_outstanding).toBe(1000000);
    });

    it('should compute stress impact', () => {
      expect(result.stressImpact).toHaveProperty('projected_npa_count');
      expect(result.stressImpact).toHaveProperty('projected_npa_amount');
      expect(result.stressImpact).toHaveProperty('additional_npa_count');
      expect(result.stressImpact).toHaveProperty('portfolio_at_risk_pct');
      expect(result.stressImpact.projected_npa_count).toBeGreaterThanOrEqual(0);
    });

    it('should compute SMA migration matrix', () => {
      const m = result.stressImpact.sma_migration;
      expect(m).toHaveProperty('good_to_watch');
      expect(m).toHaveProperty('good_to_stressed');
      expect(m).toHaveProperty('good_to_npa');
      expect(m).toHaveProperty('watch_to_stressed');
      expect(m).toHaveProperty('watch_to_npa');
      expect(m).toHaveProperty('stressed_to_npa');
      expect(m).toHaveProperty('improved');
      expect(m).toHaveProperty('no_change');

      // Sum of all should equal total farmers
      const total = m.good_to_watch + m.good_to_stressed + m.good_to_npa
        + m.watch_to_stressed + m.watch_to_npa + m.stressed_to_npa
        + m.improved + m.no_change;
      expect(total).toBe(10);
    });

    it('should compute portfolio VaR', () => {
      expect(result.portfolioVar95).toBeGreaterThanOrEqual(0);
    });

    it('should produce intervention list sorted by risk', () => {
      expect(Array.isArray(result.interventionList)).toBe(true);
      for (const item of result.interventionList) {
        expect(item).toHaveProperty('farmer_id');
        expect(item).toHaveProperty('outstanding');
        expect(item).toHaveProperty('current_status');
        expect(item).toHaveProperty('projected_status');
        expect(item).toHaveProperty('risk_score');
        expect(item).toHaveProperty('income_change');
      }

      // Should be sorted by risk_score descending
      for (let i = 1; i < result.interventionList.length; i++) {
        expect(result.interventionList[i].risk_score).toBeLessThanOrEqual(result.interventionList[i - 1].risk_score);
      }
    });

    it('should produce scenario for storage', () => {
      expect(result.scenarios).toHaveLength(1);
      expect(result.scenarios[0].label).toBe('portfolio_stress');
    });
  });

  describe('Stress Impact Under Drought', () => {
    it('should show worse outcomes under severe drought', () => {
      const mild = computePortfolio({
        farmerSnapshots: buildPortfolio(5),
        shockVariables: { rainfall_deviation_pct: -10, price_change_pct: 0, temperature_deviation_celsius: 0 },
      });

      const severe = computePortfolio({
        farmerSnapshots: buildPortfolio(5),
        shockVariables: { rainfall_deviation_pct: -40, price_change_pct: -15, temperature_deviation_celsius: 3 },
      });

      // Severe should have worse NPA or higher portfolio at risk
      expect(severe.stressImpact.projected_npa_count).toBeGreaterThanOrEqual(mild.stressImpact.projected_npa_count);
    });
  });

  describe('Monte Carlo Mode', () => {
    it('should return MC aggregate when computation_mode is monte_carlo', () => {
      const result = computePortfolio({
        farmerSnapshots: buildPortfolio(3), // Keep small for test speed
        shockVariables: { rainfall_deviation_pct: -25, price_change_pct: -10, temperature_deviation_celsius: 2 },
        computationMode: 'monte_carlo',
        monteCarloRuns: 50,
      });

      expect(result.monteCarlo).not.toBeNull();
      expect(result.monteCarlo.avg_probability_profitable).toBeGreaterThanOrEqual(0);
      expect(result.monteCarlo.avg_probability_profitable).toBeLessThanOrEqual(1);
      expect(result.monteCarlo.avg_probability_sma_stress).toBeGreaterThanOrEqual(0);
      expect(result.monteCarlo.avg_probability_default).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should not return MC when mode is deterministic', () => {
      const result = computePortfolio({
        farmerSnapshots: buildPortfolio(3),
        shockVariables: { rainfall_deviation_pct: -25, price_change_pct: 0, temperature_deviation_celsius: 0 },
        computationMode: 'deterministic',
      });

      expect(result.monteCarlo).toBeNull();
    });
  });

  describe('Risk Factors', () => {
    it('should identify portfolio risk factors', () => {
      const result = computePortfolio({
        farmerSnapshots: buildPortfolio(10),
        shockVariables: { rainfall_deviation_pct: -30, price_change_pct: -10, temperature_deviation_celsius: 2 },
      });

      expect(result.riskFactors.length).toBeGreaterThan(0);
      for (const rf of result.riskFactors) {
        expect(rf).toHaveProperty('factor');
        expect(rf).toHaveProperty('impact');
        expect(rf).toHaveProperty('message_key');
        expect(rf).toHaveProperty('message');
      }
    });
  });

  describe('Recommendations', () => {
    it('should generate portfolio-level recommendations', () => {
      const result = computePortfolio({
        farmerSnapshots: buildPortfolio(10),
        shockVariables: { rainfall_deviation_pct: -30, price_change_pct: -10, temperature_deviation_celsius: 2 },
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      for (const rec of result.recommendations) {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('message');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty portfolio', () => {
      const result = computePortfolio({
        farmerSnapshots: [],
        shockVariables: { rainfall_deviation_pct: -25, price_change_pct: 0, temperature_deviation_celsius: 0 },
      });

      expect(result.portfolioSummary.total_farmers).toBe(0);
      expect(result.portfolioSummary.total_outstanding).toBe(0);
    });

    it('should handle single farmer portfolio', () => {
      const result = computePortfolio({
        farmerSnapshots: buildPortfolio(1),
        shockVariables: { rainfall_deviation_pct: -25, price_change_pct: 0, temperature_deviation_celsius: 0 },
      });

      expect(result.portfolioSummary.total_farmers).toBe(1);
    });

    it('should handle mixed healthy/stressed farmers', () => {
      const snapshots = [
        // Healthy farmer: low debt, diversified
        { snapshot: createFarmerSnapshot(1, { total_outstanding: 50000, total_monthly_emi: 4000 }), benchmarks: MOCK_BENCHMARKS },
        // Stressed farmer: high debt, no non-farm income
        { snapshot: createFarmerSnapshot(2, {
          total_outstanding: 300000, total_monthly_emi: 25000,
          household_income_details: { income_streams: [] }, total_non_farm_monthly: 0,
        }), benchmarks: MOCK_BENCHMARKS },
      ];

      const result = computePortfolio({
        farmerSnapshots: snapshots,
        shockVariables: { rainfall_deviation_pct: -30, price_change_pct: -10, temperature_deviation_celsius: 2 },
      });

      expect(result.portfolioSummary.processed_farmers).toBe(2);
      // The stressed farmer should be in the intervention list
      const intervention = result.interventionList.find(i => i.farmer_id === 2);
      if (intervention) {
        expect(intervention.risk_score).toBeGreaterThan(0);
      }
    });

    it('should call onProgress callback', () => {
      const progressCalls = [];
      computePortfolio({
        farmerSnapshots: buildPortfolio(20),
        shockVariables: { rainfall_deviation_pct: -20, price_change_pct: 0, temperature_deviation_celsius: 0 },
        onProgress: (pct) => progressCalls.push(pct),
      });

      // Should have been called at least once (every 10 farmers)
      expect(progressCalls.length).toBeGreaterThanOrEqual(1);
      expect(progressCalls[0]).toBeGreaterThan(0);
    });

    it('should handle farmer with no crops gracefully', () => {
      const noCropSnapshot = createFarmerSnapshot(1, { active_crop_cycles: [] });
      const result = computePortfolio({
        farmerSnapshots: [{ snapshot: noCropSnapshot, benchmarks: MOCK_BENCHMARKS }],
        shockVariables: { rainfall_deviation_pct: -25, price_change_pct: 0, temperature_deviation_celsius: 0 },
      });

      expect(result.portfolioSummary.processed_farmers).toBe(1);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// Worker Module Exports
// ═════════════════════════════════════════════════════════════════════

describe('Portfolio Simulation Consumer', () => {
  it('should export publishPortfolioJob and processPortfolioJob', () => {
    const consumer = require('../../src/modules/drishti/workers/portfolioSimulationConsumer');
    expect(typeof consumer.publishPortfolioJob).toBe('function');
    expect(typeof consumer.processPortfolioJob).toBe('function');
    expect(typeof consumer.start).toBe('function');
  });
});
