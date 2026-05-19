/**
 * Household Income Projector
 *
 * Projects non-farm income month-by-month with:
 *  - Seasonal patterns (active_months for seasonal workers)
 *  - Reliability scoring (guaranteed → regular → irregular → one_time)
 *  - Growth adjustments per source type
 *  - Override support for scenario "what-if" modeling
 *
 * Pure function — no DB access. Works on snapshot household_income_details.
 *
 * Indian rural income patterns modeled:
 *  - SHG: steady monthly, slight growth from micro-enterprise scaling
 *  - Wage labor: highly seasonal (off-season from farm calendar)
 *  - MGNREGA: seasonal (lean months), guaranteed 100 days
 *  - Pension: guaranteed monthly, no growth
 *  - Remittance: regular monthly but can stop abruptly
 *  - Petty business: daily earnings, slight seasonal dip in monsoon
 *  - Govt transfers: quarterly (PM-KISAN) or annual (DBT)
 *  - Rental: annual or semi-annual lump sum
 */

// ─── Reliability multipliers (how much to discount for projection) ──
const RELIABILITY_FACTORS = {
  guaranteed: 1.0,   // Pension, PM-KISAN — will definitely arrive
  regular: 0.95,     // SHG, remittance — very likely but not guaranteed
  irregular: 0.70,   // Wage labor — depends on availability
  one_time: 0.0,     // Windfall — don't project recurring
};

// ─── Annual growth rates by source type ─────────────────────────────
const GROWTH_RATES = {
  spouse_shg: 0.08,      // SHGs typically grow 5-10% as micro-enterprise scales
  wage_labor: 0.05,      // Wage inflation ~5%
  mgnrega: 0.04,         // MGNREGA wage revised ~4% annually
  pension: 0.0,          // Fixed amount, no growth
  remittance: 0.03,      // Slight growth with city wage inflation
  petty_business: 0.06,  // Small business growth
  govt_transfer: 0.0,    // PM-KISAN fixed at ₹6,000/year
  rental: 0.05,          // Rental income grows with land value
  other: 0.03,           // Conservative default
};

// ─── Petty business seasonal dip (monsoon months) ───────────────────
const PETTY_BUSINESS_SEASONAL = [1.0, 1.0, 1.0, 1.0, 1.0, 0.85, 0.80, 0.85, 0.90, 1.0, 1.0, 1.0];

// ─── Main Projector ─────────────────────────────────────────────────

/**
 * Project all non-farm household income sources month-by-month.
 *
 * @param {object} params
 * @param {object} params.snapshot           - DrishtiFarmerSnapshot
 * @param {number} [params.horizonMonths=12]
 * @param {Array}  [params.overrides]        - [{source_type, amount_monthly, active_months, ...}]
 * @param {Array}  [params.additionalSources]- New sources to add to projection
 * @param {boolean} [params.applyGrowth=false] - Apply annual growth for multi-year horizons
 * @returns {{ timeline: Array, summary: object, bySource: object }}
 */
const projectHouseholdIncome = ({
  snapshot,
  horizonMonths = 12,
  overrides = null,
  additionalSources = null,
  applyGrowth = false,
}) => {
  const now = new Date();
  const startMonth = now.getMonth(); // 0-indexed

  // Resolve income streams from snapshot
  let streams = extractIncomeStreams(snapshot);

  // Apply overrides
  if (overrides && overrides.length > 0) {
    streams = applyOverrides(streams, overrides);
  }

  // Add new sources
  if (additionalSources && additionalSources.length > 0) {
    for (const src of additionalSources) {
      streams.push({
        source: src.source_type,
        label: src.label || src.source_type,
        earningMember: src.earning_member || 'farmer',
        amountMonthly: parseFloat(src.amount_monthly) || 0,
        frequency: src.frequency || 'monthly',
        reliability: src.reliability || 'regular',
        activeMonths: src.active_months || null,
      });
    }
  }

  // Build month-by-month timeline
  const timeline = [];
  const bySource = {};

  // Initialize bySource totals
  for (const stream of streams) {
    if (!bySource[stream.source]) {
      bySource[stream.source] = { annual: 0, monthly: [], label: stream.label, earningMember: stream.earningMember };
    }
  }

  for (let i = 0; i < horizonMonths; i++) {
    const monthIdx = (startMonth + i) % 12;
    const calendarMonth = monthIdx + 1; // 1-indexed
    const yearOffset = Math.floor((startMonth + i) / 12);

    const monthEntry = { month: i, calendarMonth, sources: {} };
    let monthTotal = 0;

    for (const stream of streams) {
      let amount = stream.amountMonthly;
      if (amount <= 0) continue;

      // Check active months
      if (stream.activeMonths && stream.activeMonths.length > 0) {
        if (!stream.activeMonths.includes(calendarMonth)) {
          monthEntry.sources[stream.source] = (monthEntry.sources[stream.source] || 0);
          continue;
        }
      }

      // Apply reliability discount
      const reliabilityFactor = RELIABILITY_FACTORS[stream.reliability] || 0.85;
      amount *= reliabilityFactor;

      // Apply seasonal adjustment for petty business
      if (stream.source === 'petty_business') {
        amount *= PETTY_BUSINESS_SEASONAL[monthIdx];
      }

      // Apply growth for multi-year horizons
      if (applyGrowth && yearOffset > 0) {
        const growthRate = GROWTH_RATES[stream.source] || 0.03;
        amount *= Math.pow(1 + growthRate, yearOffset);
      }

      amount = round2(amount);
      monthEntry.sources[stream.source] = (monthEntry.sources[stream.source] || 0) + amount;
      monthTotal += amount;

      // Track by-source annual
      if (!bySource[stream.source]) {
        bySource[stream.source] = { annual: 0, monthly: [], label: stream.label, earningMember: stream.earningMember };
      }
      bySource[stream.source].annual += amount;
    }

    monthEntry.total = round2(monthTotal);
    timeline.push(monthEntry);
  }

  // Fill monthly arrays for bySource
  for (const source of Object.keys(bySource)) {
    bySource[source].monthly = timeline.map(m => m.sources[source] || 0);
    bySource[source].annual = round2(bySource[source].annual);
  }

  // Compute summary
  const totalProjected = timeline.reduce((s, m) => s + m.total, 0);
  const avgMonthly = horizonMonths > 0 ? totalProjected / horizonMonths : 0;

  // Months with zero income (all sources inactive)
  const zeroMonths = timeline.filter(m => m.total === 0).length;

  // Most reliable source (highest annual, guaranteed/regular)
  const sortedSources = Object.entries(bySource)
    .filter(([_, v]) => v.annual > 0)
    .sort((a, b) => b[1].annual - a[1].annual);

  const summary = {
    totalProjectedAnnual: round2(totalProjected * (12 / horizonMonths)),
    avgMonthly: round2(avgMonthly),
    streamCount: streams.filter(s => s.amountMonthly > 0).length,
    zeroIncomeMonths: zeroMonths,
    mostReliableSource: sortedSources.length > 0 ? sortedSources[0][0] : null,
    earningMembers: [...new Set(streams.map(s => s.earningMember))],
  };

  return { timeline, summary, bySource };
};

/**
 * Project a single income source over the horizon (for scenario comparison).
 */
const projectSingleSource = ({ source, amountMonthly, frequency, reliability, activeMonths, horizonMonths = 12 }) => {
  const now = new Date();
  const startMonth = now.getMonth();
  const monthly = [];

  for (let i = 0; i < horizonMonths; i++) {
    const calendarMonth = ((startMonth + i) % 12) + 1;

    let amount = amountMonthly;
    if (activeMonths && activeMonths.length > 0 && !activeMonths.includes(calendarMonth)) {
      amount = 0;
    }

    const reliabilityFactor = RELIABILITY_FACTORS[reliability] || 0.85;
    amount *= reliabilityFactor;

    if (source === 'petty_business') {
      amount *= PETTY_BUSINESS_SEASONAL[(startMonth + i) % 12];
    }

    monthly.push(round2(amount));
  }

  return { source, monthly, annual: round2(monthly.reduce((s, v) => s + v, 0) * (12 / horizonMonths)) };
};

// ─── Internal Helpers ───────────────────────────────────────────────

const extractIncomeStreams = (snapshot) => {
  const incomeDetails = snapshot.household_income_details;
  if (incomeDetails && incomeDetails.income_streams) {
    return incomeDetails.income_streams.map(s => ({
      source: s.source,
      label: s.label || s.source,
      earningMember: s.earning_member || 'farmer',
      amountMonthly: parseFloat(s.amount_monthly) || 0,
      frequency: s.frequency || 'monthly',
      reliability: s.reliability || 'regular',
      activeMonths: s.active_months || null,
    }));
  }

  // Fallback: build from snapshot summary columns
  const streams = [];
  const summaryMap = {
    spouse_shg: snapshot.spouse_shg_monthly,
    wage_labor: snapshot.wage_labor_monthly,
    mgnrega: snapshot.mgnrega_annual ? snapshot.mgnrega_annual / 12 : 0,
    pension: snapshot.pension_monthly,
    remittance: snapshot.remittance_monthly,
    petty_business: snapshot.petty_business_monthly,
    govt_transfer: snapshot.govt_transfers_annual ? snapshot.govt_transfers_annual / 12 : 0,
    rental: snapshot.rental_income_monthly,
    other: snapshot.other_income_monthly,
  };

  for (const [source, monthly] of Object.entries(summaryMap)) {
    if (monthly && monthly > 0) {
      streams.push({
        source,
        label: source,
        earningMember: 'farmer',
        amountMonthly: parseFloat(monthly),
        frequency: 'monthly',
        reliability: source === 'pension' || source === 'govt_transfer' ? 'guaranteed' : 'regular',
        activeMonths: null,
      });
    }
  }

  return streams;
};

const applyOverrides = (streams, overrides) => {
  const result = [...streams];

  for (const override of overrides) {
    const idx = result.findIndex(s => s.source === override.source_type);
    if (idx >= 0) {
      if (override.amount_monthly !== undefined && override.amount_monthly !== null) {
        result[idx] = { ...result[idx], amountMonthly: parseFloat(override.amount_monthly) };
      }
      if (override.active_months) {
        result[idx] = { ...result[idx], activeMonths: override.active_months };
      }
      if (override.reliability) {
        result[idx] = { ...result[idx], reliability: override.reliability };
      }
    } else {
      // Add as new stream
      result.push({
        source: override.source_type,
        label: override.note || override.source_type,
        earningMember: override.earning_member || 'farmer',
        amountMonthly: parseFloat(override.amount_monthly) || 0,
        frequency: 'monthly',
        reliability: override.reliability || 'regular',
        activeMonths: override.active_months || null,
      });
    }
  }

  return result;
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = {
  projectHouseholdIncome,
  projectSingleSource,
  RELIABILITY_FACTORS,
  GROWTH_RATES,
};
