/**
 * AgriStack Land Lookup Controller
 *
 * Persona phase — exposes an authenticated wrapper around the existing
 * AgriStack `landVerificationService` so the new /land-records screen in
 * the farmer app can fetch the farmer's survey records without the frontend
 * knowing anything about Aadhaar hashing or consent tokens.
 *
 * Feature-flag behavior:
 *   - When `AGRISTACK_FEATURE_ENABLED=false` (default), returns a
 *     deterministic mock set of 2 plots derived from the farmer's id so
 *     developers and QA can exercise the full flow without a real UFSI
 *     hookup.
 *   - When enabled, forwards to landVerificationService.getLandByAadhaar()
 *     with the farmer's Aadhaar hash pulled from their profile.
 */

const landVerificationService = require('../../../integrations/agristack/services/landVerificationService');
const agristackConfig = require('../../../integrations/agristack/config/agristackConfig');
const { success } = require('../../../shared/utils/responseHelper');
const logger = require('../../../shared/utils/logger');
const { User } = require('../../../shared/models');

const resolveUser = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user;
};

/**
 * Deterministic mock — same farmerId always returns the same plots, so
 * QA screenshots are stable across runs.
 */
const mockPlotsForFarmer = (farmerId) => {
  const villages = ['Kanpur', 'Barabanki', 'Fatehpur', 'Unnao', 'Raebareli'];
  const district = villages[farmerId % villages.length];
  const surveyA = 60 + (farmerId % 40);
  const surveyB = surveyA + 22;
  return [
    {
      surveyNumber: `${surveyA}A`,
      subdivision: null,
      areaHectares: 1.2,
      village: district,
      district,
      state: 'Uttar Pradesh',
      ownershipType: 'Self',
      source: 'AGRISTACK_MOCK',
    },
    {
      surveyNumber: `${surveyB}B`,
      subdivision: null,
      areaHectares: 0.8,
      village: district,
      district,
      state: 'Uttar Pradesh',
      ownershipType: 'Self',
      source: 'AGRISTACK_MOCK',
    },
  ];
};

/** POST /agristack/land-lookup — returns plots owned by the auth'd farmer. */
const landLookup = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    const farmerId = user.id;

    // Feature-flag path — real integration
    if (agristackConfig?.features?.landVerificationEnabled) {
      try {
        const result = await landVerificationService.getLandByAadhaar(
          user.aadhaar_hash || null,
          req.body?.consentToken || null
        );
        if (result && Array.isArray(result.plots) && result.plots.length > 0) {
          return success(res, {
            message: 'Land records fetched from AgriStack',
            data: { plots: result.plots, source: 'AGRISTACK_LIVE' },
          });
        }
      } catch (err) {
        logger.warn(`AgriStack land lookup failed for farmer ${farmerId}: ${err.message}`);
      }
    }

    // Fallback — deterministic mock
    const plots = mockPlotsForFarmer(farmerId);
    logger.info(`AgriStack mock land lookup for farmer ${farmerId}: ${plots.length} plots`);
    return success(res, {
      message: 'Land records fetched (mock)',
      data: { plots, source: 'AGRISTACK_MOCK' },
    });
  } catch (e) {
    next(e);
  }
};

module.exports = { landLookup };
