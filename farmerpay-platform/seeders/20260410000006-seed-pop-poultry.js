'use strict';

/**
 * Seed Package of Practices — Poultry
 *
 * Poultry is a cyclic operational model similar to Dairy/Fishery:
 * daily feeding / watering / mortality checks, weekly biosecurity +
 * weight gain sampling, periodic vaccination and deworming. Default
 * mental model is layer + broiler smallholder farms (ICAR-CARI /
 * CPDO Karnataka extension defaults for backyard + small commercial
 * birds), which covers ~all Indian smallholder poultry operations.
 *
 * Tier semantics when rendered in farm.tsx (Poultry tab):
 *   SMALL  (<100 birds, backyard)       → weekly check anchor.
 *   MEDIUM (100–500 birds)              → daily + weekly routine.
 *   LARGE  (>500 birds, commercial)     → weekly bulk entry anchor,
 *                                          dailies collapsed by default.
 * No FarmerPoultryProfile exists yet, so the UI defaults to SMALL.
 *
 * Cadences:
 *   DAILY      → feed, water, mortality, lighting
 *   WEEKLY     → biosecurity, litter, weight gain
 *   MONTHLY    → deworming, weighing for FCR calibration
 *   QUARTERLY  → vaccination schedule touchpoint (ND/IB/Gumboro)
 *   PER_EVENT  → chick stocking, final sale
 *
 * Idempotent: bulk inserts gated by existence check; cadence backfilled.
 */

const ACTIVITY = 'POULTRY';

const STAGES = [
  { stage_key: 'shed_prep',    stage_order: 1,  label_en: 'Shed Prep',        label_hi: 'शेड तैयारी',         icon: '🏠' },
  { stage_key: 'stocking',     stage_order: 2,  label_en: 'Chick Stocking',   label_hi: 'चूजा संचय',           icon: '🐤' },
  { stage_key: 'feeding',      stage_order: 3,  label_en: 'Feeding',          label_hi: 'आहार',               icon: '🌾' },
  { stage_key: 'water',        stage_order: 4,  label_en: 'Water & Hygiene',  label_hi: 'जल व स्वच्छता',      icon: '💧' },
  { stage_key: 'biosecurity',  stage_order: 5,  label_en: 'Biosecurity',      label_hi: 'जैव सुरक्षा',        icon: '🛡️' },
  { stage_key: 'health',       stage_order: 6,  label_en: 'Health & Mortality',label_hi: 'स्वास्थ्य',         icon: '🩺' },
  { stage_key: 'vaccination',  stage_order: 7,  label_en: 'Vaccination',      label_hi: 'टीकाकरण',            icon: '💉' },
  { stage_key: 'weight_gain',  stage_order: 8,  label_en: 'Weight / FCR',     label_hi: 'वजन / FCR',          icon: '⚖️' },
  { stage_key: 'harvest',      stage_order: 9,  label_en: 'Sale / Egg Log',   label_hi: 'बिक्री / अंडा',      icon: '🥚' },
  { stage_key: 'cleanout',     stage_order: 10, label_en: 'Cleanout',         label_hi: 'सफाई',               icon: '🧹' },
];

const TOUCHPOINTS = [
  {
    touchpoint_number: 1,
    stage_key: 'shed_prep',
    cadence: 'PER_EVENT',
    name_en: 'Shed Disinfection & Brooding Setup',
    name_hi: 'शेड सफाई व ब्रूडर',
    description_en: 'Per batch — fumigate shed, set up brooder (32 °C for week 1, step down 3 °C/week), fresh litter 5–7 cm.',
  },
  {
    touchpoint_number: 2,
    stage_key: 'stocking',
    cadence: 'PER_EVENT',
    name_en: 'Day-Old Chick Stocking',
    name_hi: 'चूजा रिसेप्शन',
    description_en: 'Per batch — receive chicks from hatchery, count, check vigour, provide glucose + electrolytes for first 24 h.',
  },
  {
    touchpoint_number: 3,
    stage_key: 'feeding',
    cadence: 'DAILY',
    name_en: 'Daily Feed Ration',
    name_hi: 'दैनिक आहार',
    description_en: 'Daily — starter (0–3 wk), grower (3–6 wk), finisher (6+ wk); ad-lib feed; log kg and cost.',
  },
  {
    touchpoint_number: 4,
    stage_key: 'water',
    cadence: 'DAILY',
    name_en: 'Water Availability & Cleaning',
    name_hi: 'स्वच्छ जल',
    description_en: 'Daily — fresh water at all times (2–2.5× feed), clean drinkers twice a day, chlorinate source weekly.',
  },
  {
    touchpoint_number: 5,
    stage_key: 'health',
    cadence: 'DAILY',
    name_en: 'Mortality & Morbidity Check',
    name_hi: 'मृत्यु व रोग जाँच',
    description_en: 'Daily — walk shed, log mortality count, isolate sick birds; escalate to vet if mortality >1%/day.',
  },
  {
    touchpoint_number: 6,
    stage_key: 'biosecurity',
    cadence: 'WEEKLY',
    name_en: 'Biosecurity & Litter Management',
    name_hi: 'जैव सुरक्षा व बिछावन',
    description_en: 'Weekly — footbath refresh, visitor log, rodent/wild-bird control; turn litter, top up to keep dry.',
  },
  {
    touchpoint_number: 7,
    stage_key: 'weight_gain',
    cadence: 'WEEKLY',
    name_en: 'Weekly Weight Sampling',
    name_hi: 'वजन नमूना',
    description_en: 'Weekly — weigh 20–30 random birds; track avg weight vs standard curve; recalibrate feed against FCR target.',
  },
  {
    touchpoint_number: 8,
    stage_key: 'vaccination',
    cadence: 'QUARTERLY',
    name_en: 'Vaccination (ND / IB / Gumboro)',
    name_hi: 'टीकाकरण',
    description_en: 'Per schedule — ND F1/Lasota (day 7 + booster), Gumboro (day 14 + 28), IB as per region; log vaccine, route, dose.',
  },
  {
    touchpoint_number: 9,
    stage_key: 'harvest',
    cadence: 'DAILY',
    name_en: 'Egg Collection / Sale Log',
    name_hi: 'अंडा / बिक्री लॉग',
    description_en: 'Daily — for layers, collect eggs 2–3×/day, log count + weight; for broilers, log body weight + sale lot + buyer + price.',
  },
  {
    touchpoint_number: 10,
    stage_key: 'cleanout',
    cadence: 'PER_EVENT',
    name_en: 'Shed Cleanout & Rest Period',
    name_hi: 'सफाई व विश्राम',
    description_en: 'Per batch — remove litter, scrub + disinfect shed, rest 10–14 days before next batch for disease break.',
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existingStages] = await queryInterface.sequelize.query(
      `SELECT stage_key FROM activity_pop_stages WHERE activity_code = ?`,
      { replacements: [ACTIVITY] }
    );
    const existingStageKeys = new Set(existingStages.map((r) => r.stage_key));
    const stageRows = STAGES
      .filter((s) => !existingStageKeys.has(s.stage_key))
      .map((s) => ({ activity_code: ACTIVITY, ...s, is_active: true, created_at: now, updated_at: now }));
    if (stageRows.length) {
      await queryInterface.bulkInsert('activity_pop_stages', stageRows);
    }

    const [existingTps] = await queryInterface.sequelize.query(
      `SELECT touchpoint_number FROM activity_pop_touchpoints WHERE activity_code = ?`,
      { replacements: [ACTIVITY] }
    );
    const existingTpNumbers = new Set(existingTps.map((r) => r.touchpoint_number));
    const tpRows = TOUCHPOINTS
      .filter((t) => !existingTpNumbers.has(t.touchpoint_number))
      .map((t) => ({ activity_code: ACTIVITY, ...t, is_active: true, created_at: now, updated_at: now }));
    if (tpRows.length) {
      await queryInterface.bulkInsert('activity_pop_touchpoints', tpRows);
    }

    for (const t of TOUCHPOINTS) {
      await queryInterface.sequelize.query(
        `UPDATE activity_pop_touchpoints
           SET cadence = ?, updated_at = ?
         WHERE activity_code = ? AND touchpoint_number = ? AND (cadence IS NULL OR cadence <> ?)`,
        { replacements: [t.cadence, now, ACTIVITY, t.touchpoint_number, t.cadence] }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('activity_pop_touchpoints', { activity_code: ACTIVITY });
    await queryInterface.bulkDelete('activity_pop_stages', { activity_code: ACTIVITY });
  },
};
