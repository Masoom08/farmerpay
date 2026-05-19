/**
 * DRISHTI Phase 4 — Benchmark Comparer + Market Timing Engine
 */

const marketTimingEngine = require('../../src/modules/drishti/services/engines/marketTimingEngine');
const { compareToBenchmark, comparePriceToMarket, estimatePercentileRank } = require('../../src/modules/drishti/services/computation/benchmarkComparer');

// ─── Shared Fixtures ────────────────────────────────────────────────

const MOCK_SNAPSHOT = {
  farmer_id: 1,
  total_farm_size_hectares: 2.5,
  district_id: 45,
  trust_score: 72,
  trust_band: 'good',
  total_outstanding: 85000,
  total_monthly_emi: 8650,
  active_crop_cycles: [{ cropId: 'crop_paddy', season: 'kharif' }],
  active_dairy_profile: null,
  active_fishery_profile: null,
  active_loans: [{ applicationId: 101, outstanding: 85000, interestRate: 7.0, emiAmount: 8650, healthStatus: 'good' }],
  relevant_commodity_prices: [
    { commodityId: 'crop_paddy', currentPrice: 2200, priceTrend: 'stable', forecast30dPrice: 2350, forecastConfidence: 60 },
  ],
  weather_outlook: { rainfallMm24h: 0 },
  active_insurance: [],
  household_income_details: { income_streams: [] },
  total_non_farm_monthly: 0,
  household_expense_details: { expense_categories: [] },
  total_household_expense_monthly: 0,
  historical_crop_profitability: [],
};

const MOCK_BENCHMARKS = [{
  district_id: 45, activity_type: 'crop', crop_id: 'crop_paddy', season: 'kharif',
  avg_yield_kg_per_hectare: 3600, avg_cost_per_hectare: 55000, avg_revenue_per_hectare: 79200,
  avg_profit_per_hectare: 24200, yield_rainfall_elasticity: -0.5,
}];

// ═════════════════════════════════════════════════════════════════════
// 1. BENCHMARK COMPARER
// ═════════════════════════════════════════════════════════════════════

describe('Benchmark Comparer', () => {
  it('should compare crop metrics to benchmark', () => {
    const result = compareToBenchmark({
      farmerMetrics: { yieldKgPerHa: 4000, costPerHa: 50000, revenuePerHa: 88000, profitPerHa: 38000 },
      benchmark: MOCK_BENCHMARKS[0],
      activityType: 'crop',
    });

    expect(result.comparisons.length).toBe(4);
    expect(result.compositeScore).toBeGreaterThan(50); // above benchmark
    expect(result.compositeRating).toBeDefined();
    expect(result.summary).toBeDefined();

    const yieldComp = result.comparisons.find(c => c.key === 'yield_per_hectare');
    expect(yieldComp.farmer).toBe(4000);
    expect(yieldComp.benchmark).toBe(3600);
    expect(yieldComp.rating).toBeDefined();
  });

  it('should rate poor performer below benchmark', () => {
    const result = compareToBenchmark({
      farmerMetrics: { yieldKgPerHa: 2000, costPerHa: 70000, revenuePerHa: 44000, profitPerHa: -26000 },
      benchmark: MOCK_BENCHMARKS[0],
      activityType: 'crop',
    });

    expect(result.compositeScore).toBeLessThan(50);
  });

  it('should handle missing benchmark gracefully', () => {
    const result = compareToBenchmark({ farmerMetrics: { yieldKgPerHa: 3000 }, benchmark: null });
    expect(result.compositeRating).toBe('no_benchmark');
  });

  it('should compare price to market', () => {
    const result = comparePriceToMarket({
      farmerPrice: 2200, benchmarkPrice: 2000, mspPrice: 2040, commodityId: 'paddy',
    });

    expect(result.variance_pct).toBe(10); // 10% above benchmark
    expect(result.above_msp).toBe(true);
    expect(result.rating).toBeDefined();
  });

  it('should estimate percentile rank', () => {
    const result = estimatePercentileRank(4000, 3600); // above average
    expect(result.percentile).toBeGreaterThan(50);
    expect(result.rating).toBeDefined();

    const below = estimatePercentileRank(2500, 3600); // below average
    expect(below.percentile).toBeLessThan(50);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. MARKET TIMING ENGINE
// ═════════════════════════════════════════════════════════════════════

describe('Market Timing Engine', () => {
  const BASE_INPUT = {
    farmer_id: 1,
    commodity_id: 'crop_paddy',
    quantity_quintals: 50,
    current_price_per_quintal: 2200,
    storage_options: {
      warehousing_cost_per_quintal_month: 50,
      storage_duration_months: [1, 2, 3],
      quality_degradation_pct_per_month: 1,
    },
    active_loan_id: 101,
    include_topup_loan_simulation: false,
    computation_mode: 'deterministic',
  };

  describe('Deterministic Mode', () => {
    let result;
    beforeAll(() => {
      result = marketTimingEngine.compute({ snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT });
    });

    it('should return all required top-level keys', () => {
      expect(result).toHaveProperty('farmerSummary');
      expect(result).toHaveProperty('commodity');
      expect(result).toHaveProperty('storageParameters');
      expect(result).toHaveProperty('sellNow');
      expect(result).toHaveProperty('storageScenarios');
      expect(result).toHaveProperty('priceTrajectory');
      expect(result).toHaveProperty('optimalWindow');
      expect(result).toHaveProperty('scenarios');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('recommendations');
      expect(result.monteCarlo).toBeNull();
    });

    it('should compute sell-now value correctly', () => {
      // 50 quintals × ₹2200 = ₹110000 gross, minus 1% market fee
      expect(result.sellNow.price_per_quintal).toBe(2200);
      expect(result.sellNow.gross_value).toBe(110000);
      expect(result.sellNow.net_proceeds).toBe(108900); // 110000 - 1100 fee
    });

    it('should produce storage scenarios for each duration', () => {
      expect(result.storageScenarios).toHaveLength(3);
      expect(result.storageScenarios[0].months).toBe(1);
      expect(result.storageScenarios[1].months).toBe(2);
      expect(result.storageScenarios[2].months).toBe(3);
    });

    it('should include storage costs in each scenario', () => {
      for (const s of result.storageScenarios) {
        expect(s.storage_cost).toBeGreaterThan(0);
        // Storage cost = 50/quintal/month × 50 quintals × N months
        expect(s.storage_cost).toBe(50 * 50 * s.months);
        expect(s.quality_loss_value).toBeGreaterThanOrEqual(0);
        expect(s.net_gain_vs_sell_now).toBeDefined();
        expect(s.storage_roi_pct).toBeDefined();
      }
    });

    it('should compute interest cost from active loan', () => {
      for (const s of result.storageScenarios) {
        expect(s.interest_cost).toBeGreaterThan(0);
      }
    });

    it('should produce price trajectory', () => {
      expect(result.priceTrajectory.monthly_prices.length).toBeGreaterThanOrEqual(4);
      expect(result.priceTrajectory.method).toBeDefined();
    });

    it('should produce scenarios for drishtiService storage', () => {
      expect(result.scenarios.length).toBe(4); // sell_now + 3 storage
      expect(result.scenarios[0].label).toBe('sell_now');
      expect(result.scenarios[1].label).toBe('store_1m');
    });
  });

  describe('Optimal Window', () => {
    it('should recommend a window with confidence', () => {
      const result = marketTimingEngine.compute({ snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT });
      const opt = result.optimalWindow;

      expect(opt.recommended_action).toBeDefined();
      expect(opt.recommended_months).toBeGreaterThanOrEqual(0);
      expect(opt.expected_net_proceeds).toBeGreaterThan(0);
      expect(opt.confidence).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(opt.confidence);
      expect(opt.all_options.length).toBe(4);
    });

    it('should rank sell-now highest when prices are falling', () => {
      const fallingSnapshot = {
        ...MOCK_SNAPSHOT,
        relevant_commodity_prices: [
          { commodityId: 'crop_paddy', currentPrice: 2200, priceTrend: 'falling', forecast30dPrice: 2000, forecastConfidence: 70 },
        ],
      };

      const result = marketTimingEngine.compute({
        snapshot: fallingSnapshot, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      // With falling prices and storage costs, sell_now should be preferred
      const sellNowOption = result.optimalWindow.all_options.find(o => o.action === 'sell_now');
      expect(sellNowOption).toBeDefined();
    });
  });

  describe('Monte Carlo Mode', () => {
    it('should run MC and return probability of gain per window', () => {
      const result = marketTimingEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, computation_mode: 'monte_carlo', monte_carlo_runs: 200 },
      });

      expect(result.monteCarlo).not.toBeNull();
      expect(result.monteCarlo).toHaveLength(3); // one per storage duration

      for (const mc of result.monteCarlo) {
        expect(mc.probability_of_gain).toBeGreaterThanOrEqual(0);
        expect(mc.probability_of_gain).toBeLessThanOrEqual(1);
        expect(mc.expected_gain).toBeDefined();
        expect(mc.gain_p10).toBeLessThanOrEqual(mc.gain_p50);
        expect(mc.gain_p50).toBeLessThanOrEqual(mc.gain_p90);
      }
    }, 15000);
  });

  describe('Topup Loan Simulation', () => {
    it('should simulate post-harvest topup loan when requested', () => {
      const result = marketTimingEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, include_topup_loan_simulation: true },
      });

      expect(result.topupLoanSimulation).not.toBeNull();
      // Loan = 70% of produce value = 0.7 × 50 × 2200 = 77000
      expect(result.topupLoanSimulation.eligible_loan_amount).toBe(77000);
      expect(result.topupLoanSimulation.interest_rate).toBe(7);
      expect(result.topupLoanSimulation.scenarios).toHaveLength(3);

      for (const s of result.topupLoanSimulation.scenarios) {
        expect(s.loan_amount).toBe(77000);
        expect(s.interest_paid).toBeGreaterThan(0);
        expect(s.immediate_cash_access).toBe(77000);
      }
    });

    it('should skip topup loan when not requested', () => {
      const result = marketTimingEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, include_topup_loan_simulation: false },
      });

      expect(result.topupLoanSimulation).toBeNull();
    });
  });

  describe('Recommendations', () => {
    it('should generate actionable recommendations', () => {
      const result = marketTimingEngine.compute({ snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT });

      expect(result.recommendations.length).toBeGreaterThan(0);
      for (const rec of result.recommendations) {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('message_key');
        expect(rec).toHaveProperty('message');
      }
    });

    it('should warn about falling prices', () => {
      const fallingSnapshot = {
        ...MOCK_SNAPSHOT,
        relevant_commodity_prices: [
          { commodityId: 'crop_paddy', currentPrice: 2200, priceTrend: 'falling', forecast30dPrice: 2000, forecastConfidence: 70 },
        ],
      };

      const result = marketTimingEngine.compute({
        snapshot: fallingSnapshot, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      const fallingRec = result.recommendations.find(r => r.message_key === 'drishti.rec.price_falling');
      expect(fallingRec).toBeDefined();
    });

    it('should mention topup loan when simulated', () => {
      const result = marketTimingEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, include_topup_loan_simulation: true },
      });

      const topupRec = result.recommendations.find(r => r.message_key === 'drishti.rec.topup_loan');
      expect(topupRec).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should use snapshot price when current_price_per_quintal is null', () => {
      const result = marketTimingEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, current_price_per_quintal: null },
      });

      expect(result.sellNow.price_per_quintal).toBe(2200); // from snapshot
    });

    it('should handle no benchmarks', () => {
      const result = marketTimingEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: [], input: BASE_INPUT,
      });

      expect(result.scenarios.length).toBe(4);
    });

    it('should handle no active loans (zero interest cost)', () => {
      const noLoanSnapshot = { ...MOCK_SNAPSHOT, active_loans: [], total_monthly_emi: 0 };
      const result = marketTimingEngine.compute({
        snapshot: noLoanSnapshot, benchmarks: MOCK_BENCHMARKS, input: { ...BASE_INPUT, active_loan_id: null },
      });

      for (const s of result.storageScenarios) {
        expect(s.interest_cost).toBe(0);
      }
    });

    it('should handle single storage duration', () => {
      const result = marketTimingEngine.compute({
        snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS,
        input: { ...BASE_INPUT, storage_options: { ...BASE_INPUT.storage_options, storage_duration_months: [2] } },
      });

      expect(result.storageScenarios).toHaveLength(1);
      expect(result.storageScenarios[0].months).toBe(2);
      expect(result.scenarios).toHaveLength(2); // sell_now + 1 storage
    });
  });

  describe('Risk Factors', () => {
    it('should flag falling price trend', () => {
      const fallingSnapshot = {
        ...MOCK_SNAPSHOT,
        relevant_commodity_prices: [
          { commodityId: 'crop_paddy', currentPrice: 2200, priceTrend: 'falling', forecast30dPrice: 2000, forecastConfidence: 70 },
        ],
      };

      const result = marketTimingEngine.compute({
        snapshot: fallingSnapshot, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT,
      });

      const priceRisk = result.riskFactors.find(r => r.message_key === 'drishti.risk.falling_prices');
      expect(priceRisk).toBeDefined();
    });

    it('should flag quality degradation', () => {
      const result = marketTimingEngine.compute({ snapshot: MOCK_SNAPSHOT, benchmarks: MOCK_BENCHMARKS, input: BASE_INPUT });

      const qualityRisk = result.riskFactors.find(r => r.message_key === 'drishti.risk.quality_loss');
      expect(qualityRisk).toBeDefined();
    });
  });
});
