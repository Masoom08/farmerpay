/**
 * DRISHTI Phase 2 — Household Income/Expense Services + Computation Primitives
 *
 * Tests:
 *  1. Household Income Projector — seasonal, reliability, overrides, growth
 *  2. Household Expense Projector — inflation, seasonal spikes, overrides
 *  3. Resilience Calculator — diversification, survival, SPOF, stress scenarios
 *  4. normalizeToMonthly helper
 */

// ─── Shared Mock Snapshot ───────────────────────────────────────────

const MOCK_SNAPSHOT = {
  farmer_id: 1,
  household_income_details: {
    income_streams: [
      { source: 'spouse_shg', label: 'Wife SHG - Jai Bhavani', earning_member: 'spouse', amount_monthly: 3500, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'wage_labor', label: 'Construction labor', earning_member: 'farmer', amount_monthly: 6000, frequency: 'seasonal', reliability: 'irregular', active_months: [1,2,3,4,5,11,12] },
      { source: 'mgnrega', label: 'MGNREGA', earning_member: 'farmer', amount_monthly: 2225, frequency: 'seasonal', reliability: 'regular', active_months: [4,5,6,10,11] },
      { source: 'pension', label: 'Old Age Pension', earning_member: 'family', amount_monthly: 1000, frequency: 'monthly', reliability: 'guaranteed', active_months: null },
      { source: 'remittance', label: 'Son in Pune', earning_member: 'family', amount_monthly: 5000, frequency: 'monthly', reliability: 'regular', active_months: null },
      { source: 'petty_business', label: 'Kirana shop', earning_member: 'spouse', amount_monthly: 4000, frequency: 'daily', reliability: 'regular', active_months: null },
      { source: 'govt_transfer', label: 'PM-KISAN', earning_member: 'farmer', amount_monthly: 500, frequency: 'quarterly', reliability: 'guaranteed', active_months: [4,8,12] },
      { source: 'rental', label: 'Land lease 0.5 acre', earning_member: 'farmer', amount_monthly: 1000, frequency: 'annual', reliability: 'regular', active_months: [4] },
    ],
    total_monthly_non_farm: 23225,
  },
  total_non_farm_monthly: 23225,
  non_farm_income_streams: 8,
  spouse_shg_monthly: 3500,
  wage_labor_monthly: 6000,
  mgnrega_annual: 26700,
  pension_monthly: 1000,
  remittance_monthly: 5000,
  petty_business_monthly: 4000,
  govt_transfers_annual: 6000,
  rental_income_monthly: 1000,

  household_expense_details: {
    expense_categories: [
      { category: 'food_groceries', label: 'Food & groceries', monthly: 6000, peak_months: null, peak_amount: 0 },
      { category: 'education', label: 'Education', monthly: 2500, peak_months: [6], peak_amount: 15000 },
      { category: 'healthcare', label: 'Healthcare', monthly: 1000, peak_months: null, peak_amount: 0 },
      { category: 'housing', label: 'Housing', monthly: 0, peak_months: null, peak_amount: 0 },
      { category: 'social_obligations', label: 'Festivals & ceremonies', monthly: 1667, peak_months: null, peak_amount: 0 },
      { category: 'transportation', label: 'Transport', monthly: 800, peak_months: null, peak_amount: 0 },
      { category: 'utilities', label: 'Electricity/phone/gas', monthly: 1200, peak_months: null, peak_amount: 0 },
      { category: 'non_farm_loan_emi', label: 'Gold loan EMI', monthly: 2000, peak_months: null, peak_amount: 0 },
    ],
    total_monthly_expense: 15167,
  },
  total_household_expense_monthly: 15167,

  total_outstanding: 85000,
  total_monthly_emi: 8650,
  active_insurance: [{ type: 'pmfby_crop', sumInsured: 100000 }],
  active_crop_cycles: [{ cropId: 'paddy', season: 'kharif' }],
  active_dairy_profile: { animalCount: 3 },
  active_fishery_profile: null,
  relevant_commodity_prices: [{ commodityId: 'paddy', currentPrice: 22, priceTrend: 'stable', forecastConfidence: 60 }],
  weather_outlook: { rainfallMm24h: 0 },
};

// ═════════════════════════════════════════════════════════════════════
// 1. HOUSEHOLD INCOME PROJECTOR
// ═════════════════════════════════════════════════════════════════════

describe('Household Income Projector', () => {
  const { projectHouseholdIncome, projectSingleSource, RELIABILITY_FACTORS } = require('../../src/modules/drishti/services/computation/householdIncomeProjector');

  it('should project 12-month income timeline from snapshot', () => {
    const result = projectHouseholdIncome({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

    expect(result.timeline).toHaveLength(12);
    expect(result.summary).toBeDefined();
    expect(result.bySource).toBeDefined();

    // Should have entries for all active sources
    expect(Object.keys(result.bySource).length).toBeGreaterThanOrEqual(5);
    expect(result.summary.streamCount).toBe(8);
  });

  it('should respect active_months for seasonal income', () => {
    const result = projectHouseholdIncome({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

    // Wage labor is active only in months [1,2,3,4,5,11,12]
    const wageLaborMonthly = result.bySource.wage_labor?.monthly || [];
    // Some months should be 0 (months 6-10 are inactive: Jun-Oct)
    const hasZeroMonths = wageLaborMonthly.some(m => m === 0);
    const hasNonZeroMonths = wageLaborMonthly.some(m => m > 0);
    expect(hasZeroMonths).toBe(true);
    expect(hasNonZeroMonths).toBe(true);
  });

  it('should discount irregular income by reliability factor', () => {
    // Wage labor (irregular) should be discounted by 0.70
    const result = projectHouseholdIncome({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

    // In active months, wage labor should be 6000 * 0.70 = 4200
    const wageMonthly = result.bySource.wage_labor?.monthly || [];
    const activeMonthValue = wageMonthly.find(m => m > 0);
    expect(activeMonthValue).toBe(4200); // 6000 * 0.70
  });

  it('should not discount guaranteed income', () => {
    const result = projectHouseholdIncome({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

    // Pension (guaranteed) should be full 1000 every month
    const pensionMonthly = result.bySource.pension?.monthly || [];
    const activeValues = pensionMonthly.filter(m => m > 0);
    expect(activeValues.length).toBe(12); // active every month
    expect(activeValues[0]).toBe(1000); // full amount
  });

  it('should apply overrides to existing sources', () => {
    const result = projectHouseholdIncome({
      snapshot: MOCK_SNAPSHOT,
      horizonMonths: 12,
      overrides: [
        { source_type: 'spouse_shg', amount_monthly: 5000 }, // increased from 3500
      ],
    });

    // SHG should now be based on 5000 (× 0.95 reliability)
    const shgMonthly = result.bySource.spouse_shg?.monthly || [];
    const firstValue = shgMonthly[0];
    expect(firstValue).toBe(4750); // 5000 * 0.95
  });

  it('should add new sources via additionalSources', () => {
    const result = projectHouseholdIncome({
      snapshot: MOCK_SNAPSHOT,
      horizonMonths: 12,
      additionalSources: [
        { source_type: 'other', label: 'New side gig', amount_monthly: 2000, reliability: 'regular' },
      ],
    });

    expect(result.bySource.other).toBeDefined();
    expect(result.bySource.other.annual).toBeGreaterThan(0);
  });

  it('should apply petty_business seasonal dip in monsoon', () => {
    const result = projectHouseholdIncome({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

    const bizMonthly = result.bySource.petty_business?.monthly || [];
    // Find July (monsoon) — should be lower than January
    // The exact months depend on startMonth, so just verify variance exists
    const min = Math.min(...bizMonthly.filter(v => v > 0));
    const max = Math.max(...bizMonthly);
    expect(min).toBeLessThan(max); // seasonal variation exists
  });

  it('should project a single source independently', () => {
    const result = projectSingleSource({
      source: 'mgnrega',
      amountMonthly: 2225,
      frequency: 'seasonal',
      reliability: 'regular',
      activeMonths: [4, 5, 6, 10, 11],
      horizonMonths: 12,
    });

    expect(result.monthly).toHaveLength(12);
    // Only 5 months should have income
    const activeCount = result.monthly.filter(m => m > 0).length;
    expect(activeCount).toBe(5);
    expect(result.annual).toBeGreaterThan(0);
  });

  it('should apply growth for multi-year horizons', () => {
    const noGrowth = projectHouseholdIncome({ snapshot: MOCK_SNAPSHOT, horizonMonths: 24, applyGrowth: false });
    const withGrowth = projectHouseholdIncome({ snapshot: MOCK_SNAPSHOT, horizonMonths: 24, applyGrowth: true });

    // Year 2 total should be higher with growth
    const y2NoGrowth = noGrowth.timeline.slice(12).reduce((s, m) => s + m.total, 0);
    const y2WithGrowth = withGrowth.timeline.slice(12).reduce((s, m) => s + m.total, 0);
    expect(y2WithGrowth).toBeGreaterThan(y2NoGrowth);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. HOUSEHOLD EXPENSE PROJECTOR
// ═════════════════════════════════════════════════════════════════════

describe('Household Expense Projector', () => {
  const { projectHouseholdExpenses, estimateExpenseFloor, SOCIAL_SPIKE_MONTHS } = require('../../src/modules/drishti/services/computation/householdExpenseProjector');

  it('should project 12-month expense timeline', () => {
    const result = projectHouseholdExpenses({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

    expect(result.timeline).toHaveLength(12);
    expect(result.summary).toBeDefined();
    expect(result.byCategory).toBeDefined();
    expect(result.summary.avgMonthly).toBeGreaterThan(0);
    expect(result.summary.categoryCount).toBeGreaterThan(0);
  });

  it('should apply education peak month spike', () => {
    const result = projectHouseholdExpenses({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

    // Education has peak_months: [6] with peak_amount: 15000
    const eduMonthly = result.byCategory.education?.monthly || [];
    // Find the month where peak hits (calendar month 6 = June)
    const maxEdu = Math.max(...eduMonthly);
    const minEdu = Math.min(...eduMonthly.filter(v => v > 0));
    // Peak month should be significantly higher (base 2500 + 15000 = 17500)
    expect(maxEdu).toBeGreaterThan(minEdu * 2);
  });

  it('should apply social obligations Diwali spike', () => {
    const result = projectHouseholdExpenses({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

    const socialMonthly = result.byCategory.social_obligations?.monthly || [];
    // Diwali month (Nov = calendar month 11) should have 2.5× spike
    const maxSocial = Math.max(...socialMonthly);
    const minSocial = Math.min(...socialMonthly.filter(v => v > 0));
    expect(maxSocial).toBeGreaterThan(minSocial); // seasonal variation
  });

  it('should apply utilities summer spike', () => {
    const result = projectHouseholdExpenses({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

    const utilMonthly = result.byCategory.utilities?.monthly || [];
    const max = Math.max(...utilMonthly);
    const min = Math.min(...utilMonthly.filter(v => v > 0));
    expect(max).toBeGreaterThan(min); // summer spike
  });

  it('should apply overrides to categories', () => {
    const result = projectHouseholdExpenses({
      snapshot: MOCK_SNAPSHOT,
      horizonMonths: 12,
      overrides: [
        { category: 'education', amount_monthly: 5000 }, // increased from 2500
      ],
    });

    // Education base should now be 5000 (not 2500) in non-peak months
    const eduMonthly = result.byCategory.education?.monthly || [];
    const nonPeakValues = eduMonthly.filter(v => v > 0 && v < 10000);
    expect(nonPeakValues[0]).toBe(5000);
  });

  it('should apply inflation for multi-year projection', () => {
    const noInflation = projectHouseholdExpenses({ snapshot: MOCK_SNAPSHOT, horizonMonths: 24, applyInflation: false });
    const withInflation = projectHouseholdExpenses({ snapshot: MOCK_SNAPSHOT, horizonMonths: 24, applyInflation: true });

    const y2NoInflation = noInflation.timeline.slice(12).reduce((s, m) => s + m.total, 0);
    const y2WithInflation = withInflation.timeline.slice(12).reduce((s, m) => s + m.total, 0);
    expect(y2WithInflation).toBeGreaterThan(y2NoInflation);
  });

  it('should calculate peak and trough months', () => {
    const result = projectHouseholdExpenses({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

    expect(result.summary.peakMonthExpense).toBeGreaterThan(0);
    expect(result.summary.peakMonth).toBeGreaterThanOrEqual(1);
    expect(result.summary.peakMonth).toBeLessThanOrEqual(12);
    expect(result.summary.seasonalVariationPct).toBeGreaterThan(0);
  });

  it('should estimate expense floor (essential minimum)', () => {
    const floor = estimateExpenseFloor(MOCK_SNAPSHOT);

    // Floor = food(6000) + healthcare(1000) + utilities(1200) + non_farm_emi(2000) = 10200
    expect(floor).toBe(10200);
  });

  it('should handle empty expense details gracefully via summary columns', () => {
    const fallbackSnapshot = {
      ...MOCK_SNAPSHOT,
      household_expense_details: null,
      // Set individual summary columns for fallback path
      food_groceries_monthly: 6000,
      education_monthly: 2500,
      healthcare_monthly: 1000,
      utilities_monthly: 1200,
      transportation_monthly: 800,
      non_farm_loan_emi_monthly: 2000,
    };
    const result = projectHouseholdExpenses({ snapshot: fallbackSnapshot, horizonMonths: 12 });

    expect(result.timeline).toHaveLength(12);
    expect(result.summary.avgMonthly).toBeGreaterThan(0);
    expect(result.summary.categoryCount).toBeGreaterThanOrEqual(4);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. RESILIENCE CALCULATOR
// ═════════════════════════════════════════════════════════════════════

describe('Resilience Calculator', () => {
  const { calculateResilience, computeDiversificationIndex, computeSurvivalMonths, identifySinglePointOfFailure, classifyResilience } = require('../../src/modules/drishti/services/computation/resilienceCalculator');
  const { projectHouseholdIncome } = require('../../src/modules/drishti/services/computation/householdIncomeProjector');
  const { projectHouseholdExpenses } = require('../../src/modules/drishti/services/computation/householdExpenseProjector');

  const incomeProjection = projectHouseholdIncome({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });
  const expenseProjection = projectHouseholdExpenses({ snapshot: MOCK_SNAPSHOT, horizonMonths: 12 });

  describe('Full Resilience Calculation', () => {
    it('should compute resilience score between 0 and 100', () => {
      const result = calculateResilience({
        snapshot: MOCK_SNAPSHOT,
        incomeProjection,
        expenseProjection,
        cashFlowSummary: { totalInflows: 520000, totalOutflows: 414000, netSurplus: 106000, horizonMonths: 12 },
        totalFarmIncomeAnnual: 250000,
        totalNonFarmIncomeAnnual: 270000,
        totalExpenseAnnual: 414000,
        savingsEstimate: 20000,
      });

      expect(result.resilienceScore).toBeGreaterThanOrEqual(0);
      expect(result.resilienceScore).toBeLessThanOrEqual(100);
      expect(result.resilienceRating).toBeDefined();
      expect(['fragile', 'vulnerable', 'moderate', 'resilient', 'very_resilient']).toContain(result.resilienceRating);
    });

    it('should return all required metrics', () => {
      const result = calculateResilience({
        snapshot: MOCK_SNAPSHOT,
        incomeProjection,
        expenseProjection,
        cashFlowSummary: { totalInflows: 520000, totalOutflows: 414000, netSurplus: 106000, horizonMonths: 12 },
        totalFarmIncomeAnnual: 250000,
        totalNonFarmIncomeAnnual: 270000,
        totalExpenseAnnual: 414000,
      });

      expect(result.metrics.monthsSurvivableWithoutFarmIncome).toBeDefined();
      expect(result.metrics.incomeDiversificationIndex).toBeDefined();
      expect(result.metrics.incomeDiversificationRating).toBeDefined();
      expect(result.metrics.singlePointOfFailure).toBeDefined();
      expect(result.metrics.highestRiskIncomeLoss).toBeDefined();
      expect(result.metrics.nonFarmCoversHouseholdExpensesPct).toBeDefined();
    });

    it('should generate stress scenarios', () => {
      const result = calculateResilience({
        snapshot: MOCK_SNAPSHOT,
        incomeProjection,
        expenseProjection,
        cashFlowSummary: { totalInflows: 520000, totalOutflows: 414000, netSurplus: 106000, horizonMonths: 12 },
        totalFarmIncomeAnnual: 250000,
        totalNonFarmIncomeAnnual: 270000,
        totalExpenseAnnual: 414000,
      });

      expect(result.stressScenarios.length).toBeGreaterThanOrEqual(2);
      const cropFailure = result.stressScenarios.find(s => s.label === 'crop_failure');
      expect(cropFailure).toBeDefined();
      expect(cropFailure.income_change).toBeLessThan(0);
      expect(cropFailure.projected_health_status).toBeDefined();
    });

    it('should generate recommendations', () => {
      const result = calculateResilience({
        snapshot: MOCK_SNAPSHOT,
        incomeProjection,
        expenseProjection,
        cashFlowSummary: { totalInflows: 520000, totalOutflows: 414000, netSurplus: 106000, horizonMonths: 12 },
        totalFarmIncomeAnnual: 250000,
        totalNonFarmIncomeAnnual: 270000,
        totalExpenseAnnual: 414000,
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toHaveProperty('type');
      expect(result.recommendations[0]).toHaveProperty('message');
    });
  });

  describe('Diversification Index', () => {
    it('should return high index for well-diversified income', () => {
      const result = computeDiversificationIndex(incomeProjection, 250000);

      // With 8 non-farm streams + farm = 9 total, should be well diversified
      expect(result.index).toBeGreaterThan(0.5);
      expect(result.streamCount).toBeGreaterThanOrEqual(5);
    });

    it('should return low index for single-source income', () => {
      const singleSource = { bySource: { farm_only: { annual: 100000 } } };
      const result = computeDiversificationIndex(singleSource, 400000);

      // Farm = 400k, single non-farm = 100k → concentrated
      expect(result.index).toBeLessThan(0.5);
    });

    it('should return 0 for no income', () => {
      const result = computeDiversificationIndex({ bySource: {} }, 0);
      expect(result.index).toBe(0);
    });

    it('should compute correct HHI for equal shares', () => {
      // 4 equal sources of 25k each → HHI = 4 × (0.25)² = 0.25, diversification = 0.75
      const equalSources = {
        bySource: {
          a: { annual: 25000 },
          b: { annual: 25000 },
          c: { annual: 25000 },
        },
      };
      const result = computeDiversificationIndex(equalSources, 25000); // farm = 25k too
      expect(result.hhi).toBeCloseTo(0.25, 1);
      expect(result.index).toBeCloseTo(0.75, 1);
    });
  });

  describe('Survival Months', () => {
    it('should calculate months survivable with non-farm income', () => {
      const result = computeSurvivalMonths(270000, 414000, 250000, 20000);

      expect(result.months).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should cap at 12 when non-farm covers everything', () => {
      const result = computeSurvivalMonths(500000, 200000, 100000, 0);
      expect(result.months).toBe(12);
      expect(result.score).toBe(90);
    });

    it('should return 0 when no non-farm income and no savings', () => {
      const result = computeSurvivalMonths(0, 200000, 200000, 0);
      expect(result.months).toBe(0);
      expect(result.score).toBe(5);
    });
  });

  describe('Single Point of Failure', () => {
    it('should detect SPOF when one source is dominant', () => {
      const concentrated = {
        bySource: { remittance: { annual: 10000 } },
      };
      // Farm income is 90% of total
      const result = identifySinglePointOfFailure(concentrated, 300000, 310000, 280000);

      expect(result.hasSPOF).toBe(true);
      expect(result.highestRisk).toBe('farm_income');
    });

    it('should not flag SPOF for diversified income', () => {
      const diversified = {
        bySource: {
          a: { annual: 80000 },
          b: { annual: 80000 },
          c: { annual: 80000 },
        },
      };
      // Farm = 80k, non-farm a+b+c = 240k, total = 320k, expense = 200k
      const result = identifySinglePointOfFailure(diversified, 80000, 320000, 200000);

      // Losing any one source: remaining ≥ 240k > 200k expense → no SPOF
      expect(result.hasSPOF).toBe(false);
    });

    it('should list all failure scenarios with shortfall', () => {
      const result = identifySinglePointOfFailure(incomeProjection, 250000, 520000, 414000);

      expect(result.failures.length).toBeGreaterThan(0);
      expect(result.failures[0]).toHaveProperty('source');
      expect(result.failures[0]).toHaveProperty('canSurvive');
      expect(result.failures[0]).toHaveProperty('shortfall');
    });
  });

  describe('Classification', () => {
    it('should classify resilience ratings correctly', () => {
      expect(classifyResilience(90)).toBe('very_resilient');
      expect(classifyResilience(70)).toBe('resilient');
      expect(classifyResilience(55)).toBe('moderate');
      expect(classifyResilience(30)).toBe('vulnerable');
      expect(classifyResilience(10)).toBe('fragile');
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. NORMALIZE TO MONTHLY
// ═════════════════════════════════════════════════════════════════════

describe('Household Service — normalizeToMonthly', () => {
  const { normalizeToMonthly } = require('../../src/modules/drishti/services/householdService');

  it('should normalize daily to monthly (×30)', () => {
    expect(normalizeToMonthly(100, 'daily')).toBe(3000);
  });

  it('should normalize weekly to monthly (×4.33)', () => {
    expect(normalizeToMonthly(1000, 'weekly')).toBe(4330);
  });

  it('should pass through monthly as-is', () => {
    expect(normalizeToMonthly(5000, 'monthly')).toBe(5000);
  });

  it('should normalize quarterly to monthly (÷3)', () => {
    expect(normalizeToMonthly(6000, 'quarterly')).toBe(2000);
  });

  it('should normalize annual to monthly (÷12)', () => {
    expect(normalizeToMonthly(12000, 'annual')).toBe(1000);
  });

  it('should normalize seasonal to monthly (÷4)', () => {
    expect(normalizeToMonthly(20000, 'seasonal')).toBe(5000);
  });

  it('should handle irregular as annual (÷12)', () => {
    expect(normalizeToMonthly(12000, 'irregular')).toBe(1000);
  });

  it('should handle zero and null gracefully', () => {
    expect(normalizeToMonthly(0, 'monthly')).toBe(0);
    expect(normalizeToMonthly(null, 'monthly')).toBe(0);
  });
});
