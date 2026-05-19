'use strict';

/**
 * Seed Package of Practices — Dairy (Option B: operational recurring-care model)
 *
 * Dairy PoP is structurally different from Crop: it's cyclic/continuous
 * rather than seasonal-linear. For smallholder farmers (1–5 milch animals,
 * which matches all demo personas in farmer_dairy_profiles), a per-animal
 * lactation-cycle model is overkill. Instead, this seeder models dairy PoP
 * as ten operational care domains the farmer cycles through on a daily /
 * weekly / quarterly cadence.
 *
 * The Farm tab compliance score for Dairy = average adherence across
 * these ten care domains. A farmer who feeds + milks hygienically + logs
 * yield + vaccinates on schedule scores high; a farmer who skips vet
 * visits and deworming scores low.
 *
 * Important: this seeder ONLY writes to activity_pop_stages and
 * activity_pop_touchpoints (tables created in Phase 1). It does NOT
 * modify any of the existing v2 dairy tables (profiles, animals, cost
 * events, revenue events, breeding, treatment, recurring templates, P&L)
 * which continue to serve the financial logbook UX.
 *
 * Idempotent: re-running won't duplicate rows (existence-check gated).
 */

const ACTIVITY = 'DAIRY';

const STAGES = [
  { stage_key: 'feeding',       stage_order: 1,  label_en: 'Feeding',         label_hi: 'आहार',            icon: '🌾' },
  { stage_key: 'water_hygiene', stage_order: 2,  label_en: 'Water & Hygiene', label_hi: 'जल व स्वच्छता',  icon: '💧' },
  { stage_key: 'milking',       stage_order: 3,  label_en: 'Milking',         label_hi: 'दूध निकालना',      icon: '🥛' },
  { stage_key: 'housing',       stage_order: 4,  label_en: 'Shed & Housing',  label_hi: 'गौशाला',           icon: '🏠' },
  { stage_key: 'breeding',      stage_order: 5,  label_en: 'Breeding',        label_hi: 'प्रजनन',           icon: '💕' },
  { stage_key: 'health',        stage_order: 6,  label_en: 'Health & Vet',    label_hi: 'स्वास्थ्य',        icon: '🩺' },
  { stage_key: 'vaccination',   stage_order: 7,  label_en: 'Vaccination',     label_hi: 'टीकाकरण',         icon: '💉' },
  { stage_key: 'deworming',     stage_order: 8,  label_en: 'Deworming',       label_hi: 'कृमिनाशक',        icon: '💊' },
  { stage_key: 'yield_log',     stage_order: 9,  label_en: 'Yield Logging',   label_hi: 'उत्पादन',          icon: '📊' },
  { stage_key: 'fodder_plan',   stage_order: 10, label_en: 'Fodder Planning', label_hi: 'चारा योजना',       icon: '🌿' },
];

// Touchpoints are concrete, loggable checkpoints the farmer / field agent
// can mark as DONE. Each maps to a stage so the timeline highlights the
// "current" stage based on which touchpoint is CURRENT.
//
// Cadences are advisory (daily/weekly/quarterly); stored in description_en
// until we add a dedicated cadence column.
// Cadence drives tier-aware fatigue reduction (SMALL herds: daily essentials
// only; MEDIUM: daily + weekly; LARGE: weekly bulk entry). See farm.tsx.
const TOUCHPOINTS = [
  {
    touchpoint_number: 1,
    stage_key: 'feeding',
    cadence: 'DAILY',
    name_en: 'Green Fodder Sufficiency',
    name_hi: 'हरा चारा पर्याप्तता',
    description_en: 'Daily — 15–20 kg green fodder per adult animal. Log any shortfall.',
  },
  {
    touchpoint_number: 2,
    stage_key: 'feeding',
    cadence: 'DAILY',
    name_en: 'Concentrate Feed Ration',
    name_hi: 'दाना राशन',
    description_en: 'Daily — 1 kg concentrate per 2.5 L milk produced; check for mould and quality.',
  },
  {
    touchpoint_number: 3,
    stage_key: 'water_hygiene',
    cadence: 'DAILY',
    name_en: 'Clean Water Availability',
    name_hi: 'स्वच्छ जल',
    description_en: 'Daily — clean drinking water at all times; wash trough every 2 days.',
  },
  {
    touchpoint_number: 4,
    stage_key: 'milking',
    cadence: 'DAILY',
    name_en: 'Udder Cleaning & Hygienic Milking',
    name_hi: 'थन सफाई व दूध निकालना',
    description_en: 'Every milking — wash udder, dry with clean cloth, strip-cup test for mastitis.',
  },
  {
    touchpoint_number: 5,
    stage_key: 'housing',
    cadence: 'DAILY',
    name_en: 'Shed Cleaning & Bedding',
    name_hi: 'गौशाला सफाई',
    description_en: 'Daily — remove dung, replace bedding weekly; ensure ventilation and shade.',
  },
  {
    touchpoint_number: 6,
    stage_key: 'breeding',
    cadence: 'WEEKLY',
    name_en: 'Heat Detection & Breeding Record',
    name_hi: 'गर्मी पहचान व प्रजनन रिकॉर्ड',
    description_en: 'Monitor heat signs every 21 days; log AI/natural service and due dates.',
  },
  {
    touchpoint_number: 7,
    stage_key: 'health',
    cadence: 'MONTHLY',
    name_en: 'Routine Vet Checkup',
    name_hi: 'नियमित पशु चिकित्सक जाँच',
    description_en: 'Monthly — vet visit for health review, body condition scoring, early disease detection.',
  },
  {
    touchpoint_number: 8,
    stage_key: 'vaccination',
    cadence: 'QUARTERLY',
    name_en: 'FMD / HS / BQ Vaccination',
    name_hi: 'एफएमडी/एचएस/बीक्यू टीकाकरण',
    description_en: 'Per schedule — FMD twice yearly; HS & BQ annually before monsoon.',
  },
  {
    touchpoint_number: 9,
    stage_key: 'deworming',
    cadence: 'QUARTERLY',
    name_en: 'Quarterly Deworming',
    name_hi: 'त्रैमासिक कृमिनाशक',
    description_en: 'Every 3 months — broad-spectrum dewormer; rotate drug class yearly.',
  },
  {
    touchpoint_number: 10,
    stage_key: 'yield_log',
    cadence: 'DAILY',
    name_en: 'Daily Milk Yield Logging',
    name_hi: 'दैनिक दूध लॉग',
    description_en: 'Daily — log morning + evening yield per animal; cross-check with cooperative receipts.',
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ─── Stages ───
    const [existingStages] = await queryInterface.sequelize.query(
      `SELECT stage_key FROM activity_pop_stages WHERE activity_code = ?`,
      { replacements: [ACTIVITY] }
    );
    const existingStageKeys = new Set(existingStages.map((r) => r.stage_key));
    const stageRows = STAGES
      .filter((s) => !existingStageKeys.has(s.stage_key))
      .map((s) => ({
        activity_code: ACTIVITY,
        ...s,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));
    if (stageRows.length) {
      await queryInterface.bulkInsert('activity_pop_stages', stageRows);
    }

    // ─── Touchpoints ───
    const [existingTps] = await queryInterface.sequelize.query(
      `SELECT touchpoint_number FROM activity_pop_touchpoints WHERE activity_code = ?`,
      { replacements: [ACTIVITY] }
    );
    const existingTpNumbers = new Set(existingTps.map((r) => r.touchpoint_number));
    const tpRows = TOUCHPOINTS
      .filter((t) => !existingTpNumbers.has(t.touchpoint_number))
      .map((t) => ({
        activity_code: ACTIVITY,
        ...t,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));
    if (tpRows.length) {
      await queryInterface.bulkInsert('activity_pop_touchpoints', tpRows);
    }

    // Backfill cadence on already-inserted rows (safe re-run after the
    // cadence migration added the column).
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
