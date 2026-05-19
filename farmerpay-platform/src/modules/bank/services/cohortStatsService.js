/**
 * Cohort Stats Service — pure-function helpers for the May 2026 pilot
 * cohort report. No DB, no IO — just the math.
 *
 * Why these specific tests?
 *
 * The pilot has ~60-75 farmers per arm per bank. With event rates below
 * 10% (NPA is thankfully rare), simple `count/total` percentages are
 * noisy enough that a ±5% difference can be pure sampling jitter. The
 * weekly pilot report has to tell the bank partner "your test cohort is
 * meaningfully better" without over-claiming statistical power. That
 * requires two things:
 *
 *   1. A confidence interval on the NPA % per cohort. We use Wilson
 *      score interval instead of the normal approximation because Wilson
 *      is far better for small samples and proportions near 0 or 1 —
 *      exactly our situation. It doesn't blow up at 0% or 100%.
 *
 *   2. A significance test on the difference between test and control
 *      NPA %. Two-proportion z-test is the standard here. We report a
 *      one-sided p-value (H1: test NPA < control NPA) because the bank
 *      only cares about reductions — an increase would kill the pilot
 *      regardless of statistical significance.
 *
 * All helpers are pure, side-effect-free, and documented with links to
 * the formulas so future maintainers can verify the math.
 */

/**
 * Wilson score interval for a binomial proportion.
 *
 * Given `successes` events out of `trials`, returns the lower and upper
 * bound of a 2-sided 95% CI on the true proportion. Works sanely even
 * when trials = 0 (returns [0, 0] rather than NaN) and at boundary
 * values (p = 0 or p = 1).
 *
 * Formula: https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval
 *
 * @param {number} successes
 * @param {number} trials
 * @param {number} [z=1.96] - 1.96 for 95% CI, 2.576 for 99%
 * @returns {{ point: number, lower: number, upper: number, halfWidth: number }}
 *   All fractions in [0, 1]. Multiply by 100 for percentage display.
 */
const wilsonInterval = (successes, trials, z = 1.96) => {
  if (!trials || trials <= 0) {
    return { point: 0, lower: 0, upper: 0, halfWidth: 0 };
  }
  const n = trials;
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  const lower = Math.max(0, centre - margin);
  const upper = Math.min(1, centre + margin);
  return {
    point: p,
    lower,
    upper,
    halfWidth: (upper - lower) / 2,
  };
};

/**
 * Two-proportion z-test for the difference between test and control
 * proportions. Returns the z statistic, two-sided p-value, one-sided
 * p-value (H1: test < control — meaningful reduction), and the
 * observed difference (test - control; negative = test is lower).
 *
 * Uses the pooled-variance form which is standard when testing H0: p1 = p2.
 * Formula: https://en.wikipedia.org/wiki/Statistical_hypothesis_testing#Two-proportion_z-test
 *
 * Returns p-values using a rational approximation of the standard normal
 * CDF (Abramowitz & Stegun 26.2.17) — accurate to ~7.5e-8, plenty for
 * pilot reporting. No external stats library needed.
 *
 * @param {number} testSuccesses
 * @param {number} testTrials
 * @param {number} controlSuccesses
 * @param {number} controlTrials
 * @returns {{
 *   z: number,
 *   pValueTwoSided: number,
 *   pValueOneSided: number,
 *   diff: number,
 *   computable: boolean
 * }}
 */
const twoProportionZTest = (testSuccesses, testTrials, controlSuccesses, controlTrials) => {
  if (testTrials <= 0 || controlTrials <= 0) {
    return {
      z: 0,
      pValueTwoSided: 1,
      pValueOneSided: 1,
      diff: 0,
      computable: false,
    };
  }
  const pTest = testSuccesses / testTrials;
  const pControl = controlSuccesses / controlTrials;
  const diff = pTest - pControl;
  const pPool = (testSuccesses + controlSuccesses) / (testTrials + controlTrials);
  const varPool = pPool * (1 - pPool) * (1 / testTrials + 1 / controlTrials);
  if (varPool <= 0) {
    // Both cohorts had 0 events OR 100% events — no variance, no z.
    return {
      z: 0,
      pValueTwoSided: diff === 0 ? 1 : 0,
      pValueOneSided: diff >= 0 ? 1 : 0,
      diff,
      computable: false,
    };
  }
  const se = Math.sqrt(varPool);
  const z = diff / se;
  // Two-sided: 2 * (1 - Phi(|z|))
  const pTwoSided = 2 * (1 - normalCdf(Math.abs(z)));
  // One-sided (H1: test < control → diff < 0): Phi(z)
  const pOneSided = normalCdf(z);
  return {
    z,
    pValueTwoSided: Math.max(0, Math.min(1, pTwoSided)),
    pValueOneSided: Math.max(0, Math.min(1, pOneSided)),
    diff,
    computable: true,
  };
};

/**
 * Standard normal CDF via Abramowitz & Stegun 26.2.17 approximation.
 * Accurate to ~7.5e-8 across the full range. Pure function, no imports.
 *
 * Formula: https://en.wikipedia.org/wiki/Normal_distribution#Numerical_approximations_for_the_normal_CDF
 *
 * @param {number} x
 * @returns {number} Phi(x) in [0, 1]
 */
const normalCdf = (x) => {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
};

/**
 * Roll up a flat array of (cohort_tag, sma_classification) rows into
 * cohort-level metrics ready for the report JSON.
 *
 * This is the function the cohort report controller calls after
 * SELECTing the snapshot rows from BankLoanAccountHistory for a given
 * date range + filter (bank / district / pilot-wide).
 *
 * @param {Array<{ cohort_tag: string, sma_classification: string, outstanding_amount?: number, days_past_due?: number }>} rows
 * @returns {{
 *   test: CohortSnapshot,
 *   control: CohortSnapshot,
 *   unassigned: CohortSnapshot,
 *   comparison: { diff: number, pValueOneSided: number, computable: boolean },
 * }}
 */
const summarizeCohorts = (rows) => {
  const buckets = { test: [], control: [], unassigned: [] };
  for (const r of rows) {
    const key = buckets[r.cohort_tag] ? r.cohort_tag : 'unassigned';
    buckets[key].push(r);
  }

  const snapshot = (bucket) => {
    const count = bucket.length;
    const smaCounts = {
      standard: 0, sma_0: 0, sma_1: 0, sma_2: 0, npa: 0,
    };
    let totalOutstanding = 0;
    let totalDpd = 0;
    for (const r of bucket) {
      if (smaCounts[r.sma_classification] != null) smaCounts[r.sma_classification] += 1;
      totalOutstanding += Number(r.outstanding_amount || 0);
      totalDpd += Number(r.days_past_due || 0);
    }
    const npaCount = smaCounts.npa;
    const stressedCount = smaCounts.sma_1 + smaCounts.sma_2 + smaCounts.npa;
    const npaCi = wilsonInterval(npaCount, count);
    const stressedCi = wilsonInterval(stressedCount, count);
    return {
      headcount: count,
      smaCounts,
      smaPct: {
        standard:   count ? smaCounts.standard / count : 0,
        sma_0:      count ? smaCounts.sma_0    / count : 0,
        sma_1:      count ? smaCounts.sma_1    / count : 0,
        sma_2:      count ? smaCounts.sma_2    / count : 0,
        npa:        count ? smaCounts.npa      / count : 0,
      },
      npaPct:       npaCi.point,
      npaCi:        { lower: npaCi.lower, upper: npaCi.upper },
      stressedPct:  stressedCi.point,
      stressedCi:   { lower: stressedCi.lower, upper: stressedCi.upper },
      avgDaysPastDue: count ? totalDpd / count : 0,
      totalOutstanding,
    };
  };

  const test = snapshot(buckets.test);
  const control = snapshot(buckets.control);
  const unassigned = snapshot(buckets.unassigned);

  const comparison = twoProportionZTest(
    test.smaCounts.npa, test.headcount,
    control.smaCounts.npa, control.headcount,
  );

  return { test, control, unassigned, comparison };
};

/**
 * Compute linkage-rate KPIs for the May 2026 pilot (WS6.2).
 *
 * Takes the current live `bank_loan_accounts` rows within some cohort
 * scope (filtered by the caller) and returns:
 *   - for the test cohort: how many rows have linked_farmer_id set
 *     (i.e. the farmer has the FarmerPay app installed and the loan
 *     is visible to her)
 *   - for the control cohort: the same number, but we EXPECT this to
 *     be near 0 since control farmers shouldn't be onboarded
 *
 * A "linked" row means linkage_status IN ('auto_matched', 'manually_linked',
 * 'confirmed'). Unlinked rows are either status='unlinked' or have a
 * null linked_farmer_id.
 *
 * This is the single most important operational KPI during the pilot's
 * first 2 weeks: the engagement hypothesis only works if test-cohort
 * farmers are actually linked. Target: ≥80% linkage by end of week 2.
 * Anything below 50% means field agents aren't reaching enough farmers
 * and the pilot becomes intent-to-treat, not treated.
 *
 * @param {Array<{ cohort_tag: string, linked_farmer_id?: number|null, linkage_status?: string|null }>} accountRows
 * @returns {{
 *   test:    { total, linked, linkageRate, contaminationWarning },
 *   control: { total, linked, linkageRate, contaminationWarning },
 *   pilotTarget: 0.8,
 * }}
 */
const computeLinkageRate = (accountRows) => {
  const buckets = { test: [], control: [] };
  for (const r of accountRows) {
    if (r.cohort_tag === 'test' || r.cohort_tag === 'control') {
      buckets[r.cohort_tag].push(r);
    }
  }

  const summarize = (rows, isControl) => {
    const total = rows.length;
    const linked = rows.filter((r) => {
      if (r.linked_farmer_id == null) return false;
      const status = (r.linkage_status || '').toLowerCase();
      return ['auto_matched', 'manually_linked', 'confirmed'].includes(status);
    }).length;
    const rate = total > 0 ? linked / total : 0;
    // Control cohort should have ~0% linkage. If it's above 5% the bank-ops
    // team accidentally onboarded control farmers → COHORT CONTAMINATION.
    const contaminationWarning = isControl && rate > 0.05;
    return { total, linked, linkageRate: rate, contaminationWarning };
  };

  return {
    test:    summarize(buckets.test, false),
    control: summarize(buckets.control, true),
    pilotTarget: 0.8,
  };
};

module.exports = {
  wilsonInterval,
  twoProportionZTest,
  normalCdf,
  summarizeCohorts,
  computeLinkageRate,
};
