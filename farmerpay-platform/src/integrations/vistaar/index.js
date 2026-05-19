/**
 * Vistaar Integration Module
 *
 * Bharat Vistaar (https://vistaar.da.gov.in) — Govt of India Digital Agriculture Platform
 *
 * This module provides adapter stubs for 5 Vistaar services that FarmerPay
 * will consume when APIs become publicly available:
 *
 * 1. Crop Advisory (→ SAGE) — DO NOT BUILD generic, use Vistaar
 * 2. Weather Alerts (→ SAGE) — Consume + enhance with crop-stage context
 * 3. Mandi Prices (→ PULSE) — Consume raw + add ML forecasting
 * 4. Pest Surveillance (→ SAGE) — Consume + enhance with farm context
 * 5. Scheme Eligibility (→ DICE) — DO NOT BUILD, use Vistaar + AgriStack
 *
 * NOT INTEGRATED (use Vistaar directly, no FarmerPay wrapper):
 * 6. Multilingual — FarmerPay uses Bhashini directly
 * 7. Voice IVR — Use Vistaar 155261 helpline; FarmerPay IVR for financial only
 * 8. ICAR POP — FarmerPay ROOTS has deeper POP (complementary)
 * 9. Grievance — Outside FarmerPay scope
 *
 * ACTIVATION: Set feature flags in vistaarConfig.js when APIs go live.
 */

const vistaarConfig = require('./config/vistaarConfig');
const cropAdvisoryService = require('./services/vistaarCropAdvisoryService');
const weatherService = require('./services/vistaarWeatherService');
const mandiPriceService = require('./services/vistaarMandiPriceService');
const pestSurveillanceService = require('./services/vistaarPestSurveillanceService');
const schemeService = require('./services/vistaarSchemeService');

module.exports = {
  config: vistaarConfig,
  cropAdvisory: cropAdvisoryService,
  weather: weatherService,
  mandiPrices: mandiPriceService,
  pestSurveillance: pestSurveillanceService,
  schemes: schemeService,
};
