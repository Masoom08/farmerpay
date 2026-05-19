'use strict';

/**
 * Seed Package of Practices — Vegetables
 *
 * Separate from HORTI (which is modelled on perennial orchard crops —
 * mango / citrus / banana — with a 7-month grow + 3-month dormancy cycle).
 *
 * Vegetables are short-cycle (60–120 day) annuals and need a different
 * operational model: nursery + transplant + frequent scouting. Default
 * mental model is IIVR's mandate crops — tomato, brinjal, okra, chilli,
 * cucurbits (cucumber, gourds, pumpkin), cole crops (cabbage, cauliflower),
 * which is how Indian smallholder kitchen-garden and market-garden vegetable
 * operations are structured.
 *
 * References (informational, not fetched at seed time):
 *   • ICAR-IIVR Varanasi        — https://icariivr.org.in (mandate crops)
 *   • ICAR-IIHR Bengaluru       — vegetables PoP bulletins
 *   • State Agri University PoP — crop-specific extension handbooks
 *
 * Cadences map directly to the event-based tracking the farmer app already
 * uses (Crop log entries can be reused here):
 *   DAILY      → harvest maturity + irrigation check during fruiting
 *   WEEKLY     → pest scouting, foliar spray, fertigation adjustment
 *   MONTHLY    → soil/nutrient audit, mulch refresh
 *   PER_EVENT  → land prep, nursery, transplant, final harvest, sale
 *
 * Tier semantics when rendered in farm.tsx (Horticulture → Vegetables
 * sub-tab):
 *   SMALL  (<0.25 ha, kitchen garden)  → weekly scouting anchor.
 *   MEDIUM (0.25–1 ha, market garden)  → daily + weekly expanded.
 *   LARGE  (>1 ha, commercial veg)     → weekly bulk entry, dailies
 *                                         collapsed by default.
 * No FarmerVegetableProfile exists yet, so the UI defaults to SMALL
 * until a profile endpoint is added.
 *
 * Idempotent: bulk inserts are gated by existence check; cadence
 * backfilled via UPDATE so re-running after a schema change still
 * converges state.
 */

const ACTIVITY = 'VEG';

const STAGES = [
  { stage_key: 'land_prep',    stage_order: 1,  label_en: 'Land Preparation', label_hi: 'भूमि तैयारी',        icon: '🪓' },
  { stage_key: 'nursery',      stage_order: 2,  label_en: 'Nursery',          label_hi: 'नर्सरी',             icon: '🌱' },
  { stage_key: 'transplant',   stage_order: 3,  label_en: 'Transplanting',    label_hi: 'रोपाई',              icon: '🌿' },
  { stage_key: 'irrigation',   stage_order: 4,  label_en: 'Irrigation',       label_hi: 'सिंचाई',             icon: '💧' },
  { stage_key: 'fertigation',  stage_order: 5,  label_en: 'Nutrient Mgmt',    label_hi: 'पोषण',               icon: '🧪' },
  { stage_key: 'pest',         stage_order: 6,  label_en: 'Pest Mgmt',        label_hi: 'कीट प्रबंधन',        icon: '🐛' },
  { stage_key: 'disease',      stage_order: 7,  label_en: 'Disease Mgmt',     label_hi: 'रोग प्रबंधन',        icon: '🍂' },
  { stage_key: 'weeding',      stage_order: 8,  label_en: 'Weeding & Mulch',  label_hi: 'निराई व मल्च',       icon: '🌾' },
  { stage_key: 'harvest',      stage_order: 9,  label_en: 'Harvest',          label_hi: 'कटाई',               icon: '🧺' },
  { stage_key: 'post_harvest', stage_order: 10, label_en: 'Post-Harvest',     label_hi: 'कटाई उपरांत',        icon: '📦' },
];

const TOUCHPOINTS = [
  {
    touchpoint_number: 1,
    stage_key: 'land_prep',
    cadence: 'PER_EVENT',
    name_en: 'Ploughing, FYM & Bed Formation',
    name_hi: 'जुताई, गोबर व क्यारी',
    description_en: 'Per cycle — 2–3 ploughings, mix 10–15 t/ha FYM, form raised beds (for tomato/brinjal) or ridges (for cucurbits). Record soil test if done.',
  },
  {
    touchpoint_number: 2,
    stage_key: 'nursery',
    cadence: 'PER_EVENT',
    name_en: 'Nursery Raising & Seedling Care',
    name_hi: 'नर्सरी व पौध देखभाल',
    description_en: 'Per cycle — 25–30 day nursery for tomato/brinjal/chilli/cole crops; treat seed (Trichoderma/Captan); harden seedlings before transplant.',
  },
  {
    touchpoint_number: 3,
    stage_key: 'transplant',
    cadence: 'PER_EVENT',
    name_en: 'Transplanting & Spacing',
    name_hi: 'रोपाई व दूरी',
    description_en: 'Per cycle — transplant in evening, maintain recommended spacing (tomato 60×45 cm, brinjal 75×60 cm, chilli 60×45 cm); light irrigation right after.',
  },
  {
    touchpoint_number: 4,
    stage_key: 'irrigation',
    cadence: 'DAILY',
    name_en: 'Irrigation Check (Drip / Flood)',
    name_hi: 'सिंचाई जाँच',
    description_en: 'Daily during fruiting — check soil moisture at root zone; irrigate drip 30–45 min or flood every 4–6 days depending on stage and weather.',
  },
  {
    touchpoint_number: 5,
    stage_key: 'fertigation',
    cadence: 'WEEKLY',
    name_en: 'Fertigation / Top-Dress (NPK)',
    name_hi: 'पोषक तत्व',
    description_en: 'Weekly split dose — urea + MOP + micronutrients via drip or band placement; adjust N downward at fruit set to avoid vegetative flush.',
  },
  {
    touchpoint_number: 6,
    stage_key: 'pest',
    cadence: 'WEEKLY',
    name_en: 'Pest Scouting & IPM',
    name_hi: 'कीट निगरानी',
    description_en: 'Weekly walk — scout fruit borer (tomato/brinjal/okra), whitefly, thrips, mites; use pheromone traps + need-based neem/biopesticide rotation.',
  },
  {
    touchpoint_number: 7,
    stage_key: 'disease',
    cadence: 'WEEKLY',
    name_en: 'Disease Scouting & Spray',
    name_hi: 'रोग निगरानी',
    description_en: 'Weekly — check for early/late blight, leaf curl virus, damping-off, powdery mildew; rogue infected plants; preventive fungicide if monsoon imminent.',
  },
  {
    touchpoint_number: 8,
    stage_key: 'weeding',
    cadence: 'MONTHLY',
    name_en: 'Weeding, Mulching & Staking',
    name_hi: 'निराई, मल्च व सहारा',
    description_en: 'Monthly — hand-weed or hoe; refresh mulch (straw/plastic) to retain moisture; stake tomato/chilli/cucurbits as needed.',
  },
  {
    touchpoint_number: 9,
    stage_key: 'harvest',
    cadence: 'DAILY',
    name_en: 'Harvest Picking (Peak Window)',
    name_hi: 'तुड़ाई',
    description_en: 'Daily during peak — hand-pick at correct maturity (colour/size); most vegetables need alternate-day or daily picking to prevent over-ripening.',
  },
  {
    touchpoint_number: 10,
    stage_key: 'post_harvest',
    cadence: 'PER_EVENT',
    name_en: 'Grading, Packing & Sale',
    name_hi: 'श्रेणीकरण व बिक्री',
    description_en: 'Per lot — grade by size/quality, pack in crates, shade-cool; log yield kg, grade mix, sale price, buyer (mandi / aggregator / direct).',
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
