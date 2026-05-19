/**
 * Seasonality Mapper — Unit Tests (~15 tests)
 */

const { buildSeasonalityMap } = require('../../../src/modules/aa/services/analyzers/seasonalityMapper');
const { kharifFarmer, dairyFarmer, mixedFarmer, stressedFarmer } = require('../helpers/mockTransactions');

describe('seasonalityMapper', () => {
  // ─── Monthly Map Structure ──────────────────────────────────

  describe('buildSeasonalityMap — structure', () => {
    it('should return a 12-month map', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      expect(Object.keys(result.monthlyMap)).toHaveLength(12);
      expect(result.monthlyMap[1]).toBeDefined();
      expect(result.monthlyMap[12]).toBeDefined();
    });

    it('should include month name in each entry', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      expect(result.monthlyMap[1].monthName).toBe('Jan');
      expect(result.monthlyMap[10].monthName).toBe('Oct');
    });

    it('should return insights object', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      expect(result.insights).toBeDefined();
      expect(result.insights.peakIncomeMonths).toBeDefined();
      expect(result.insights.cashThinMonths).toBeDefined();
      expect(result.insights.seasonPattern).toBeDefined();
      expect(result.insights.recommendedEmiSchedule).toBeDefined();
    });

    it('should return income and expense summaries', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      expect(result.incomeSummary).toBeDefined();
      expect(result.expenseSummary).toBeDefined();
    });
  });

  // ─── Crop Season Detection ──────────────────────────────────

  describe('crop season detection', () => {
    it('should detect kharif_dominant for paddy farmer (Oct-Jan peaks)', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      expect(result.insights.seasonPattern.type).toBe('kharif_dominant');
      expect(result.insights.seasonPattern.confidence).toBeGreaterThan(0.4);
    });

    it('should detect non-kharif pattern for dairy farmer (regular monthly)', () => {
      const result = buildSeasonalityMap(dairyFarmer);
      // Dairy has income in every month but pension in Mar/Sep may create minor seasonal skew
      // Should not be kharif_dominant or rabi_dominant
      expect(result.insights.seasonPattern.type).not.toBe('kharif_dominant');
      expect(result.insights.seasonPattern.type).not.toBe('rabi_dominant');
    });

    it('should handle insufficient data gracefully', () => {
      const result = buildSeasonalityMap([]);
      expect(result.insights.seasonPattern.type).toBe('insufficient_data');
    });
  });

  // ─── Peak & Cash-Thin Months ────────────────────────────────

  describe('peak and cash-thin months', () => {
    it('should identify top 3 peak income months', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      expect(result.insights.peakIncomeMonths).toHaveLength(3);
      // Oct-Dec should be among peaks for kharif farmer
      const peakMonthNums = result.insights.peakIncomeMonths.map(m => m.month);
      expect(peakMonthNums.some(m => [10, 11, 12].includes(m))).toBe(true);
    });

    it('should identify 3 cash-thin months', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      expect(result.insights.cashThinMonths).toHaveLength(3);
    });

    it('should count deficit months', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      expect(typeof result.insights.deficitMonthCount).toBe('number');
      expect(result.insights.deficitMonthCount).toBeGreaterThanOrEqual(0);
      expect(result.insights.deficitMonthCount).toBeLessThanOrEqual(12);
    });
  });

  // ─── Income Regularity (CV) ─────────────────────────────────

  describe('income regularity', () => {
    it('should compute high regularity for dairy farmer (steady income)', () => {
      const result = buildSeasonalityMap(dairyFarmer);
      // Dairy has very regular monthly payments — regularity should be high
      expect(result.insights.incomeRegularity).toBeGreaterThan(0.5);
    });

    it('should compute lower regularity for kharif farmer (seasonal)', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      // Kharif has concentrated income in Oct-Jan
      expect(result.insights.incomeRegularity).toBeLessThan(
        buildSeasonalityMap(dairyFarmer).insights.incomeRegularity
      );
    });

    it('should return 0 for empty transactions', () => {
      const result = buildSeasonalityMap([]);
      expect(result.insights.incomeRegularity).toBe(0);
    });
  });

  // ─── EMI Recommendation ─────────────────────────────────────

  describe('EMI recommendation', () => {
    it('should recommend monthly for dairy farmer with steady income', () => {
      const result = buildSeasonalityMap(dairyFarmer);
      // Dairy income is in every month, so many safe months
      expect(['monthly', 'seasonal_skip']).toContain(result.insights.recommendedEmiSchedule.type);
    });

    it('should recommend seasonal_skip or bullet for highly seasonal farmer', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      expect(['seasonal_skip', 'bullet_or_quarterly']).toContain(result.insights.recommendedEmiSchedule.type);
    });

    it('should include skipMonths for seasonal_skip type', () => {
      const result = buildSeasonalityMap(kharifFarmer);
      if (result.insights.recommendedEmiSchedule.type === 'seasonal_skip') {
        expect(result.insights.recommendedEmiSchedule.skipMonths.length).toBeGreaterThan(0);
      }
    });
  });
});
