'use strict';

/**
 * Seed Package of Practices — Goatery (Small Ruminants)
 *
 * Goatery follows the Dairy-style operational recurring-care model:
 * daily feeding / watering / shed cleaning, weekly grazing + breeding
 * observation, quarterly deworming + vaccination, per-kidding tracking.
 * Default mental model is breed-agnostic smallholder herds (5–20 animals)
 * — the ICAR-CIRG Makhdoom extension defaults for Sirohi / Beetal /
 * Jamunapari / Black Bengal work as a common baseline.
 *
 * Tier semantics when rendered in farm.tsx (Goatery tab):
 *   SMALL  (<10 head, household)        → weekly check anchor.
 *   MEDIUM (10–30 head)                 → daily + weekly expanded.
 *   LARGE  (>30 head, commercial)       → weekly bulk entry anchor,
 *                                          dailies collapsed by default.
 * No FarmerGoateryProfile exists yet, so the UI defaults to SMALL.
 *
 * Cadences:
 *   DAILY      → grazing, feed, water, shed, mortality
 *   WEEKLY     → breeding check, weight sampling
 *   MONTHLY    → hoof care, ectoparasite check
 *   QUARTERLY  → deworming + PPR/FMD vaccination
 *   PER_EVENT  → kidding, sale
 *
 * Idempotent: bulk inserts gated by existence check; cadence backfilled.
 */

const ACTIVITY = 'GOATERY';

const STAGES = [
  { stage_key: 'grazing',      stage_order: 1,  label_en: 'Grazing & Browse', label_hi: 'चराई',               icon: '🌿' },
  { stage_key: 'feeding',      stage_order: 2,  label_en: 'Stall Feeding',    label_hi: 'बाड़े में आहार',     icon: '🌾' },
  { stage_key: 'water',        stage_order: 3,  label_en: 'Water & Hygiene',  label_hi: 'जल व स्वच्छता',      icon: '💧' },
  { stage_key: 'housing',      stage_order: 4,  label_en: 'Shed & Housing',   label_hi: 'बाड़ा',               icon: '🏠' },
  { stage_key: 'breeding',     stage_order: 5,  label_en: 'Breeding',         label_hi: 'प्रजनन',             icon: '💕' },
  { stage_key: 'kidding',      stage_order: 6,  label_en: 'Kidding Care',     label_hi: 'मेमना देखभाल',       icon: '🐐' },
  { stage_key: 'health',       stage_order: 7,  label_en: 'Health',           label_hi: 'स्वास्थ्य',          icon: '🩺' },
  { stage_key: 'vaccination',  stage_order: 8,  label_en: 'Vaccination',      label_hi: 'टीकाकरण',            icon: '💉' },
  { stage_key: 'deworming',    stage_order: 9,  label_en: 'Deworming',        label_hi: 'कृमिनाशक',           icon: '💊' },
  { stage_key: 'sale',         stage_order: 10, label_en: 'Sale & Records',   label_hi: 'बिक्री रिकॉर्ड',     icon: '📊' },
];

const TOUCHPOINTS = [
  {
    touchpoint_number: 1,
    stage_key: 'grazing',
    cadence: 'DAILY',
    name_en: 'Grazing / Browse Routine',
    name_hi: 'चराई व ब्राउज़',
    description_en: 'Daily — 5–6 h grazing on diverse pasture/browse species; prefer tree-leaf browse (subabul, neem, drumstick) for protein.',
  },
  {
    touchpoint_number: 2,
    stage_key: 'feeding',
    cadence: 'DAILY',
    name_en: 'Stall-Feed Supplement',
    name_hi: 'बाड़े में चारा',
    description_en: 'Daily — 300–500 g concentrate + green fodder top-up; raise concentrate for lactating/pregnant does and fattening kids.',
  },
  {
    touchpoint_number: 3,
    stage_key: 'water',
    cadence: 'DAILY',
    name_en: 'Clean Water Availability',
    name_hi: 'स्वच्छ जल',
    description_en: 'Daily — fresh water 2–3 L/head; wash trough daily in summer; add mineral mixture lick in shed.',
  },
  {
    touchpoint_number: 4,
    stage_key: 'housing',
    cadence: 'DAILY',
    name_en: 'Shed Cleaning & Bedding',
    name_hi: 'बाड़ा सफाई',
    description_en: 'Daily — remove droppings, keep floor dry; ensure raised platform / good ventilation to prevent pneumonia.',
  },
  {
    touchpoint_number: 5,
    stage_key: 'health',
    cadence: 'DAILY',
    name_en: 'Mortality & Morbidity Walk',
    name_hi: 'स्वास्थ्य निगरानी',
    description_en: 'Daily — observe herd for coughing, diarrhoea, off-feed, lameness; isolate and treat early; log mortality.',
  },
  {
    touchpoint_number: 6,
    stage_key: 'breeding',
    cadence: 'WEEKLY',
    name_en: 'Heat Detection & Breeding Record',
    name_hi: 'गर्मी व प्रजनन',
    description_en: 'Weekly — monitor heat signs every 18–21 days; log buck service / AI date, expected kidding (150 days).',
  },
  {
    touchpoint_number: 7,
    stage_key: 'kidding',
    cadence: 'PER_EVENT',
    name_en: 'Kidding Care & Colostrum',
    name_hi: 'मेमना जन्म',
    description_en: 'Per kidding — ensure colostrum within 1 h, disinfect navel, weigh kid, log birth; watch for weak kids and retained placenta.',
  },
  {
    touchpoint_number: 8,
    stage_key: 'vaccination',
    cadence: 'QUARTERLY',
    name_en: 'PPR / FMD / ET Vaccination',
    name_hi: 'पीपीआर/एफएमडी टीकाकरण',
    description_en: 'Per schedule — PPR annually, FMD twice yearly, Enterotoxaemia + HS before monsoon; log vaccine lot + date.',
  },
  {
    touchpoint_number: 9,
    stage_key: 'deworming',
    cadence: 'QUARTERLY',
    name_en: 'Quarterly Deworming',
    name_hi: 'त्रैमासिक कृमिनाशक',
    description_en: 'Every 3 months — broad-spectrum dewormer (albendazole / fenbendazole); rotate drug class yearly to avoid resistance.',
  },
  {
    touchpoint_number: 10,
    stage_key: 'sale',
    cadence: 'PER_EVENT',
    name_en: 'Sale, Weighing & Record',
    name_hi: 'बिक्री व वजन',
    description_en: 'Per sale — weigh animal, log age, sex, body weight, sale price, buyer; track margin vs input cost per head.',
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
