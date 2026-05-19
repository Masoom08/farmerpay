/**
 * Financial Health Scorer — Unit Tests (~15 tests)
 */

const { computeFinancialHealthScore } = require('../../../src/modules/aa/services/analyzers/financialHealthScorer');
const { kharifFarmer, dairyFarmer, mixedFarmer, stressedFarmer } = require('../helpers/mockTransactions');

// Mock bank summary with known values
const goodSummary = {
  avg_monthly_balance: 50000,
  min_balance: 10000,
  bounce_count: 0,
  emi_debit_count: 4,
  period_months: 12,
  govt_subsidy_credits: 5,
  upi_transaction_count: 30,
  avg_upi_value: 2000,
};

const poorSummary = {
  avg_monthly_balance: 2000,
  min_balance: 0,
  bounce_count: 5,
  emi_debit_count: 7,
  period_months: 12,
  govt_subsidy_credits: 1,
  upi_transaction_count: 2,
  avg_upi_value: 500,
};

describe('financialHealthScorer', () => {
  // ─── Score Structure ────────────────────────────────────────

  describe('output structure', () => {
    it('should return score, grade, and 6 components', () => {
      const result = computeFinancialHealthScore(kharifFarmer, goodSummary);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'E']).toContain(result.grade);
      expect(result.components.cashFlowStability).toBeDefined();
      expect(result.components.balanceAdequacy).toBeDefined();
      expect(result.components.incomeDiversity).toBeDefined();
      expect(result.components.debtDiscipline).toBeDefined();
      expect(result.components.govtTransferAccess).toBeDefined();
      expect(result.components.digitalAdoption).toBeDefined();
    });

    it('should include seasonality insights', () => {
      const result = computeFinancialHealthScore(kharifFarmer, goodSummary);
      expect(result.seasonality).toBeDefined();
    });

    it('should include module-specific outputs', () => {
      const result = computeFinancialHealthScore(kharifFarmer, goodSummary);
      expect(result.drishtiInputs).toBeDefined();
      expect(result.trustInputs).toBeDefined();
      expect(result.sentinelInputs).toBeDefined();
    });
  });

  // ─── Grade Boundaries ──────────────────────────────────────

  describe('grade boundaries', () => {
    it('should grade dairy farmer with good summary as B or higher', () => {
      const result = computeFinancialHealthScore(dairyFarmer, goodSummary);
      expect(['A', 'B']).toContain(result.grade);
      expect(result.score).toBeGreaterThanOrEqual(65);
    });

    it('should grade stressed farmer with poor summary as D or E', () => {
      const result = computeFinancialHealthScore(stressedFarmer, poorSummary);
      expect(['D', 'E']).toContain(result.grade);
      expect(result.score).toBeLessThan(50);
    });

    it('should grade mixed farmer in C-B range', () => {
      const result = computeFinancialHealthScore(mixedFarmer, goodSummary);
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThanOrEqual(85);
    });
  });

  // ─── Component Scoring ──────────────────────────────────────

  describe('component scoring', () => {
    it('cashFlowStability should be higher for dairy (regular) than kharif (seasonal)', () => {
      const dairy = computeFinancialHealthScore(dairyFarmer, goodSummary);
      const kharif = computeFinancialHealthScore(kharifFarmer, goodSummary);
      expect(dairy.components.cashFlowStability.score).toBeGreaterThan(
        kharif.components.cashFlowStability.score
      );
    });

    it('debtDiscipline should be high with 0 bounces', () => {
      const result = computeFinancialHealthScore(dairyFarmer, goodSummary);
      expect(result.components.debtDiscipline.score).toBeGreaterThanOrEqual(90);
    });

    it('debtDiscipline should be low with 5 bounces', () => {
      const result = computeFinancialHealthScore(stressedFarmer, poorSummary);
      // 100 - (5 * 15) = 25
      expect(result.components.debtDiscipline.score).toBeLessThanOrEqual(30);
    });

    it('govtTransferAccess should detect schemes from narrations', () => {
      const result = computeFinancialHealthScore(kharifFarmer, goodSummary);
      expect(result.components.govtTransferAccess.details.schemesDetected).toBeDefined();
      const schemes = result.components.govtTransferAccess.details.schemesDetected;
      expect(schemes.length).toBeGreaterThan(0);
    });

    it('incomeDiversity should be higher for mixed farmer than single-source', () => {
      const mixed = computeFinancialHealthScore(mixedFarmer, goodSummary);
      const dairy = computeFinancialHealthScore(dairyFarmer, goodSummary);
      expect(mixed.components.incomeDiversity.score).toBeGreaterThan(
        dairy.components.incomeDiversity.score
      );
    });

    it('digitalAdoption should reflect UPI transaction count', () => {
      const result = computeFinancialHealthScore(kharifFarmer, goodSummary);
      expect(result.components.digitalAdoption.score).toBeGreaterThan(20);
    });
  });

  // ─── Module Outputs ─────────────────────────────────────────

  describe('module-specific outputs', () => {
    it('trustInputs should include financialHealthScore and bounceRate', () => {
      const result = computeFinancialHealthScore(kharifFarmer, goodSummary);
      expect(typeof result.trustInputs.financialHealthScore).toBe('number');
      expect(typeof result.trustInputs.bounceRate).toBe('number');
    });

    it('sentinelInputs should include cashFlowScore and emiSafeMonths', () => {
      const result = computeFinancialHealthScore(kharifFarmer, goodSummary);
      expect(typeof result.sentinelInputs.cashFlowScore).toBe('number');
      expect(Array.isArray(result.sentinelInputs.emiSafeMonths)).toBe(true);
    });

    it('drishtiInputs should include seasonPattern', () => {
      const result = computeFinancialHealthScore(kharifFarmer, goodSummary);
      expect(result.drishtiInputs.seasonPattern).toBeDefined();
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle empty transactions with default summary', () => {
      const result = computeFinancialHealthScore([], {});
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.grade).toBeDefined();
    });

    it('should handle transactions with no summary', () => {
      const result = computeFinancialHealthScore(kharifFarmer);
      expect(typeof result.score).toBe('number');
      expect(result.grade).toBeDefined();
    });
  });
});
