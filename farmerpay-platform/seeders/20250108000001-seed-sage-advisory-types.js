/**
 * Seeder: SAGE Advisory Types
 * 9 advisory type definitions per FarmerPay Section 9.2 spec.
 */

'use strict';

const advisoryTypes = [
  {
    advisory_type_code: 'weather_alert',
    advisory_type_name: 'Weather Alert',
    advisory_category: 'weather',
    typical_urgency: 'high',
    description: 'Alerts triggered by extreme weather events (rain, drought, hail, frost, heat wave, flood) that may impact crops.',
  },
  {
    advisory_type_code: 'pest_disease_alert',
    advisory_type_name: 'Pest & Disease Alert',
    advisory_category: 'crop_health',
    typical_urgency: 'high',
    description: 'Alerts when pest or disease incidence is detected in the crop or reported in the region.',
  },
  {
    advisory_type_code: 'input_recommendation',
    advisory_type_name: 'Input Recommendation',
    advisory_category: 'farm_management',
    typical_urgency: 'medium',
    description: 'Recommendations for fertiliser, seed, pesticide, or other input application based on crop stage and conditions.',
  },
  {
    advisory_type_code: 'loan_reminder',
    advisory_type_name: 'Loan Reminder',
    advisory_category: 'financial',
    typical_urgency: 'medium',
    description: 'Reminders for upcoming EMI payments, loan maturity dates, or KCC renewal deadlines.',
  },
  {
    advisory_type_code: 'market_price_alert',
    advisory_type_name: 'Market Price Alert',
    advisory_category: 'market',
    typical_urgency: 'medium',
    description: 'Alerts when commodity prices hit farmer-set targets, spike, crash, or cross MSP thresholds. Linked to PULSE price predictions.',
  },
  {
    advisory_type_code: 'seasonal_guidance',
    advisory_type_name: 'Seasonal Guidance',
    advisory_category: 'farm_management',
    typical_urgency: 'low',
    description: 'Seasonal advisories for crop planning, sowing windows, and preparation activities based on agro-climatic zone.',
  },
  {
    advisory_type_code: 'harvest_timing_alert',
    advisory_type_name: 'Harvest Timing Alert',
    advisory_category: 'market',
    typical_urgency: 'high',
    description: 'Advisories on optimal harvest timing based on PULSE price forecasts. Triggered when price window is favourable or closing.',
  },
  {
    advisory_type_code: 'storage_recommendation',
    advisory_type_name: 'Storage Recommendation',
    advisory_category: 'market',
    typical_urgency: 'high',
    description: 'Post-harvest advisory recommending storage in registered warehouse when PULSE forecasts predict price increase. Includes nearest warehouse and expected gain.',
  },
  {
    advisory_type_code: 'topup_loan_eligible',
    advisory_type_name: 'Top-Up Loan Eligible',
    advisory_category: 'financial',
    typical_urgency: 'medium',
    description: 'Notification that the farmer is eligible for a DICE post-harvest top-up loan hypothecated against stored produce. Triggered when storing is more profitable than selling now.',
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = advisoryTypes.map((t) => ({
      ...t,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('sage_advisory_types', rows, {
      ignoreDuplicates: true,
    });
  },

  async down(queryInterface) {
    const codes = advisoryTypes.map((t) => t.advisory_type_code);
    await queryInterface.bulkDelete('sage_advisory_types', {
      advisory_type_code: codes,
    });
  },
};
