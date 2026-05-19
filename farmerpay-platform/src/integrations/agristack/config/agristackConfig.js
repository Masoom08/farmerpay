/**
 * AgriStack UFSI Integration Configuration
 * Unified Farmer Service Interface — https://ufsi.agristack.gov.in/apispecs
 *
 * 25 API endpoints mapped to FarmerPay modules (Core, DICE, ROOTS, SAGE, PULSE, TRUST).
 * All free via UFSI. JWT token authentication. Consent required for PII.
 *
 * STATUS: Stubs — activate when sandbox access is granted.
 */

module.exports = {
  baseUrl: process.env.AGRISTACK_BASE_URL || 'https://ufsi.agristack.gov.in',
  jwtToken: process.env.AGRISTACK_JWT_TOKEN || null,
  clientId: process.env.AGRISTACK_CLIENT_ID || null,
  clientSecret: process.env.AGRISTACK_CLIENT_SECRET || null,

  // ─── API Endpoints (all 25) ───────────────────────────────────
  endpoints: {
    // P0 — Core Identity & Consent
    getFarmerId:         { path: '/agristack/get-farmer-id', method: 'POST', priority: 'P0', module: 'Core' },
    verifyFarmerId:      { path: '/agristack/verify_farmer_id', method: 'POST', priority: 'P0', module: 'Core' },
    farmerDetails:       { path: '/agristack/seek', mapperId: 'i2:o16', method: 'POST', priority: 'P0', module: 'Core/DICE' },
    consentRequest:      { path: '/cm/consentRequests', method: 'POST', priority: 'P0', module: 'Core' },
    consentArtifacts:    { path: '/cm/consentArtifacts', method: 'GET', priority: 'P0', module: 'Core' },
    serviceDiscovery:    { path: '/nm/serviceInfo', method: 'POST', priority: 'P0', module: 'Core' },
    getEntities:         { path: '/nm/getEntities', method: 'POST', priority: 'P0', module: 'Core' },

    // P0 — DICE Land & Loan
    landByAadhaar:       { path: '/agristack/seek', mapperId: 'i1:o1', method: 'POST', priority: 'P0', module: 'DICE' },
    verifyLand:          { path: '/agristack/verify-land', method: 'POST', priority: 'P0', module: 'DICE' },
    postFarmerLoan:      { path: '/agristack/farmer-loan', mapperId: 'i12:o17', method: 'POST', priority: 'P0', module: 'DICE' },

    // P0 — ROOTS Geo
    geoReferencedMaps:   { path: '/agristack/geo-referenced-maps', mapperId: 'i16:o21', method: 'POST', priority: 'P0', module: 'ROOTS' },
    villageGeoMaps:      { path: '/agristack/geo-referenced-maps', mapperId: 'i13:o18', method: 'POST', priority: 'P0', module: 'ROOTS' },

    // P1 — ROOTS/SAGE/PULSE Data
    cropSurveyData:      { path: '/agristack/crop-survey-data', method: 'POST', priority: 'P1', module: 'ROOTS' },
    cropSownData:        { path: '/agristack/seek', mapperId: 'i6:o2', method: 'POST', priority: 'P1', module: 'SAGE/PULSE' },
    cropAreaStats:       { path: '/agristack/seek', mapperId: 'i5:o5', method: 'POST', priority: 'P1', module: 'PULSE' },
    cropIdentification:  { path: '/agristack/seek', mapperId: 'i14:o8', method: 'POST', priority: 'P1', module: 'ROOTS' },
    soilHealth:          { path: '/agristack/seek', mapperId: 'i2:o14', method: 'POST', priority: 'P1', module: 'ROOTS/TRUST' },
    schemeEligibility:   { path: '/agristack/farmer-scheme-eligibility', mapperId: 'i18:o24', method: 'POST', priority: 'P1', module: 'DICE/SAGE' },
    mspPriceSupport:     { path: '/agristack/seek', mapperId: 'i9:o11', method: 'POST', priority: 'P1', module: 'PULSE' },
    farmerOwnedArea:     { path: '/agristack/seek', mapperId: 'i12:o20', method: 'POST', priority: 'P1', module: 'DICE' },
    bulkFarmerSync:      { path: '/agristack/seek', mapperId: 'i19:o26', method: 'POST', priority: 'P1', module: 'Core' },
    eKccEligibility:     { path: '/agristack/seek', mapperId: 'i4:o4v2', method: 'POST', priority: 'P1', module: 'DICE' },
    unifiedLandData:     { path: '/agristack/seek', mapperId: 'i10:o12', method: 'POST', priority: 'P1', module: 'DICE' },
    villageRorData:      { path: '/villageWiseRorData', method: 'POST', priority: 'P1', module: 'DICE' },

    // P2 — Supporting
    surveyNumbers:       { path: '/agristack/seek', mapperId: 'i11:o15', method: 'POST', priority: 'P2', module: 'ROOTS' },
    eProcurement:        { path: '/agristack/seek', mapperId: 'i7:o9', method: 'POST', priority: 'P2', module: 'PULSE' },
    landLineage:         { path: '/getParentFarmId', method: 'POST', priority: 'P2', module: 'DICE' },
  },

  // Feature flags — enable per-service when sandbox access granted
  features: {
    farmerIdentityEnabled: false,
    landVerificationEnabled: false,
    geoMapsEnabled: false,
    cropDataEnabled: false,
    schemeEligibilityEnabled: false,
    consentManagerEnabled: false,
    loanPostingEnabled: false,
    soilHealthEnabled: false,
    mspDataEnabled: false,
    bulkSyncEnabled: false,
  },
};
