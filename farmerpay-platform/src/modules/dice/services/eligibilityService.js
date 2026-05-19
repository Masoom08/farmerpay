/**
 * Eligibility Service
 * Checks if a farmer meets a loan product's eligibility rules.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Checks eligibility of a farmer against a product's rules.
 * @param {number} farmerId - Internal user ID
 * @param {number} productId - Loan product ID
 * @returns {Promise<Object>} { isEligible, meetsAllCriteria, failingCriteria, passingCriteria }
 */
const checkEligibility = async (farmerId, productId) => {
  const { LoanProductEligibilityRule, FarmerProfile, TrustScoreHistory } = getDb();

  const rules = await LoanProductEligibilityRule.findAll({
    where: { product_id: productId, is_active: true },
  });

  if (rules.length === 0) return { isEligible: true, meetsAllCriteria: true, failingCriteria: [], passingCriteria: [] };

  const farmerProfile = await FarmerProfile.findOne({ where: { farmer_id: farmerId, is_active: true } });
  const latestScore = await TrustScoreHistory.findOne({
    where: { farmer_id: farmerId, is_active: true },
    order: [['calculated_at', 'DESC']],
  });

  const passing = [];
  const failing = [];

  for (const rule of rules) {
    const ruleValue = rule.rule_value;
    let passed = false;

    switch (rule.rule_type) {
      case 'min_trust_score':
        passed = (latestScore?.total_trust_score || 0) >= parseInt(ruleValue, 10);
        break;
      case 'min_land_size':
        passed = parseFloat(farmerProfile?.total_farm_size_hectares || 0) >= parseFloat(ruleValue);
        break;
      case 'max_land_size':
        passed = parseFloat(farmerProfile?.total_farm_size_hectares || 0) <= parseFloat(ruleValue);
        break;
      case 'fpo_requirement':
        passed = ruleValue === 'true' ? !!farmerProfile?.fpo_member : true;
        break;
      case 'crop_requirement':
        passed = farmerProfile?.primary_crop?.toLowerCase() === ruleValue.toLowerCase();
        break;
      case 'state_requirement':
        // Would check farmer's address state — pass for now
        passed = true;
        break;
      case 'age_requirement': {
        if (farmerProfile?.date_of_birth) {
          const age = Math.floor((Date.now() - new Date(farmerProfile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          const [minAge, maxAge] = ruleValue.split('-').map(Number);
          passed = age >= minAge && (maxAge ? age <= maxAge : true);
        }
        break;
      }
      default:
        passed = true;
    }

    const item = { ruleType: rule.rule_type, ruleValue, passed };
    if (passed) passing.push(item);
    else failing.push(item);
  }

  const isEligible = failing.length === 0;
  logger.info(`Eligibility check: farmer ${farmerId}, product ${productId}, eligible: ${isEligible}`);

  return { isEligible, meetsAllCriteria: isEligible, failingCriteria: failing, passingCriteria: passing };
};

module.exports = { checkEligibility };
