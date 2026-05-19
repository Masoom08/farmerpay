/**
 * Vistaar Government Scheme Service — STUB
 *
 * DO NOT BUILD scheme rule engine in-house.
 * Use Vistaar + AgriStack UFSI for scheme eligibility and status.
 * DICE focuses on loan product comparison, not scheme tracking.
 *
 * Vistaar covers: PM-KISAN, PMFBY, KCC, PMMSY, MIDH, SMAM, AIF, NRLM
 * AgriStack UFSI covers: Scheme eligibility by Farmer ID
 *
 * Flow: Vistaar scheme data → this adapter → farmer_scheme_enrollments table
 *       → DICE shows scheme coverage on loan application screen
 */

const logger = require('../../../shared/utils/logger');
const vistaarConfig = require('../config/vistaarConfig');

/**
 * Checks farmer's scheme eligibility via Vistaar/AgriStack.
 * STUB — returns null until APIs are available.
 */
const checkSchemeEligibility = async (farmerId, schemeCode) => {
  if (!vistaarConfig.features.schemeTrackingEnabled) {
    logger.debug('Vistaar scheme tracking disabled — API not yet available');
    return null;
  }

  // TODO: Call AgriStack UFSI for eligibility
  // TODO: Call Vistaar for scheme status
  // Feed into farmer_scheme_enrollments table
  return null;
};

/**
 * Fetches scheme enrollment status for a farmer.
 * STUB — returns null until APIs are available.
 */
const fetchSchemeStatus = async (farmerId) => {
  if (!vistaarConfig.features.schemeTrackingEnabled) return null;

  // TODO: Pull PM-KISAN, PMFBY, KCC status from Vistaar
  return null;
};

/**
 * Syncs scheme data into farmer_scheme_enrollments.
 * Scheduled job — runs daily when enabled.
 */
const syncSchemeEnrollments = async (farmerId) => {
  if (!vistaarConfig.features.schemeTrackingEnabled) return { synced: 0 };

  // TODO: Fetch all scheme enrollments from Vistaar/AgriStack
  // Upsert into farmer_scheme_enrollments
  return { synced: 0, message: 'Vistaar/AgriStack API not yet available' };
};

module.exports = { checkSchemeEligibility, fetchSchemeStatus, syncSchemeEnrollments };
