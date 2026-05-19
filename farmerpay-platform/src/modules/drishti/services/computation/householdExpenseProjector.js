/**
 * Household Expense Projector
 *
 * Projects household expenses month-by-month with:
 *  - Inflation adjustments per category (food inflation ≠ education inflation)
 *  - Seasonal spikes (Diwali, school fees, wedding season)
 *  - Peak month handling from saved expense profiles
 *  - Override support for "what-if" modeling
 *
 * Pure function — no DB access. Works on snapshot household_expense_details.
 *
 * Indian rural expense patterns:
 *  - Food: steady, ~6% annual inflation
 *  - Education: monthly + annual lumpsum (June/July admission fees)
 *  - Healthcare: baseline + emergency buffer, spikes unpredictable
 *  - Housing: rent/maintenance steady, construction EMI fixed
 *  - Social obligations: concentrated in Oct-Nov (Diwali, Dussehra) and Mar-Apr (weddings, Holi)
 *  - Utilities: slight summer spike (electricity for fans/coolers)
 *  - Transportation: steady
 *  - Non-farm loan EMIs: fixed monthly
 */

// ─── Category-specific annual inflation rates ───────────────────────
const INFLATION_RATES = {
  food_groceries: 0.06,       // Food inflation in India ~6%
  education: 0.10,            // Education inflation ~10% (tuition hikes)
  healthcare: 0.08,           // Healthcare inflation ~8%
  housing: 0.04,              // Rent inflation ~4%
  social_obligations: 0.05,   // Ceremony costs grow ~5%
  transportation: 0.05,       // Fuel/transport ~5%
  utilities: 0.05,            // Electricity/gas ~5%
  non_farm_loan_emi: 0.0,     // Fixed EMI — no inflation
  clothing: 0.05,
  other: 0.05,
};

// ─── Seasonal spike factors by month (1-indexed) ────────────────────
// Social obligations: festivals in Oct(10), Nov(11) and Mar(3), Apr(4)
const SOCIAL_SPIKE_MONTHS = {
  3: 1.5,   // Holi + wedding season start
  4: 1.3,   // Wedding season
  10: 2.0,  // Dussehra + Navratri
  11: 2.5,  // Diwali — peak spend
};

// Utilities: summer electricity spike
const UTILITY_SPIKE_MONTHS = {
  4: 1.15,  // April — summer starts
  5: 1.25,  // May — peak summer
  6: 1.20,  // June — still hot, pre-monsoon
};

// ─── Main Projector ─────────────────────────────────────────────────

/**
 * Project all household expenses month-by-month.
 *
 * @param {object} params
 * @param {object} params.snapshot
 * @param {number} [params.horizonMonths=12]
 * @param {Array}  [params.overrides]         - [{category, amount_monthly, ...}]
 * @param {boolean} [params.applyInflation=false] - Apply inflation for multi-year
 * @returns {{ timeline: Array, summary: object, byCategory: object }}
 */
const projectHouseholdExpenses = ({
  snapshot,
  horizonMonths = 12,
  overrides = null,
  applyInflation = false,
}) => {
  const now = new Date();
  const startMonth = now.getMonth();

  // Resolve expense categories from snapshot
  let categories = extractExpenseCategories(snapshot);

  // Apply overrides
  if (overrides && overrides.length > 0) {
    categories = applyOverrides(categories, overrides);
  }

  // Build month-by-month timeline
  const timeline = [];
  const byCategory = {};

  for (const cat of categories) {
    if (!byCategory[cat.category]) {
      byCategory[cat.category] = { annual: 0, monthly: [], label: cat.label };
    }
  }

  for (let i = 0; i < horizonMonths; i++) {
    const monthIdx = (startMonth + i) % 12;
    const calendarMonth = monthIdx + 1;
    const yearOffset = Math.floor((startMonth + i) / 12);

    const monthEntry = { month: i, calendarMonth, categories: {} };
    let monthTotal = 0;

    for (const cat of categories) {
      let amount = cat.monthly;
      if (amount <= 0) continue;

      // Apply category-specific seasonal spikes
      amount = applySeasonalSpike(amount, cat.category, calendarMonth, cat.peakMonths, cat.peakAmount);

      // Apply inflation for multi-year horizons
      if (applyInflation && yearOffset > 0) {
        const inflationRate = INFLATION_RATES[cat.category] || 0.05;
        amount *= Math.pow(1 + inflationRate, yearOffset);
      }

      amount = round2(amount);
      monthEntry.categories[cat.category] = (monthEntry.categories[cat.category] || 0) + amount;
      monthTotal += amount;

      if (!byCategory[cat.category]) {
        byCategory[cat.category] = { annual: 0, monthly: [], label: cat.label };
      }
      byCategory[cat.category].annual += amount;
    }

    monthEntry.total = round2(monthTotal);
    timeline.push(monthEntry);
  }

  // Fill monthly arrays for byCategory
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].monthly = timeline.map(m => m.categories[cat] || 0);
    byCategory[cat].annual = round2(byCategory[cat].annual);
  }

  // Summary
  const totalProjected = timeline.reduce((s, m) => s + m.total, 0);
  const monthlyValues = timeline.map(m => m.total);
  const peakMonth = monthlyValues.indexOf(Math.max(...monthlyValues));
  const troughMonth = monthlyValues.indexOf(Math.min(...monthlyValues));

  const summary = {
    totalProjectedAnnual: round2(totalProjected * (12 / horizonMonths)),
    avgMonthly: round2(horizonMonths > 0 ? totalProjected / horizonMonths : 0),
    peakMonthExpense: round2(Math.max(...monthlyValues)),
    peakMonth: ((startMonth + peakMonth) % 12) + 1,
    troughMonthExpense: round2(Math.min(...monthlyValues)),
    troughMonth: ((startMonth + troughMonth) % 12) + 1,
    categoryCount: categories.filter(c => c.monthly > 0).length,
    seasonalVariationPct: round2(
      monthlyValues.length > 0
        ? ((Math.max(...monthlyValues) - Math.min(...monthlyValues)) / (totalProjected / horizonMonths || 1)) * 100
        : 0
    ),
  };

  return { timeline, summary, byCategory };
};

/**
 * Estimate the monthly expense floor — the absolute minimum the household needs.
 * Food + healthcare + utilities + non-farm EMI (non-negotiable expenses).
 */
const estimateExpenseFloor = (snapshot) => {
  const categories = extractExpenseCategories(snapshot);
  const essentialCategories = ['food_groceries', 'healthcare', 'utilities', 'non_farm_loan_emi'];

  let floor = 0;
  for (const cat of categories) {
    if (essentialCategories.includes(cat.category)) {
      floor += cat.monthly;
    }
  }

  return round2(floor);
};

// ─── Internal Helpers ───────────────────────────────────────────────

const extractExpenseCategories = (snapshot) => {
  const details = snapshot.household_expense_details;
  if (details && details.expense_categories) {
    return details.expense_categories.map(c => ({
      category: c.category,
      label: c.label || c.category,
      monthly: parseFloat(c.monthly) || 0,
      frequency: c.frequency || 'monthly',
      peakMonths: c.peak_months || null,
      peakAmount: parseFloat(c.peak_amount) || 0,
    }));
  }

  // Fallback: build from snapshot summary columns
  const fallback = [];
  const summaryMap = {
    food_groceries: snapshot.food_groceries_monthly,
    education: snapshot.education_monthly,
    healthcare: snapshot.healthcare_monthly,
    housing: snapshot.housing_monthly,
    social_obligations: snapshot.social_obligations_annual ? snapshot.social_obligations_annual / 12 : 0,
    transportation: snapshot.transportation_monthly,
    utilities: snapshot.utilities_monthly,
    non_farm_loan_emi: snapshot.non_farm_loan_emi_monthly,
  };

  for (const [category, monthly] of Object.entries(summaryMap)) {
    if (monthly && monthly > 0) {
      fallback.push({ category, label: category, monthly: parseFloat(monthly), frequency: 'monthly', peakMonths: null, peakAmount: 0 });
    }
  }

  return fallback;
};

const applyOverrides = (categories, overrides) => {
  const result = [...categories];

  for (const override of overrides) {
    const idx = result.findIndex(c => c.category === override.category);
    if (idx >= 0) {
      if (override.amount_monthly !== undefined && override.amount_monthly !== null) {
        result[idx] = { ...result[idx], monthly: parseFloat(override.amount_monthly) };
      }
      if (override.peak_months) {
        result[idx] = { ...result[idx], peakMonths: override.peak_months };
      }
      if (override.peak_amount !== undefined) {
        result[idx] = { ...result[idx], peakAmount: parseFloat(override.peak_amount) || 0 };
      }
    } else {
      result.push({
        category: override.category,
        label: override.note || override.category,
        monthly: parseFloat(override.amount_monthly) || 0,
        frequency: 'monthly',
        peakMonths: override.peak_months || null,
        peakAmount: parseFloat(override.peak_amount) || 0,
      });
    }
  }

  return result;
};

/**
 * Apply seasonal spike to a category amount for a given calendar month.
 * Uses both saved peak_months data and category-specific default spikes.
 */
const applySeasonalSpike = (baseAmount, category, calendarMonth, peakMonths, peakAmount) => {
  let amount = baseAmount;

  // Saved peak month data takes priority
  if (peakMonths && peakMonths.includes(calendarMonth) && peakAmount > 0) {
    return round2(baseAmount + peakAmount);
  }

  // Default seasonal spikes by category
  if (category === 'social_obligations') {
    const spike = SOCIAL_SPIKE_MONTHS[calendarMonth];
    if (spike) amount *= spike;
  }

  if (category === 'utilities') {
    const spike = UTILITY_SPIKE_MONTHS[calendarMonth];
    if (spike) amount *= spike;
  }

  return round2(amount);
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = {
  projectHouseholdExpenses,
  estimateExpenseFloor,
  INFLATION_RATES,
  SOCIAL_SPIKE_MONTHS,
};
