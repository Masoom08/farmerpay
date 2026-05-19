/**
 * Cash Flow Projector
 *
 * Builds a month-by-month cash flow timeline combining:
 *  - Farm revenues  (crop, dairy, fishery)
 *  - Farm costs     (crop inputs, dairy feed, fishery inputs)
 *  - Loan EMIs      (from snapshot active_loans)
 *  - Household non-farm income (from snapshot household_income_details)
 *  - Household expenses (from snapshot household_expense_details)
 *
 * Pure function — no DB access. Works entirely on pre-computed arrays
 * and snapshot data.
 *
 * Output format matches the design doc's monthly_cashflow JSON structure.
 */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Build a month-by-month cash flow projection.
 *
 * @param {object} params
 * @param {object} params.snapshot             - DrishtiFarmerSnapshot
 * @param {number} params.horizonMonths        - Projection window (default 12)
 * @param {object} params.farmRevenue          - { crop: number[12], dairy: number[12], fishery: number[12] }
 * @param {object} params.farmCosts            - { crop: number[12], dairy: number[12], fishery: number[12] }
 * @param {object} [params.incomeOverrides]    - Override household income by source_type
 * @param {object} [params.expenseOverrides]   - Override household expense by category
 * @returns {{ monthly: Array, summary: object }}
 */
const projectCashFlow = ({
  snapshot,
  horizonMonths = 12,
  farmRevenue = {},
  farmCosts = {},
  incomeOverrides = null,
  expenseOverrides = null,
}) => {
  const now = new Date();
  const startMonth = now.getMonth(); // 0-indexed
  const startYear = now.getFullYear();

  // Build household income timeline (non-farm)
  const householdIncome = buildHouseholdIncomeTimeline(snapshot, horizonMonths, startMonth, incomeOverrides);

  // Build household expense timeline
  const householdExpense = buildHouseholdExpenseTimeline(snapshot, horizonMonths, startMonth, expenseOverrides);

  // Build EMI timeline from active loans
  const emiTimeline = buildEmiTimeline(snapshot, horizonMonths, startMonth, startYear);

  // Assemble month-by-month
  const monthly = [];
  let cumulative = 0;
  let surplusMonths = 0;
  let deficitMonths = 0;
  let maxDeficit = 0;
  const deficitPeriod = [];

  for (let i = 0; i < horizonMonths; i++) {
    const monthIdx = (startMonth + i) % 12;
    const year = startYear + Math.floor((startMonth + i) / 12);
    const monthLabel = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

    // Farm inflows
    const cropRev = safeGet(farmRevenue.crop, monthIdx);
    const dairyRev = safeGet(farmRevenue.dairy, monthIdx);
    const fishRev = safeGet(farmRevenue.fishery, monthIdx);
    const farmInflowTotal = cropRev + dairyRev + fishRev;

    // Non-farm inflows (from household income)
    const nonFarmInflow = householdIncome[i] || {};
    const nonFarmTotal = nonFarmInflow.total || 0;

    const totalInflow = farmInflowTotal + nonFarmTotal;

    // Farm outflows
    const cropCost = safeGet(farmCosts.crop, monthIdx);
    const dairyCost = safeGet(farmCosts.dairy, monthIdx);
    const fishCost = safeGet(farmCosts.fishery, monthIdx);
    const farmOutflowTotal = cropCost + dairyCost + fishCost;

    // Household outflows
    const houseExp = householdExpense[i] || {};
    const householdTotal = houseExp.total || 0;

    // EMI outflows
    const emiTotal = emiTimeline[i] || 0;

    const totalOutflow = farmOutflowTotal + householdTotal + emiTotal;
    const net = round2(totalInflow - totalOutflow);
    cumulative = round2(cumulative + net);

    if (net >= 0) {
      surplusMonths++;
    } else {
      deficitMonths++;
      deficitPeriod.push(monthLabel);
      if (net < maxDeficit) maxDeficit = net;
    }

    monthly.push({
      month: monthLabel,
      monthName: MONTH_LABELS[monthIdx],
      inflows: {
        farm: {
          crop: cropRev,
          dairy: dairyRev,
          fishery: fishRev,
          subtotal: round2(farmInflowTotal),
        },
        non_farm: {
          ...nonFarmInflow,
          subtotal: round2(nonFarmTotal),
        },
        total: round2(totalInflow),
      },
      outflows: {
        farm: {
          crop_inputs: cropCost,
          dairy_feed: dairyCost,
          fishery_inputs: fishCost,
          subtotal: round2(farmOutflowTotal),
        },
        household: {
          ...houseExp,
          subtotal: round2(householdTotal),
        },
        loans: {
          emi: emiTotal,
          subtotal: emiTotal,
        },
        total: round2(totalOutflow),
      },
      net,
      cumulative,
      is_negative: net < 0,
    });
  }

  // Working capital gap = deepest cumulative deficit
  const cumulativeValues = monthly.map(m => m.cumulative);
  const minCumulative = Math.min(...cumulativeValues, 0);
  const workingCapitalGap = minCumulative < 0 ? Math.abs(minCumulative) : 0;

  // Annual totals
  const totalInflows = monthly.reduce((s, m) => s + m.inflows.total, 0);
  const totalOutflows = monthly.reduce((s, m) => s + m.outflows.total, 0);
  const totalFarmIncome = monthly.reduce((s, m) => s + m.inflows.farm.subtotal, 0);
  const totalNonFarmIncome = monthly.reduce((s, m) => s + m.inflows.non_farm.subtotal, 0);

  return {
    monthly,
    summary: {
      horizonMonths,
      totalInflows: round2(totalInflows),
      totalOutflows: round2(totalOutflows),
      netSurplus: round2(totalInflows - totalOutflows),
      surplusMonths,
      deficitMonths,
      maxMonthlyDeficit: round2(maxDeficit),
      deficitPeriod,
      workingCapitalGap: round2(workingCapitalGap),
      totalFarmIncome: round2(totalFarmIncome),
      totalNonFarmIncome: round2(totalNonFarmIncome),
      farmIncomePct: totalInflows > 0 ? round2((totalFarmIncome / totalInflows) * 100) : 0,
      nonFarmIncomePct: totalInflows > 0 ? round2((totalNonFarmIncome / totalInflows) * 100) : 0,
    },
  };
};

// ─── Household Income Timeline Builder ──────────────────────────────

/**
 * Converts snapshot household_income_details into month-by-month income.
 * Handles seasonality (active_months), frequency, and reliability.
 */
const buildHouseholdIncomeTimeline = (snapshot, horizonMonths, startMonth, overrides) => {
  const timeline = [];
  const incomeDetails = snapshot.household_income_details;

  if (!incomeDetails || !incomeDetails.income_streams) {
    // Fallback: use summary columns as flat monthly values
    const flatMonthly = parseFloat(snapshot.total_non_farm_monthly) || 0;
    for (let i = 0; i < horizonMonths; i++) {
      timeline.push({ other: flatMonthly, total: flatMonthly });
    }
    return timeline;
  }

  let streams = [...incomeDetails.income_streams];

  // Apply overrides if provided
  if (overrides) {
    for (const override of overrides) {
      const idx = streams.findIndex(s => s.source === override.source_type);
      if (idx >= 0) {
        streams[idx] = { ...streams[idx], amount_monthly: override.amount_monthly || streams[idx].amount_monthly };
        if (override.active_months) streams[idx].active_months = override.active_months;
      } else {
        streams.push({
          source: override.source_type,
          amount_monthly: override.amount_monthly || 0,
          frequency: 'monthly',
          reliability: override.reliability || 'regular',
          active_months: override.active_months || null,
        });
      }
    }
  }

  for (let i = 0; i < horizonMonths; i++) {
    const monthIdx = (startMonth + i) % 12;
    const calendarMonth = monthIdx + 1; // 1-indexed
    const monthEntry = {};
    let total = 0;

    for (const stream of streams) {
      const monthlyAmount = parseFloat(stream.amount_monthly) || 0;
      if (monthlyAmount <= 0) continue;

      // Check if this stream is active in this month
      const activeMonths = stream.active_months;
      if (activeMonths && Array.isArray(activeMonths) && activeMonths.length > 0) {
        if (!activeMonths.includes(calendarMonth)) continue;
      }

      // Reliability discount (irregular income gets a haircut for projections)
      let reliabilityFactor = 1.0;
      if (stream.reliability === 'irregular') reliabilityFactor = 0.7;
      if (stream.reliability === 'one_time') reliabilityFactor = 0;

      const amount = round2(monthlyAmount * reliabilityFactor);
      const source = stream.source || 'other';
      monthEntry[source] = (monthEntry[source] || 0) + amount;
      total += amount;
    }

    monthEntry.total = round2(total);
    timeline.push(monthEntry);
  }

  return timeline;
};

// ─── Household Expense Timeline Builder ─────────────────────────────

/**
 * Converts snapshot household_expense_details into month-by-month expenses.
 * Handles seasonal peaks (festivals, school fees).
 */
const buildHouseholdExpenseTimeline = (snapshot, horizonMonths, startMonth, overrides) => {
  const timeline = [];
  const expenseDetails = snapshot.household_expense_details;

  if (!expenseDetails || !expenseDetails.expense_categories) {
    const flatMonthly = parseFloat(snapshot.total_household_expense_monthly) || 0;
    for (let i = 0; i < horizonMonths; i++) {
      timeline.push({ household: flatMonthly, total: flatMonthly });
    }
    return timeline;
  }

  let categories = [...expenseDetails.expense_categories];

  // Apply overrides
  if (overrides) {
    for (const override of overrides) {
      const idx = categories.findIndex(c => c.category === override.category);
      if (idx >= 0) {
        categories[idx] = { ...categories[idx], monthly: override.amount_monthly || categories[idx].monthly };
      } else {
        categories.push({
          category: override.category,
          monthly: override.amount_monthly || 0,
          peak_months: null,
          peak_amount: 0,
        });
      }
    }
  }

  for (let i = 0; i < horizonMonths; i++) {
    const monthIdx = (startMonth + i) % 12;
    const calendarMonth = monthIdx + 1;
    const monthEntry = {};
    let total = 0;

    for (const cat of categories) {
      let amount = parseFloat(cat.monthly) || 0;

      // Add peak-month spike if applicable
      const peakMonths = cat.peak_months;
      if (peakMonths && Array.isArray(peakMonths) && peakMonths.includes(calendarMonth)) {
        amount += parseFloat(cat.peak_amount) || 0;
      }

      if (amount > 0) {
        const key = cat.category || 'other';
        monthEntry[key] = (monthEntry[key] || 0) + round2(amount);
        total += amount;
      }
    }

    monthEntry.total = round2(total);
    timeline.push(monthEntry);
  }

  return timeline;
};

// ─── EMI Timeline Builder ───────────────────────────────────────────

/**
 * Extracts monthly EMI obligations from snapshot active_loans.
 */
const buildEmiTimeline = (snapshot, horizonMonths, startMonth, startYear) => {
  const timeline = new Array(horizonMonths).fill(0);

  const loans = snapshot.active_loans;
  if (!loans || !Array.isArray(loans)) {
    // Fallback: use total_monthly_emi as flat value
    const flatEmi = parseFloat(snapshot.total_monthly_emi) || 0;
    return timeline.map(() => flatEmi);
  }

  // Sum all active loan EMIs (simplified: assume each loan has a constant EMI)
  const totalMonthlyEmi = loans.reduce((sum, loan) => {
    return sum + (parseFloat(loan.emiAmount) || 0);
  }, 0);

  return timeline.map(() => round2(totalMonthlyEmi));
};

// ─── Helpers ────────────────────────────────────────────────────────

const round2 = (n) => Math.round((n || 0) * 100) / 100;
const safeGet = (arr, idx) => (arr && arr[idx]) ? round2(arr[idx]) : 0;

module.exports = {
  projectCashFlow,
  buildHouseholdIncomeTimeline,
  buildHouseholdExpenseTimeline,
  buildEmiTimeline,
};
