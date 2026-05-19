'use strict';

/**
 * Phase 1 mock SAGE advisories.
 *
 * Inserts ~7 ₹-framed advisories for the first farmer in the system so the
 * SAGE feed UI has something to render before the Phase 2 generator exists.
 *
 * Every row is tagged source = 'mock_phase1' so Phase 2 can purge them
 * cleanly via:
 *
 *     DELETE FROM sage_advisories WHERE source = 'mock_phase1';
 *
 * Includes the two load-bearing patterns for the FarmerPay narrative:
 *   - Fund-diversion / loan misutilisation cross-check
 *   - Insurance nudge ("uninsured + district drought risk → PMFBY")
 */

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Pick the first active farmer-role user in the system.
    const [farmers] = await queryInterface.sequelize.query(`
      SELECT u.id
      FROM users u
      WHERE u.is_active = 1
      ORDER BY u.id ASC
      LIMIT 1
    `);

    if (!farmers || farmers.length === 0) {
      // Nothing to seed against — exit cleanly so this seeder is safe to
      // run on a fresh DB.
      return;
    }
    const farmerId = farmers[0].id;

    // Resolve a few advisory_type_ids by code so we can tag rows correctly.
    const [types] = await queryInterface.sequelize.query(`
      SELECT id, advisory_type_code FROM sage_advisory_types
    `);
    const typeIdByCode = {};
    for (const t of types) typeIdByCode[t.advisory_type_code] = t.id;

    const now = new Date();
    const eightDaysOut = new Date(now); eightDaysOut.setDate(eightDaysOut.getDate() + 8);
    const dueDateStr = eightDaysOut.toISOString().slice(0, 10);

    const advisories = [
      {
        type: 'pest_disease_alert',
        urgency: 'critical',
        title: 'Spray for stem borer in next 48 hours',
        body: 'Stem borer pressure rising in your village. Spray Cartap Hydrochloride 50 SP @ 1 g/L this week. Skipping = up to 30% yield loss.',
        rupeeImpact: '₹8,400 EMI at risk',
        icon: '🐛',
        ctaLabel: 'Mark as done',
        advisoryClass: 'pest_irrigation_action',
      },
      {
        type: 'weather_alert',
        urgency: 'high',
        title: 'Heavy rain expected Apr 12–14 — delay urea',
        body: 'Forecast: 60–80 mm rain over 3 days in your tehsil. Postpone urea top-dressing to Apr 15 to avoid wash-off.',
        rupeeImpact: 'Saves ~₹1,200 in wasted urea',
        icon: '🌧️',
        ctaLabel: 'Got it',
        advisoryClass: 'weather_protection',
      },
      {
        type: 'input_recommendation',
        urgency: 'medium',
        title: 'Cheaper DAP at FPO this week',
        body: 'Your FPO is selling DAP at ₹1,290/bag vs ₹1,450 at private dealers. 8 bags needed for your plot.',
        rupeeImpact: 'Saves ₹1,280 on inputs',
        icon: '🧪',
        ctaLabel: 'Mark as done',
        advisoryClass: 'input_cost_alert',
      },
      {
        type: 'input_recommendation',
        urgency: 'medium',
        title: 'Skip irrigation today — soil moisture is high',
        body: 'Soil moisture at your plot is 38% (high). Skipping today\'s irrigation saves ~2 hours of pump diesel and protects crop roots.',
        rupeeImpact: 'Saves ₹220 in diesel',
        icon: '💧',
        ctaLabel: 'Got it',
        advisoryClass: 'pest_irrigation_action',
      },
      {
        type: 'market_price_alert',
        urgency: 'high',
        title: 'Paddy mandi price up 6% this week — sell now',
        body: 'Local mandi paddy prices are at ₹2,180/qtl, the highest in 30 days. PULSE forecast says prices ease next week.',
        rupeeImpact: 'Extra ₹4,800 vs next week',
        icon: '📈',
        ctaLabel: 'Mark as done',
        advisoryClass: 'mandi_price_action',
      },
      {
        type: 'loan_reminder',
        urgency: 'high',
        title: 'State records show cotton in plot 67A — please confirm',
        body: 'AgriStack land records show cotton in your plot 67A but your KCC loan was issued for paddy. Please confirm with your field agent so we can update your file.',
        rupeeImpact: 'Protects ₹45,000 KCC',
        icon: '⚠️',
        ctaLabel: 'I\'ll confirm',
        advisoryClass: 'fund_diversion_confirmation',
        linkedEmiDueDate: dueDateStr,
      },
      {
        type: 'input_recommendation',
        urgency: 'high',
        title: 'Insure your paddy — district drought risk is HIGH',
        body: 'Your paddy (1.2 ha) is not insured. District drought risk is HIGH this kharif (SPI -1.4, low reservoir). A PMFBY policy costs ~₹480 and protects your ₹45,000 KCC. Tap to apply.',
        rupeeImpact: 'Protects ₹45,000 KCC for ₹480',
        icon: '🛡️',
        ctaLabel: 'Apply for PMFBY',
        ctaUrl: 'https://pmfby.gov.in',
        advisoryClass: 'insurance_nudge',
      },
    ];

    const rows = advisories.map((a) => ({
      advisory_uuid: uuidv4(),
      farmer_id: farmerId,
      advisory_type_id: typeIdByCode[a.type] || null,
      advisory_content: a.body,
      advisory_language: 'en',
      advisory_urgency: a.urgency,
      delivery_channel: 'in_app',
      delivered_at: now,
      action_taken_by_farmer: false,
      advisory_metadata: JSON.stringify({
        title: a.title,
        body: a.body,
        icon: a.icon,
        rupeeImpact: a.rupeeImpact,
        ctaLabel: a.ctaLabel,
        ctaUrl: a.ctaUrl || null,
        advisoryClass: a.advisoryClass,
        linkedEmiDueDate: a.linkedEmiDueDate || null,
      }),
      source: 'mock_phase1',
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('sage_advisories', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('sage_advisories', { source: 'mock_phase1' });
  },
};
