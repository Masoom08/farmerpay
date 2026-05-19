'use strict';

/**
 * SAGE Phase 2A — Sugarcane Package of Practice + stage triggers + pest risk.
 *
 * Sugarcane is a long-duration tropical grass — plant cane runs ~12 months
 * (310–365 days depending on variety and region). It is unique among the
 * Phase 2A crops in three ways:
 *   1. Long, water-hungry **grand growth** phase (~120–300 days from
 *      planting) when most of the cane is laid down — this is when heat
 *      stress and pest pressure hit hardest.
 *   2. **Cool nights at maturation** are critical for sucrose accumulation —
 *      high temperatures during ripening burn off sugar and the mill payout
 *      drops even if biomass is high.
 *   3. **Red rot** can wipe out entire fields and is a known FarmerPay
 *      red flag — we model it as `very_high` susceptibility during grand
 *      growth, triggered at low regional severity (early warning).
 *
 * The 5 varieties below are not in the Phase 1 variety_master seeder, so
 * this seeder bootstraps them inline before creating the PoPs. Idempotent:
 * skips varieties / PoPs that already exist.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Sugarcane variety bootstrap (no Phase 1 seeder for these) ───────

const SUGARCANE_VARIETIES = [
  { code: 'CO0238',  name: 'Co 0238 (Karan 4)',     durationMin: 310, durationMax: 360, yield: 90000, hybrid: false, desc: 'High-yielding early-maturing variety. ~70% of north Indian cane area. High sucrose, red-rot tolerant.' },
  { code: 'CO86032', name: 'Co 86032 (Nayana)',     durationMin: 330, durationMax: 365, yield: 100000, hybrid: false, desc: 'Mid-late variety dominant in south India. High biomass, good ratoonability, drought-moderate tolerance.' },
  { code: 'CO8021',  name: 'Co 8021',               durationMin: 320, durationMax: 360, yield: 85000, hybrid: false, desc: 'Old reliable mid-late variety. Wide adaptation, moderate sucrose, declining acreage.' },
  { code: 'COJ64',   name: 'CoJ 64',                durationMin: 305, durationMax: 345, yield: 80000, hybrid: false, desc: 'Punjab/Haryana early-maturing variety. Frost moderate, good juice quality, susceptible to red rot.' },
  { code: 'CO99004', name: 'Co 99004 (Damodar)',    durationMin: 320, durationMax: 360, yield: 95000, hybrid: false, desc: 'Mid-late high-sucrose variety. Good ratoon, broad adoption in Maharashtra and Karnataka.' },
];

// ─── Stage definitions ───────────────────────────────────────────────

const buildStages = (durationMin, durationMax) => {
  // Anchor reference: Co 0238-style 360-day cycle.
  const baseAnchor = 360;
  const target = Math.max(durationMin, durationMax || baseAnchor);
  const scale = target / baseAnchor;
  const round = (n) => Math.round(n);
  return [
    { order: 1, name: 'Germination',          startBase: 0,   endBase: 35  },
    { order: 2, name: 'Tillering',            startBase: 35,  endBase: 120 },
    { order: 3, name: 'Grand Growth — Early', startBase: 120, endBase: 210 },
    { order: 4, name: 'Grand Growth — Late',  startBase: 210, endBase: 300 },
    { order: 5, name: 'Maturation',           startBase: 300, endBase: 330 },
    { order: 6, name: 'Harvest Window',       startBase: 330, endBase: target + 10 },
  ].map((s) => ({
    ...s,
    start: round(s.startBase * scale),
    end: round(s.endBase * scale),
  }));
};

// ─── Trigger templates per stage ─────────────────────────────────────

const TRIGGER_TEMPLATES = {
  Germination: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 27, optimal_max: 32, critical_min: 18, critical_max: 38,
      urgency_above: 'high', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} germination needs 27–32°C. Observed {observedValue} is past the {threshold} threshold — buds may rot or fail to sprout.',
      recommended_action_en: 'If hot, light irrigation in the morning to cool the seed bed. If cold, mulch the rows with trash to retain warmth.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 90, critical_min: 35, critical_max: null,
      urgency_below: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} is below the {threshold} germination comfort line for {varietyName}. Setts will dry out before sprouting.',
      recommended_action_en: 'Light irrigation every 4–5 days until sprouts emerge.',
    },
    {
      parameter_code: 'soil_moisture_percent',
      optimal_min: 30, optimal_max: 60, critical_min: 20, critical_max: null,
      urgency_below: 'high',
      icon: '🟫',
      advisory_template_en: 'Soil moisture {observedValue} is below {threshold} — {varietyName} setts cannot germinate without moist soil.',
      recommended_action_en: 'Irrigate immediately. Sugarcane has the highest water demand of all Phase 2A crops.',
    },
  ],
  Tillering: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 28, optimal_max: 32, critical_min: 18, critical_max: 38,
      urgency_above: 'medium', urgency_below: 'medium',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is tillering — establishment phase. Observed {observedValue} is past the {threshold} band; tiller production slows sharply.',
      recommended_action_en: 'Irrigate to keep canopy temperature down. Top-dress with second nitrogen split if not done.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 85, critical_min: 40, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} tillering is below {threshold}. Tiller mortality rises.',
      recommended_action_en: 'Increase irrigation frequency to every 7–10 days.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 60, critical_min: null, critical_max: 100,
      urgency_above: 'medium',
      icon: '🌧️',
      advisory_template_en: '{observedValue} rain on {varietyName} tillering field — risk of waterlogging in low spots. Cane is rain-loving but standing water > 48h kills tillers.',
      recommended_action_en: 'Open drainage cuts in low spots. Postpone urea top-dressing for the next 5 days.',
    },
  ],
  'Grand Growth — Early': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 30, optimal_max: 34, critical_min: 22, critical_max: 40,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is in early grand growth — peak biomass laid down here. Observed {observedValue} is past the {threshold} cap; internode elongation slows.',
      recommended_action_en: 'Irrigate every 7 days. Foliar spray potassium 1% reduces heat stress and boosts sucrose later.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 65, optimal_max: 85, critical_min: 45, critical_max: null,
      urgency_below: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} grand growth is below {threshold}. Cane will produce shorter internodes — direct yield loss.',
      recommended_action_en: 'Irrigate immediately. Mulch with trash if available.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 80, critical_min: null, critical_max: 150,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) on {varietyName} grand growth field — lodging risk above {threshold}. Lodged cane is hard to harvest and loses sugar.',
      recommended_action_en: 'After rain, prop lodged cane back upright with twine. Apply potassium foliar spray.',
    },
  ],
  'Grand Growth — Late': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 28, optimal_max: 33, critical_min: 20, critical_max: 38,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is in late grand growth — final biomass. Observed {observedValue} is past the {threshold} threshold; reduces juice quality.',
      recommended_action_en: 'Maintain irrigation cycle. Reduce nitrogen top-up to push the plant toward sucrose accumulation, not vegetative growth.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 80, critical_min: 45, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} during {varietyName} late grand growth is below {threshold}. Stress symptoms — leaf rolling, internode tightening.',
      recommended_action_en: 'Top up irrigation. Begin tying cane bundles to prevent lodging.',
    },
  ],
  Maturation: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 18, optimal_max: 26, critical_min: 8, critical_max: 32,
      urgency_above: 'critical',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is at maturation — COOL NIGHTS drive sucrose accumulation. Observed {observedValue} is past the {threshold} threshold; sugar yield can drop 8–15% even with healthy biomass. The mill payout depends on sucrose %, not just tonnage.',
      recommended_action_en: 'Reduce irrigation 30 days before harvest to stress the plant into sugar accumulation. Stop nitrogen entirely.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 50, optimal_max: 75, critical_min: 35, critical_max: 90,
      urgency_above: 'medium', urgency_below: 'low',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} maturation — high humidity reduces sucrose yield and invites smut and red rot.',
      recommended_action_en: 'No irrigation. Walk the field to check for red rot and smut symptoms.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 25, critical_min: null, critical_max: 50,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Rain ({observedValue}) during {varietyName} maturation drops sucrose by 0.5 unit per heavy event. Mill payout is at risk.',
      recommended_action_en: 'Open drains. If forecast continues wet, advance harvest date.',
    },
  ],
  'Harvest Window': [
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 20, critical_min: null, critical_max: 40,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Pre-harvest rain ({observedValue}) on mature {varietyName} promotes regrowth from buds, drops sucrose recovery, and bogs down field operations.',
      recommended_action_en: 'Coordinate with the mill to advance the harvest schedule. Cane standing wet > 7 days starts losing sugar.',
    },
    {
      parameter_code: 'temp_celsius',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 36,
      urgency_above: 'medium',
      icon: '🌡️',
      advisory_template_en: 'Heat at {observedValue} on {varietyName} ready for harvest — sucrose is being respired away. Each day of delay costs ~0.3 units of recovery.',
      recommended_action_en: 'Harvest within 3 days of cutting orders from the mill. Do not let cut cane sit > 24h before transport.',
    },
    {
      parameter_code: 'wind_speed_kmh',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 50,
      urgency_above: 'high',
      icon: '💨',
      advisory_template_en: 'Wind at {observedValue}km/h on standing mature {varietyName} — lodging is now field-wide risk above {threshold}km/h. Lodged cane must be hand-harvested at 2x labor cost.',
      recommended_action_en: 'Harvest immediately if more than 30% of the plot has lodged.',
    },
  ],
};

// ─── Pest susceptibility templates per stage ─────────────────────────

const PEST_TEMPLATES = {
  Germination: [
    { pest_code: 'termite', pest_name_en: 'Termites', pest_name_hi: 'दीमक', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐜',
      advisory_template_en: 'Termite pressure {severity} in your district — {varietyName} setts are vulnerable before sprouting. Field gaps are the early symptom.',
      recommended_action_en: 'Dip setts in Chlorpyriphos 20 EC @ 0.5% for 10 minutes before planting OR drench standing fields with the same.' },
    { pest_code: 'early_shoot_borer', pest_name_en: 'Early shoot borer', pest_name_hi: 'अग्र छेदक', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Early shoot borer reports {severity} regionally. {varietyName} sprouts will show "dead heart" symptoms — central leaf wilting.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L on first dead heart detection. Earth-up the rows.' },
  ],
  Tillering: [
    { pest_code: 'early_shoot_borer', pest_name_en: 'Early shoot borer', pest_name_hi: 'अग्र छेदक', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: 'Early shoot borer pressure {severity} during {varietyName} tillering — 40-60% tiller loss possible. Skipping action could cost ₹15,000–₹25,000 per acre.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L immediately. Earth-up rows. Re-spray after 15 days if dead hearts persist.' },
    { pest_code: 'pyrilla', pest_name_en: 'Sugarcane pyrilla (planthopper)', pest_name_hi: 'पाइरिला', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🦗',
      advisory_template_en: 'Pyrilla regional pressure {severity}. {varietyName} canopy juice is the food source — heavy infestation drops yield 15–30%.',
      recommended_action_en: 'Release Epiricania melanoleuca biocontrol if available. Otherwise, spray Imidacloprid 17.8 SL @ 0.3 ml/L.' },
    { pest_code: 'red_rot', pest_name_en: 'Red rot', pest_name_hi: 'लाल सड़न', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'low', icon: '🦠',
      advisory_template_en: 'Red rot reports {severity} in your district — early warning. {varietyName} is at risk; check tiller leaves for red lesions with white spots.',
      recommended_action_en: 'Rogue and burn affected stools. Drench remaining plants with Carbendazim 50 WP @ 1 g/L. Do NOT use the field for cane next season.' },
  ],
  'Grand Growth — Early': [
    { pest_code: 'top_borer', pest_name_en: 'Top borer', pest_name_hi: 'शीर्ष छेदक', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Top borer {severity} in your area. {varietyName} growing point is the target — once damaged, the cane stops elongating. Yield loss is direct.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L on first detection. Cut and burn affected tops.' },
    { pest_code: 'pyrilla', pest_name_en: 'Sugarcane pyrilla (planthopper)', pest_name_hi: 'पाइरिला', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🦗',
      advisory_template_en: 'Pyrilla {severity} during {varietyName} grand growth — peak attack window. Honeydew on leaves promotes sooty mold and reduces photosynthesis.',
      recommended_action_en: 'Spray Imidacloprid 17.8 SL @ 0.3 ml/L. Avoid synthetic pyrethroids which kill biocontrol agents.' },
    { pest_code: 'red_rot', pest_name_en: 'Red rot', pest_name_hi: 'लाल सड़न', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🦠',
      advisory_template_en: '🚨 Red rot {severity} regionally — {varietyName} grand growth is the most catastrophic infection window. Whole field can collapse in 4 weeks. THIS IS A FARMERPAY ALERT.',
      recommended_action_en: 'Inspect today. Pull a stalk and split lengthwise — red discoloration with white blocks = red rot. Rogue and burn entire affected rows. Notify field agent.' },
  ],
  'Grand Growth — Late': [
    { pest_code: 'internode_borer', pest_name_en: 'Internode borer', pest_name_hi: 'अंतर्गांठ छेदक', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Internode borer {severity} in your district. {varietyName} cane is forming — borer tunnels reduce sugar recovery and cane weight.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L on the cane (not just leaves). Detrash lower leaves to expose the borer.' },
    { pest_code: 'whitefly', pest_name_en: 'Sugarcane whitefly', pest_name_hi: 'सफेद मक्खी', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🪰',
      advisory_template_en: 'Whitefly {severity} in your area. Late grand growth {varietyName} will show yellowing leaves and reduced juice quality.',
      recommended_action_en: 'Spray Buprofezin 25 SC @ 1.6 ml/L. Detrash to reduce egg laying surface.' },
    { pest_code: 'red_rot', pest_name_en: 'Red rot', pest_name_hi: 'लाल सड़न', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'low', icon: '🦠',
      advisory_template_en: 'Red rot {severity} regionally — {varietyName} late grand growth still vulnerable. Inspect lower leaves for red discoloration with white blocks inside the stalk.',
      recommended_action_en: 'Rogue and burn affected stools. Drench remaining plants with Carbendazim 50 WP @ 1 g/L.' },
  ],
  Maturation: [
    { pest_code: 'rats', pest_name_en: 'Field rats', pest_name_hi: 'खेत के चूहे', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🐀',
      advisory_template_en: 'Rat damage {severity} in your district. {varietyName} mature cane is sweet and attractive — losses can hit 10–15% of standing crop in heavy years.',
      recommended_action_en: 'Place zinc phosphide 2% bait stations along bunds. Cut and burn weeds that harbour rats.' },
    { pest_code: 'smut', pest_name_en: 'Sugarcane smut', pest_name_hi: 'कंडुआ', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Smut reports {severity} in your area. {varietyName} mature stools showing whip-like growth from the top = smut. Spores spread to ratoon.',
      recommended_action_en: 'Rogue affected stools immediately and burn. Do NOT use this field for ratoon cane.' },
    { pest_code: 'red_rot', pest_name_en: 'Red rot', pest_name_hi: 'लाल सड़न', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'low', icon: '🦠',
      advisory_template_en: 'Red rot {severity} — {varietyName} at maturation showing red rot drops sucrose recovery by 30-50%. Mill rejection risk.',
      recommended_action_en: 'Harvest affected portion immediately and process. Notify mill of likely sucrose drop.' },
  ],
  'Harvest Window': [
    { pest_code: 'rats', pest_name_en: 'Field rats', pest_name_hi: 'खेत के चूहे', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🐀',
      advisory_template_en: 'Rat activity {severity} in your area. Standing {varietyName} ready for harvest is the prime target.',
      recommended_action_en: 'Coordinate with mill to harvest within 5 days. Bait stations remain effective.' },
    { pest_code: 'fire_risk', pest_name_en: 'Pre-harvest fire', pest_name_hi: 'आग का खतरा', susceptibility_level: 'low', triggered_when_regional_severity_at_least: 'high', icon: '🔥',
      advisory_template_en: 'Dry weather + standing {varietyName} = pre-harvest fire risk {severity}. Fire reduces sucrose recovery 1-2 units even if cane is salvaged.',
      recommended_action_en: 'Maintain firebreaks around the plot. Coordinate with neighbours to harvest in sequence.' },
  ],
};

const downgradeForHybrid = (susc) => {
  const map = { very_high: 'high', high: 'medium', medium: 'low', low: 'low' };
  return map[susc] || susc;
};

// ─── Seeder ──────────────────────────────────────────────────────────

module.exports = {
  async up(queryInterface) {
    // 1. Resolve sugarcane crop
    const [crops] = await queryInterface.sequelize.query(
      "SELECT crop_id, crop_code FROM crop_masters WHERE crop_code = 'SUGARCANE' LIMIT 1"
    );
    if (!crops || crops.length === 0) return;
    const sugarcaneCropId = crops[0].crop_id;

    // 2. Resolve alluvial soil
    const [soils] = await queryInterface.sequelize.query(
      "SELECT id, soil_type_code FROM soil_types WHERE soil_type_code IN ('alluvial', 'ALLUVIAL') LIMIT 1"
    );
    if (!soils || soils.length === 0) return;
    const alluvialSoilId = soils[0].id;

    const now = new Date();

    // 3. Bootstrap sugarcane varieties (Phase 1 variety seeder didn't include them)
    const [existingVars] = await queryInterface.sequelize.query(
      'SELECT variety_id, variety_code FROM variety_masters WHERE variety_code IN (:codes)',
      { replacements: { codes: SUGARCANE_VARIETIES.map((v) => v.code) } }
    );
    const existingByCode = {};
    for (const e of existingVars) existingByCode[e.variety_code] = e.variety_id;

    const varietyRowsToInsert = [];
    for (const v of SUGARCANE_VARIETIES) {
      if (existingByCode[v.code]) continue;
      varietyRowsToInsert.push({
        variety_id: uuidv4(),
        crop_id: sugarcaneCropId,
        variety_name: v.name,
        variety_code: v.code,
        variety_description: v.desc,
        duration_days_min: v.durationMin,
        duration_days_max: v.durationMax,
        expected_yield_kg_per_hectare: v.yield,
        seed_company: null,
        seed_treatment_recommended: false,
        is_hybrid: v.hybrid,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }
    if (varietyRowsToInsert.length > 0) {
      await queryInterface.bulkInsert('variety_masters', varietyRowsToInsert);
    }

    // 4. Re-fetch all 5 sugarcane varieties (now guaranteed to exist)
    const [varietyRows] = await queryInterface.sequelize.query(
      'SELECT variety_id, variety_code, variety_name, duration_days_min, duration_days_max, is_hybrid FROM variety_masters WHERE variety_code IN (:codes)',
      { replacements: { codes: SUGARCANE_VARIETIES.map((v) => v.code) } }
    );

    // 5. For each variety, create PoP + workbands + triggers + pest susceptibilities
    for (const variety of varietyRows) {
      const popName = `Sugarcane — ${variety.variety_name} on Alluvial Soil — Phase 2A`;

      const [existingPop] = await queryInterface.sequelize.query(
        'SELECT id, pop_uuid FROM package_of_practices WHERE pop_name = ? LIMIT 1',
        { replacements: [popName] }
      );
      let popUuid;
      if (existingPop && existingPop.length > 0) {
        popUuid = existingPop[0].pop_uuid;
      } else {
        popUuid = uuidv4();
        await queryInterface.bulkInsert('package_of_practices', [{
          pop_uuid: popUuid,
          crop_id: sugarcaneCropId,
          variety_id: variety.variety_id,
          soil_type_id: alluvialSoilId,
          climate_zone_id: null,
          state_id: null,
          pop_name: popName,
          pop_description: `Sugarcane cultivation package of practice for ${variety.variety_name} on alluvial soil. Phase 2A — engine-readable stage triggers.`,
          recommended_by_org_id: null,
          version: '2026.04',
          is_certified: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        }]);
      }

      const [existingWb] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as n FROM pop_workbands WHERE pop_id = ?',
        { replacements: [popUuid] }
      );
      if (existingWb[0].n > 0) continue;

      const stages = buildStages(
        variety.duration_days_min || 320,
        variety.duration_days_max || 360
      );

      const workbandRows = stages.map((s) => ({
        pop_id: popUuid,
        workband_order: s.order,
        workband_name: s.name,
        days_from_sowing_start: s.start,
        days_from_sowing_end: s.end,
        workband_description: `${s.name} stage for ${variety.variety_name} (days ${s.start}–${s.end})`,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));
      await queryInterface.bulkInsert('pop_workbands', workbandRows);

      const [insertedWbs] = await queryInterface.sequelize.query(
        'SELECT id, workband_name FROM pop_workbands WHERE pop_id = ? ORDER BY workband_order ASC',
        { replacements: [popUuid] }
      );

      const triggerRows = [];
      for (const wb of insertedWbs) {
        const tpl = TRIGGER_TEMPLATES[wb.workband_name] || [];
        for (const t of tpl) {
          triggerRows.push({
            pop_workband_id: wb.id,
            parameter_code: t.parameter_code,
            optimal_min: t.optimal_min,
            optimal_max: t.optimal_max,
            critical_min: t.critical_min,
            critical_max: t.critical_max,
            urgency_below: t.urgency_below || 'medium',
            urgency_above: t.urgency_above || 'medium',
            advisory_template_en: t.advisory_template_en,
            advisory_template_hi: null,
            recommended_action_en: t.recommended_action_en,
            icon: t.icon || null,
            is_active: true,
            created_at: now,
            updated_at: now,
          });
        }
      }
      if (triggerRows.length > 0) {
        await queryInterface.bulkInsert('pop_workband_triggers', triggerRows);
      }

      const pestRows = [];
      for (const wb of insertedWbs) {
        const tpl = PEST_TEMPLATES[wb.workband_name] || [];
        for (const p of tpl) {
          pestRows.push({
            pop_workband_id: wb.id,
            pest_code: p.pest_code,
            pest_name_en: p.pest_name_en,
            pest_name_hi: p.pest_name_hi,
            susceptibility_level: variety.is_hybrid ? downgradeForHybrid(p.susceptibility_level) : p.susceptibility_level,
            triggered_when_regional_severity_at_least: p.triggered_when_regional_severity_at_least,
            advisory_template_en: p.advisory_template_en,
            advisory_template_hi: null,
            recommended_action_en: p.recommended_action_en,
            icon: p.icon || null,
            is_active: true,
            created_at: now,
            updated_at: now,
          });
        }
      }
      if (pestRows.length > 0) {
        await queryInterface.bulkInsert('pop_workband_pest_susceptibilities', pestRows);
      }
    }
  },

  async down(queryInterface) {
    const [pops] = await queryInterface.sequelize.query(
      "SELECT id, pop_uuid FROM package_of_practices WHERE pop_name LIKE 'Sugarcane — %%on Alluvial Soil — Phase 2A'"
    );
    if (!pops || pops.length === 0) return;
    const popUuids = pops.map((p) => p.pop_uuid);

    const [wbs] = await queryInterface.sequelize.query(
      'SELECT id FROM pop_workbands WHERE pop_id IN (:uuids)',
      { replacements: { uuids: popUuids } }
    );
    const wbIds = wbs.map((w) => w.id);
    if (wbIds.length > 0) {
      await queryInterface.bulkDelete('pop_workband_triggers', { pop_workband_id: wbIds });
      await queryInterface.bulkDelete('pop_workband_pest_susceptibilities', { pop_workband_id: wbIds });
      await queryInterface.bulkDelete('pop_workbands', { id: wbIds });
    }
    await queryInterface.bulkDelete('package_of_practices', { pop_uuid: popUuids });
    // Note: leave variety_masters rows in place — they might be referenced
    // by user-created cycles. If you really want to remove them, do so manually.
  },
};
