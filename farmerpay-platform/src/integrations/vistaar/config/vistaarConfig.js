/**
 * Vistaar Integration Configuration
 * Bharat Vistaar (https://vistaar.da.gov.in) — Govt of India Digital Agriculture Platform
 *
 * STATUS: Stub — APIs not yet publicly available. When Vistaar opens APIs,
 * configure endpoints and auth here. FarmerPay modules (SAGE, PULSE, DICE)
 * will consume data via the adapter services in this directory.
 *
 * DO NOT BUILD in-house:
 *   - Generic crop advisory (use Vistaar Bharati AI + ICAR POP)
 *   - Standalone weather alerts (use Vistaar IMD feeds)
 *   - Government scheme rule engine (use Vistaar + AgriStack UFSI)
 *   - Generic voice advisory IVR (use Vistaar 155261 helpline)
 *
 * BUILD on top of Vistaar data:
 *   - SAGE: farm-specific context (crop stage, field history, ROOTS data)
 *   - PULSE: ML price forecasting (7/14/30-day), sell/hold recommendation
 *   - SAGE: pest alert + crop stage + treatment recommendation
 */

module.exports = {
  // Base URL — will be updated when Vistaar opens public APIs
  baseUrl: process.env.VISTAAR_API_URL || 'https://vistaar.da.gov.in/api',

  // Auth — TBD based on Vistaar API authentication method
  apiKey: process.env.VISTAAR_API_KEY || null,
  authMethod: 'none', // 'api_key' | 'oauth2' | 'none' — TBD

  // Service endpoints — stubs until API discovery
  endpoints: {
    cropAdvisory: '/advisory/crop',
    weatherAlert: '/weather/alert',
    pestSurveillance: '/pest/surveillance',
    mandiPrices: '/mandi/prices',
    schemeEligibility: '/scheme/eligibility',
    schemeStatus: '/scheme/status',
    icarKnowledge: '/icar/pop',
  },

  // Polling intervals (when APIs become available)
  syncIntervals: {
    weatherAlerts: '1h',      // Hourly weather refresh
    mandiPrices: '4h',        // 4-hourly mandi price refresh
    pestSurveillance: '24h',  // Daily pest surveillance
    schemeStatus: '24h',      // Daily scheme status check
  },

  // Feature flags — enable when Vistaar APIs go live
  features: {
    cropAdvisoryEnabled: false,
    weatherAlertsEnabled: false,
    mandiPricesEnabled: false,
    pestSurveillanceEnabled: false,
    schemeTrackingEnabled: false,
  },

  // Mapping: Vistaar service → FarmerPay module
  moduleMapping: {
    'crop_advisory': { module: 'SAGE', table: 'sage_advisories', action: 'DO_NOT_BUILD_USE_VISTAAR' },
    'weather_alerts': { module: 'SAGE', table: 'sage_weather_events', action: 'CONSUME_AND_ENHANCE' },
    'mandi_prices': { module: 'PULSE', table: 'pulse_price_records', action: 'CONSUME_AND_ENHANCE' },
    'pest_surveillance': { module: 'SAGE', table: 'sage_crop_health_observations', action: 'CONSUME_AND_ENHANCE' },
    'scheme_eligibility': { module: 'DICE', table: 'farmer_scheme_enrollments', action: 'DO_NOT_BUILD_USE_VISTAAR' },
    'icar_pop': { module: 'ROOTS', table: 'package_of_practices', action: 'COMPLEMENTARY' },
    'voice_ivr': { module: 'SAGE', table: null, action: 'DO_NOT_BUILD_USE_VISTAAR_155261' },
    'grievance': { module: null, table: null, action: 'OUT_OF_SCOPE' },
    'multilingual': { module: 'Core', table: null, action: 'USE_BHASHINI_DIRECTLY' },
  },
};
