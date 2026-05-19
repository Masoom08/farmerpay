'use strict';

/**
 * Seed Package of Practices — Crop
 *
 * Extracts the hardcoded STAGES and TOUCHPOINTS arrays that lived in
 * farmer-app/app/(tabs)/farm.tsx into the activity_pop_stages and
 * activity_pop_touchpoints tables so the Farm tab can render them
 * data-driven.
 *
 * This seeder is idempotent: it uses bulk inserts gated on an existence
 * check, so re-running won't duplicate rows. The DOWN step wipes only
 * CROP rows so other activities aren't affected.
 */

const ACTIVITY = 'CROP';

const STAGES = [
  { stage_key: 'preparation',  stage_order: 1,  label_en: 'Land Prep',      label_hi: 'भूमि तैयारी',     icon: '🚜' },
  { stage_key: 'sowing',       stage_order: 2,  label_en: 'Sowing',         label_hi: 'बुवाई',           icon: '🌱' },
  { stage_key: 'irrigation1',  stage_order: 3,  label_en: '1st Irrigation', label_hi: 'पहली सिंचाई',     icon: '💧' },
  { stage_key: 'weeding',      stage_order: 4,  label_en: 'Weeding',        label_hi: 'निराई',           icon: '🌿' },
  { stage_key: 'fertiliser',   stage_order: 5,  label_en: 'Top Dressing',   label_hi: 'उर्वरक',          icon: '🧪' },
  { stage_key: 'pest',         stage_order: 6,  label_en: 'Pest Mgmt',      label_hi: 'कीट प्रबंधन',     icon: '🐛' },
  { stage_key: 'irrigation2',  stage_order: 7,  label_en: '2nd Irrigation', label_hi: 'दूसरी सिंचाई',    icon: '💧' },
  { stage_key: 'preharvest',   stage_order: 8,  label_en: 'Pre-Harvest',    label_hi: 'कटाई पूर्व',      icon: '👁️' },
  { stage_key: 'harvest',      stage_order: 9,  label_en: 'Harvest',        label_hi: 'कटाई',            icon: '🌾' },
  { stage_key: 'postharvest',  stage_order: 10, label_en: 'Post-Harvest',   label_hi: 'कटाई उपरांत',    icon: '📦' },
];

const TOUCHPOINTS = [
  { touchpoint_number: 1,  stage_key: 'preparation', name_en: 'Land Preparation' },
  { touchpoint_number: 2,  stage_key: 'sowing',      name_en: 'Sowing & Seed Treatment' },
  { touchpoint_number: 3,  stage_key: 'irrigation1', name_en: '1st Irrigation + Basal Fertiliser' },
  { touchpoint_number: 4,  stage_key: 'weeding',     name_en: 'Weeding + Herbicide' },
  { touchpoint_number: 5,  stage_key: 'fertiliser',  name_en: 'Top Dressing + 2nd Irrigation' },
  { touchpoint_number: 6,  stage_key: 'pest',        name_en: 'Pest/Disease Management' },
  { touchpoint_number: 7,  stage_key: 'irrigation2', name_en: '3rd Irrigation + Monitoring' },
  { touchpoint_number: 8,  stage_key: 'preharvest',  name_en: 'Pre-Harvest Assessment' },
  { touchpoint_number: 9,  stage_key: 'harvest',     name_en: 'Harvest' },
  { touchpoint_number: 10, stage_key: 'postharvest', name_en: 'Post-Harvest + Sale' },
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
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('activity_pop_touchpoints', { activity_code: ACTIVITY });
    await queryInterface.bulkDelete('activity_pop_stages', { activity_code: ACTIVITY });
  },
};
