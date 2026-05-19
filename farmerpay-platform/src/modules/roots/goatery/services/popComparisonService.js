/**
 * Goat PoP Comparison — Growth rate vs breed standards, feed efficiency.
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

const compareAnimalToStandard = async (animalId) => {
  const { GoatAnimal, GoatPopTemplate, GoatGrowthLog } = getDb();

  const animal = await GoatAnimal.findByPk(animalId);
  if (!animal) { const err = new Error('Animal not found'); err.statusCode = 404; throw err; }

  const ageMonths = animal.approximate_age_months || (animal.dob ? Math.round((Date.now() - new Date(animal.dob).getTime()) / (30 * 86400000)) : null);

  const template = await GoatPopTemplate.findOne({
    where: {
      breed: animal.breed || 'Generic',
      sex: animal.sex,
      age_months_start: { [require('sequelize').Op.lte]: ageMonths || 0 },
      age_months_end: { [require('sequelize').Op.gte]: ageMonths || 0 },
      is_active: true,
    },
  });

  const result = { animalId, breed: animal.breed, sex: animal.sex, ageMonths, template: null, comparison: {} };
  if (!template) return result;

  result.template = {
    expectedWeightKg: template.expected_weight_kg ? parseFloat(template.expected_weight_kg) : null,
    dailyFeedKg: template.daily_feed_requirement_kg ? parseFloat(template.daily_feed_requirement_kg) : null,
    expectedKiddingRate: template.expected_kidding_rate ? parseFloat(template.expected_kidding_rate) : null,
  };

  result.comparison.weight = {
    actual: animal.weight_kg ? parseFloat(animal.weight_kg) : null,
    expected: result.template.expectedWeightKg,
    status: classify(animal.weight_kg ? parseFloat(animal.weight_kg) : null, result.template.expectedWeightKg),
  };

  return result;
};

const compareHerdToStandard = async (herdId) => {
  const { GoatAnimal, GoatHerd } = getDb();
  const herd = await GoatHerd.findByPk(herdId);
  if (!herd) { const err = new Error('Herd not found'); err.statusCode = 404; throw err; }

  const animals = await GoatAnimal.findAll({ where: { herd_id: herdId, status: 'ACTIVE', is_active: true } });
  const results = [];

  for (const animal of animals.slice(0, 20)) { // limit to 20 for performance
    try {
      const comp = await compareAnimalToStandard(animal.id);
      results.push(comp);
    } catch {}
  }

  const withWeight = results.filter((r) => r.comparison?.weight?.status !== 'UNKNOWN');
  const statusCounts = { EXCELLENT: 0, ON_TRACK: 0, BELOW_STANDARD: 0, CRITICAL: 0 };
  withWeight.forEach((r) => { const s = r.comparison.weight.status; if (statusCounts[s] !== undefined) statusCounts[s]++; });

  return { herdId, totalAnimals: animals.length, assessed: results.length, statusCounts, animals: results };
};

module.exports = { compareAnimalToStandard, compareHerdToStandard };
