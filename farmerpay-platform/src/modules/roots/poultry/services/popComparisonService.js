/**
 * Poultry PoP Comparison — Compares actuals vs standard benchmarks.
 */
let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const classify = (actual, expected, lowerBetter = false) => {
  if (actual == null || expected == null) return 'UNKNOWN';
  const ratio = actual / expected;
  if (lowerBetter) {
    if (ratio <= 0.8) return 'EXCELLENT';
    if (ratio <= 1.0) return 'ON_TRACK';
    if (ratio <= 1.3) return 'BELOW_STANDARD';
    return 'CRITICAL';
  }
  if (ratio >= 1.05) return 'EXCELLENT';
  if (ratio >= 0.9) return 'ON_TRACK';
  if (ratio >= 0.7) return 'BELOW_STANDARD';
  return 'CRITICAL';
};

const compareToStandard = async (flockId) => {
  const { PoultryFlock, PoultryPopTemplate, PoultryBatchSummary, PoultryDailyLog } = getDb();

  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock) { const err = new Error('Flock not found'); err.statusCode = 404; throw err; }

  const daysSince = Math.round((Date.now() - new Date(flock.placement_date).getTime()) / 86400000);
  const weekNumber = Math.ceil(daysSince / 7);
  const birdTypeForPop = flock.bird_type === 'LAYER' ? 'LAYER' : 'BROILER';

  const template = await PoultryPopTemplate.findOne({
    where: { bird_type: birdTypeForPop, week_number: weekNumber, is_active: true },
  });

  const summary = await PoultryBatchSummary.findOne({
    where: { flock_id: flockId, is_active: true },
    order: [['summary_date', 'DESC']],
  });

  const result = { weekNumber, birdType: flock.bird_type, template: null, comparison: {} };

  if (!template) return result;

  result.template = {
    expectedFeedGPerBird: template.expected_feed_g_per_bird,
    expectedWeightG: template.expected_weight_g,
    expectedEggPct: template.expected_egg_pct ? parseFloat(template.expected_egg_pct) : null,
    expectedMortalityPct: template.expected_mortality_pct ? parseFloat(template.expected_mortality_pct) : null,
    vaccinationDue: template.vaccination_due,
  };

  const actualMortality = summary ? parseFloat(summary.mortality_rate_pct || 0) : null;
  const actualFcr = summary ? (summary.fcr ? parseFloat(summary.fcr) : null) : null;
  const actualWeight = summary ? summary.avg_weight_g : null;
  const actualEggPct = summary ? (summary.egg_production_pct ? parseFloat(summary.egg_production_pct) : null) : null;

  result.comparison = {
    mortality: {
      actual: actualMortality,
      expected: template.expected_mortality_pct ? parseFloat(template.expected_mortality_pct) : null,
      status: classify(actualMortality, template.expected_mortality_pct ? parseFloat(template.expected_mortality_pct) : null, true),
    },
    fcr: {
      actual: actualFcr,
      expected: birdTypeForPop === 'BROILER' ? 1.7 : null, // standard broiler FCR benchmark
      status: actualFcr ? classify(actualFcr, 1.7, true) : 'UNKNOWN',
    },
    weight: {
      actual: actualWeight,
      expected: template.expected_weight_g,
      status: classify(actualWeight, template.expected_weight_g),
    },
    eggPct: {
      actual: actualEggPct,
      expected: template.expected_egg_pct ? parseFloat(template.expected_egg_pct) : null,
      status: classify(actualEggPct, template.expected_egg_pct ? parseFloat(template.expected_egg_pct) : null),
    },
  };

  return result;
};

module.exports = { compareToStandard };
