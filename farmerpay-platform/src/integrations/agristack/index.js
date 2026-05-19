/**
 * AgriStack UFSI Integration Module
 *
 * 25 API endpoint stubs for AgriStack Unified Farmer Service Interface.
 * All free via UFSI. JWT token auth. Consent required for PII.
 *
 * Grouped by FarmerPay module:
 *
 * CORE (P0):
 *   - Farmer identity (get by Aadhaar, verify, full profile, bulk sync)
 *   - Consent management (DPDP Act)
 *   - Network/service discovery
 *
 * DICE (P0-P1):
 *   - Land verification (by Aadhaar, verify, ROR, owned area, unified, lineage)
 *   - Post loan details to state (Write API)
 *   - eKCC eligibility check
 *   - Scheme eligibility (PM-KISAN, PMFBY, KCC)
 *
 * ROOTS (P0-P1):
 *   - Farm geo-boundaries (replace manual GPS, saves ~15 min)
 *   - Village geo maps
 *   - Crop survey data, crop identification
 *   - Soil health (NPK, pH, organic carbon)
 *   - Survey number lookup
 *
 * SAGE/PULSE (P1):
 *   - Crop sown data (village-level, anonymised)
 *   - Crop area statistics
 *   - MSP/price support scheme data
 *   - e-Procurement data
 *
 * ACTIVATION: Set AGRISTACK_JWT_TOKEN env var + flip feature flags in config.
 */

const agristackConfig = require('./config/agristackConfig');
const farmerIdentity = require('./services/farmerIdentityService');
const landVerification = require('./services/landVerificationService');
const geoMaps = require('./services/geoMapsService');
const cropData = require('./services/cropDataService');
const loanAndScheme = require('./services/loanAndSchemeService');
const consentManager = require('./services/consentManagerService');
const networkDiscovery = require('./services/networkDiscoveryService');
const client = require('./services/agristackClient');

module.exports = {
  config: agristackConfig,
  client,
  farmerIdentity,
  landVerification,
  geoMaps,
  cropData,
  loanAndScheme,
  consentManager,
  networkDiscovery,
};
