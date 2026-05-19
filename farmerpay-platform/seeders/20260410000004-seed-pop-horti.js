'use strict';

/**
 * Seed Package of Practices — Horticulture
 *
 * Horti PoP follows the same operational care-domain model as Dairy/Fishery
 * but organised around the annual orchard cycle (pruning → flowering →
 * fruit-set → grow → harvest → post-harvest). Default mental model is
 * mango / citrus / banana — a permanent woody crop with a ~7-month grow
 * window and a ~3-month dormancy, which is how Indian smallholder horti
 * operations are structured.
 *
 * Cadences chosen to match the existing event-based tracking in the
 * horticulture module (HorticultureIrrigationLog, HorticultureInputLog,
 * HorticultureHealthRecord, HorticultureHarvest):
 *   DAILY      → harvest maturity checks at peak picking window
 *   WEEKLY     → orchard walks for flower/fruit/pest/irrigation
 *   MONTHLY    → fertigation, disease scouting, fruit thinning
 *   PER_EVENT  → pruning, post-harvest sale
 *
 * Tier semantics when rendered in farm.tsx:
 *   SMALL  (<0.5 ha)  → weekly scouting is the anchor; dailies collapsed.
 *   MEDIUM (0.5–2 ha) → weekly + monthly expanded.
 *   LARGE  (>2 ha)    → weekly bulk entry anchor, dailies collapsed.
 * (Note: no FarmerHorticultureProfile exists yet, so the UI defaults to
 * SMALL until a profile endpoint is added.)
 *
 * Idempotent: bulk inserts are gated by existence check; cadence
 * backfilled via UPDATE so re-running after a schema change still
 * converges state.
 */

const ACTIVITY = 'HORTI';

const STAGES = [
  { stage_key: 'pruning',      stage_order: 1,  label_en: 'Pruning',        label_hi: 'छंटाई',              icon: '✂️' },
  { stage_key: 'flowering',    stage_order: 2,  label_en: 'Flowering',      label_hi: 'फूल',                icon: '🌸' },
  { stage_key: 'fruit_set',    stage_order: 3,  label_en: 'Fruit Set',      label_hi: 'फल लगना',            icon: '🫐' },
  { stage_key: 'irrigation',   stage_order: 4,  label_en: 'Irrigation',     label_hi: 'सिंचाई',             icon: '💧' },
  { stage_key: 'fertigation',  stage_order: 5,  label_en: 'Fertigation',    label_hi: 'पोषण',               icon: '🧪' },
  { stage_key: 'pest',         stage_order: 6,  label_en: 'Pest Mgmt',      label_hi: 'कीट प्रबंधन',        icon: '🐛' },
  { stage_key: 'disease',      stage_order: 7,  label_en: 'Disease Mgmt',   label_hi: 'रोग प्रबंधन',        icon: '🍂' },
  { stage_key: 'thinning',     stage_order: 8,  label_en: 'Fruit Thinning', label_hi: 'फल पतलाना',          icon: '🍎' },
  { stage_key: 'harvest',      stage_order: 9,  label_en: 'Harvest',        label_hi: 'कटाई',               icon: '🧺' },
  { stage_key: 'post_harvest', stage_order: 10, label_en: 'Post-Harvest',   label_hi: 'कटाई उपरांत',        icon: '📦' },
];

const TOUCHPOINTS = [
  {
    touchpoint_number: 1,
    stage_key: 'pruning',
    cadence: 'PER_EVENT',
    name_en: 'Pruning & Canopy Management',
    name_hi: 'छंटाई व छत्र प्रबंधन',
    description_en: 'Annual — remove dead/crossing branches; open canopy for light penetration and air flow. Schedule post-harvest for mango, pre-flush for citrus.',
  },
  {
    touchpoint_number: 2,
    stage_key: 'flowering',
    cadence: 'WEEKLY',
    name_en: 'Flower Inspection & Pollinator Check',
    name_hi: 'फूल निरीक्षण',
    description_en: 'Weekly during bloom — assess bloom %, petal drop, pollinator activity; intervene with foliar spray if heavy drop.',
  },
  {
    touchpoint_number: 3,
    stage_key: 'fruit_set',
    cadence: 'WEEKLY',
    name_en: 'Fruit-Set Monitoring',
    name_hi: 'फल लगना निगरानी',
    description_en: 'Weekly post-bloom — record fruit-set %; mark stress signs (shedding, malformed fruit); assess first round of thinning.',
  },
  {
    touchpoint_number: 4,
    stage_key: 'irrigation',
    cadence: 'WEEKLY',
    name_en: 'Irrigation Scheduling',
    name_hi: 'सिंचाई योजना',
    description_en: 'Weekly — check soil moisture at root zone; adjust drip/flood cycle based on phenology stage and recent rainfall.',
  },
  {
    touchpoint_number: 5,
    stage_key: 'fertigation',
    cadence: 'MONTHLY',
    name_en: 'Nutrient Application (NPK + Micro)',
    name_hi: 'पोषक तत्व',
    description_en: 'Monthly — apply NPK split dose via fertigation or soil; add micronutrients (Zn, B, Ca) based on leaf analysis.',
  },
  {
    touchpoint_number: 6,
    stage_key: 'pest',
    cadence: 'WEEKLY',
    name_en: 'Pest Scouting & IPM',
    name_hi: 'कीट निगरानी',
    description_en: 'Weekly orchard walk — scout for scale, mites, fruit flies, thrips; treat only if ETL threshold exceeded to preserve beneficials.',
  },
  {
    touchpoint_number: 7,
    stage_key: 'disease',
    cadence: 'MONTHLY',
    name_en: 'Disease Scouting & Spray',
    name_hi: 'रोग निगरानी',
    description_en: 'Monthly — check for anthracnose, powdery mildew, canker, leaf spot; apply fungicide at first sign, rotate mode of action.',
  },
  {
    touchpoint_number: 8,
    stage_key: 'thinning',
    cadence: 'MONTHLY',
    name_en: 'Fruit Thinning & Sizing',
    name_hi: 'फल पतलाना',
    description_en: 'Monthly during grow phase — measure avg fruit size; thin undersized/damaged fruit to boost grade-A yield.',
  },
  {
    touchpoint_number: 9,
    stage_key: 'harvest',
    cadence: 'DAILY',
    name_en: 'Harvest Maturity Check & Picking',
    name_hi: 'पकने की जाँच व तुड़ाई',
    description_en: 'Daily during harvest window — test ripeness (colour, TSS, firmness); pick only mature fruit; cool chain within 2 h.',
  },
  {
    touchpoint_number: 10,
    stage_key: 'post_harvest',
    cadence: 'PER_EVENT',
    name_en: 'Post-Harvest Grading & Sale',
    name_hi: 'श्रेणीकरण व बिक्री',
    description_en: 'Per lot — grade fruit (A/B/C/reject), pack, cool-store; log yield kg, grade mix, sale price, and buyer type.',
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

    // Idempotent cadence backfill.
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
