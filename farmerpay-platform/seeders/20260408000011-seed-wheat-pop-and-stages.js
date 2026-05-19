'use strict';

/**
 * SAGE Phase 2A — Wheat Package of Practice + stage triggers + pest risk.
 *
 * For each of the 5 wheat varieties (HD 2967, HD 3086, PBW 343, DBW 88,
 * Lok 1) on alluvial soil, seeds:
 *
 *   - 1 package_of_practices row
 *   - 7 pop_workbands (Germination → Maturity & Harvest)
 *   - 4–5 pop_workband_triggers per workband (temp + humidity + rainfall)
 *   - 2–3 pop_workband_pest_susceptibilities per workband
 *
 * Wheat is rabi (sown Oct–Nov, harvested Mar–Apr) and is dominated by
 * **terminal heat stress** at flowering and grain filling — every 1°C
 * above 30°C during these stages costs 3–5% yield. The trigger templates
 * reflect this with tight critical_max thresholds.
 *
 * Engine code is unchanged from Phase 2A Rice — only this data file is
 * new. Run after the rice seeder.
 *
 * Idempotent: skips PoPs that already exist by name.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Stage definitions (day offsets, scaled per variety duration) ────

const buildStages = (durationMin, durationMax) => {
  // Anchor reference: HD 2967-style 140-day cycle.
  const baseAnchor = 140;
  const target = Math.max(durationMin, durationMax || baseAnchor);
  const scale = target / baseAnchor;
  const round = (n) => Math.round(n);
  return [
    { order: 1, name: 'Germination',         startBase: 0,   endBase: 15  },
    { order: 2, name: 'Tillering',           startBase: 15,  endBase: 40  },
    { order: 3, name: 'Jointing',            startBase: 40,  endBase: 65  },
    { order: 4, name: 'Booting & Heading',   startBase: 65,  endBase: 85  },
    { order: 5, name: 'Flowering',           startBase: 85,  endBase: 100 },
    { order: 6, name: 'Grain Filling',       startBase: 100, endBase: 120 },
    { order: 7, name: 'Maturity & Harvest',  startBase: 120, endBase: target + 5 },
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
      optimal_min: 15, optimal_max: 25, critical_min: 4, critical_max: 30,
      urgency_above: 'medium', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: 'Wheat germination needs steady warmth — temperature has hit {observedValue} which is past the {threshold} threshold for {varietyName}. Frost or heat at this stage kills early seedlings.',
      recommended_action_en: 'If frost is forecast, light irrigation in the evening warms the soil. If heat, mulch the rows.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 50, optimal_max: 80, critical_min: 25, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Air humidity at {observedValue} is below {threshold} — {varietyName} germinating seeds will desiccate. Check soil moisture every other day.',
      recommended_action_en: 'Light surface irrigation if seedlings show stress.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 25, critical_min: null, critical_max: 50,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: '{observedValue} of rain on freshly-sown {varietyName} can crust the soil and prevent emergence. Rake the surface lightly once it dries.',
      recommended_action_en: 'Open drains. Once topsoil dries, rake gently to break the crust.',
    },
  ],
  Tillering: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 14, optimal_max: 22, critical_min: 2, critical_max: 27,
      urgency_above: 'medium', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} tillering stalls outside 14–22°C. Observed {observedValue} is past the {threshold} band — tiller count will drop and yield with it.',
      recommended_action_en: 'If hot, irrigate to cool the canopy. If cold-night frost forecast, irrigate in the evening — wet soil holds heat.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 55, optimal_max: 80, critical_min: 30, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} is below the {threshold} comfort line for {varietyName} tillering. Leaves may show curling.',
      recommended_action_en: 'Schedule the next irrigation 2–3 days earlier than planned.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 60,
      urgency_above: 'medium',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) on {varietyName} tillering — risk of waterlogging in low spots. Drain immediately.',
      recommended_action_en: 'Open drainage cuts; do not apply urea for the next 4 days.',
    },
  ],
  Jointing: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 16, optimal_max: 22, critical_min: 5, critical_max: 28,
      urgency_above: 'high', urgency_below: 'medium',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is in jointing — spike count is being set. Observed {observedValue} is past {threshold}, which can cut spike density 8–12%.',
      recommended_action_en: 'Irrigate to cool canopy. Apply second nitrogen split if not already done.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 55, optimal_max: 80, critical_min: 35, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} jointing is below the {threshold} line. Maintain field capacity.',
      recommended_action_en: 'Top up irrigation to maintain field capacity.',
    },
  ],
  'Booting & Heading': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 18, optimal_max: 24, critical_min: 8, critical_max: 30,
      urgency_above: 'high', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is at booting/heading and temperature has hit {observedValue} — past the {threshold} cap. Spike emergence is heat-sensitive; expect blanking if this persists.',
      recommended_action_en: 'Critical irrigation now. Foliar spray potassium nitrate (1%) reduces heat stress.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 80, critical_min: 40, critical_max: null,
      urgency_below: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} booting is below the {threshold} threshold. Spike sterility risk rising.',
      recommended_action_en: 'Maintain standing water if irrigation type allows. Foliar mist 6 AM and 6 PM if feasible.',
    },
  ],
  Flowering: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 18, optimal_max: 24, critical_min: 10, critical_max: 28,
      urgency_above: 'critical', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is FLOWERING — wheat\'s most heat-sensitive stage. Observed {observedValue} is past the {threshold} pollen sterility threshold. Each 1°C above 30°C costs 3–5% yield. ACT NOW.',
      recommended_action_en: 'Light flush irrigation immediately to drop canopy temperature 2–3°C. Foliar spray KNO3 (1%) at 6 AM. Postpone any other field operation.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 80, critical_min: 45, critical_max: null,
      urgency_below: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} flowering is past the {threshold} sterility risk line. Pollen viability drops fast.',
      recommended_action_en: 'Maintain saturated soil. Foliar mist twice daily if water available.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 25, critical_min: null, critical_max: 40,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) at {varietyName} flowering washes pollen and promotes head blight. Open drains; spray prophylactic fungicide post-rain.',
      recommended_action_en: 'Open drains. After rain, spray Tebuconazole 25 EC @ 1 ml/L within 48h to prevent Fusarium head blight.',
    },
  ],
  'Grain Filling': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 16, optimal_max: 22, critical_min: 8, critical_max: 30,
      urgency_above: 'critical',
      icon: '🌡️',
      advisory_template_en: '{varietyName} at grain filling — terminal heat stress is the #1 wheat yield killer. Observed {observedValue} is past {threshold}. Grain weight will drop and grains will shrivel.',
      recommended_action_en: 'Light irrigation now to cool canopy. Foliar spray KNO3 (1%) + thiourea (500 ppm). Do NOT cut irrigation until hard dough.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 50, optimal_max: 75, critical_min: 35, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} grain fill is below {threshold} — premature drying risk. Grain weight will be light.',
      recommended_action_en: 'Maintain irrigation cycle every 8–10 days through milk and dough stages.',
    },
  ],
  'Maturity & Harvest': [
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 20, critical_min: null, critical_max: 40,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Pre-harvest rain ({observedValue}) on mature {varietyName} risks grain sprouting in the head and lodging. Plan to harvest in the next dry window.',
      recommended_action_en: 'Walk the field. If grain moisture < 20% and forecast is dry, harvest immediately.',
    },
    {
      parameter_code: 'wind_speed_kmh',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 45,
      urgency_above: 'high',
      icon: '💨',
      advisory_template_en: 'Wind at {observedValue} km/h on mature {varietyName} — lodging risk above {threshold} km/h. Tall varieties are most exposed.',
      recommended_action_en: 'If lodging > 20% of plot, harvest within 24 hours even if grain moisture is slightly high.',
    },
    {
      parameter_code: 'temp_celsius',
      optimal_min: null, optimal_max: 32, critical_min: null, critical_max: 38,
      urgency_above: 'medium',
      icon: '🌡️',
      advisory_template_en: 'Pre-harvest heat at {observedValue} on {varietyName} — grain is shrinking faster than normal. Harvest at the earliest dry window.',
      recommended_action_en: 'Schedule harvest within 3 days. Sun-dry to 12% moisture before storage.',
    },
  ],
};

// ─── Pest susceptibility templates per stage ─────────────────────────

const PEST_TEMPLATES = {
  Germination: [
    { pest_code: 'termite', pest_name_en: 'Termites', pest_name_hi: 'दीमक', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🐜',
      advisory_template_en: 'Termite reports {severity} in your district. {varietyName} germinating seedlings are vulnerable — check rows for missing plants.',
      recommended_action_en: 'Apply Chlorpyriphos 20 EC @ 4 L/ha mixed with irrigation water on first detection.' },
    { pest_code: 'loose_smut', pest_name_en: 'Loose smut', pest_name_hi: 'खुली कंडुआ', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'high', icon: '🦠',
      advisory_template_en: 'Loose smut {severity} in nearby fields. Inspect {varietyName} seedlings as they emerge — diseased plants become visible at heading.',
      recommended_action_en: 'Cannot be cured this season. Note for next season: treat seed with Carboxin 75 WP @ 2.5 g/kg.' },
  ],
  Tillering: [
    { pest_code: 'aphid', pest_name_en: 'Wheat aphid', pest_name_hi: 'गेहूँ का चेपा', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Aphid pressure {severity} in your district — {varietyName} tillering plants are highly attractive. Check leaf undersides for clustered green/black insects.',
      recommended_action_en: 'Spray Imidacloprid 17.8 SL @ 0.3 ml/L OR Thiamethoxam 25 WG @ 0.2 g/L on first detection.' },
    { pest_code: 'rusts', pest_name_en: 'Wheat rusts (yellow/brown/black)', pest_name_hi: 'गेहूँ का रतुआ', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Rust pressure {severity} reported in your area — {varietyName} is in the susceptible window. Scout for yellow/orange pustules on leaves.',
      recommended_action_en: 'Spray Propiconazole 25 EC @ 1 ml/L on first pustule. Re-spray after 15 days.' },
    { pest_code: 'powdery_mildew', pest_name_en: 'Powdery mildew', pest_name_hi: 'चूर्णिल आसिता', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Powdery mildew {severity} in your district. {varietyName} early canopy is vulnerable — look for white powdery patches on leaves.',
      recommended_action_en: 'Spray Sulphur 80 WP @ 2 g/L OR Hexaconazole 5 EC @ 2 ml/L on first detection.' },
  ],
  Jointing: [
    { pest_code: 'aphid', pest_name_en: 'Wheat aphid', pest_name_hi: 'गेहूँ का चेपा', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Aphid pressure {severity} during {varietyName} jointing — populations explode at this stage. Check leaf sheaths and tillers.',
      recommended_action_en: 'Spray Imidacloprid 17.8 SL @ 0.3 ml/L if 5+ aphids per tiller.' },
    { pest_code: 'yellow_rust', pest_name_en: 'Yellow (stripe) rust', pest_name_hi: 'पीला रतुआ', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Yellow rust {severity} in your district. {varietyName} jointing canopy is at high risk — yellow stripes parallel to leaf veins.',
      recommended_action_en: 'Spray Propiconazole 25 EC @ 1 ml/L immediately. Yellow rust spreads in cool humid weather.' },
    { pest_code: 'brown_wheat_mite', pest_name_en: 'Brown wheat mite', pest_name_hi: 'भूरा माइट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🕷️',
      advisory_template_en: 'Brown wheat mite reports {severity} in your area. {varietyName} leaves may show stippling and bronzing.',
      recommended_action_en: 'Spray Dicofol 18.5 EC @ 2 ml/L if leaf bronzing visible on > 10% plants.' },
  ],
  'Booting & Heading': [
    { pest_code: 'aphid', pest_name_en: 'Wheat aphid', pest_name_hi: 'गेहूँ का चेपा', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Aphid pressure {severity} during {varietyName} booting — peak attack window. Honeydew on flag leaves cuts photosynthesis directly.',
      recommended_action_en: 'Spray Imidacloprid 17.8 SL @ 0.3 ml/L immediately. Use sticker/spreader for better coverage.' },
    { pest_code: 'leaf_rust', pest_name_en: 'Leaf (brown) rust', pest_name_hi: 'भूरा रतुआ', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Leaf rust {severity} in your area — {varietyName} flag leaf is the engine of grain filling. Protect it now.',
      recommended_action_en: 'Spray Tebuconazole 25 EC @ 1 ml/L or Propiconazole 25 EC @ 1 ml/L on the flag leaf.' },
    { pest_code: 'karnal_bunt', pest_name_en: 'Karnal bunt', pest_name_hi: 'करनाल बंट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Karnal bunt {severity} in nearby fields. {varietyName} heading is the infection window. Cool wet weather increases risk.',
      recommended_action_en: 'Preventive spray of Propiconazole 25 EC @ 1 ml/L at heading. Once infected, no cure.' },
  ],
  Flowering: [
    { pest_code: 'aphid', pest_name_en: 'Wheat aphid', pest_name_hi: 'गेहूँ का चेपा', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: 'Any aphid presence on {varietyName} during flowering is critical — they suck pollen sap and reduce grain set. Scout daily.',
      recommended_action_en: 'Even at low counts, spray Imidacloprid 17.8 SL @ 0.3 ml/L. Use evening application to avoid bee impact.' },
    { pest_code: 'head_blight', pest_name_en: 'Fusarium head blight (scab)', pest_name_hi: 'फ्यूज़ेरियम झुलसा', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Fusarium head blight risk {severity} during {varietyName} flowering — bleached heads with pink fungal growth. Mycotoxin in grain.',
      recommended_action_en: 'Spray Tebuconazole 25 EC @ 1 ml/L within 48h of any rain during flowering.' },
    { pest_code: 'stem_rust', pest_name_en: 'Stem (black) rust', pest_name_hi: 'काला रतुआ', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Stem rust {severity} in your district. {varietyName} stem-rust outbreak at flowering = lodging risk + direct yield loss.',
      recommended_action_en: 'Spray Tebuconazole 25 EC @ 1 ml/L or Propiconazole + Difenoconazole combination.' },
  ],
  'Grain Filling': [
    { pest_code: 'aphid', pest_name_en: 'Wheat aphid', pest_name_hi: 'गेहूँ का चेपा', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Aphid pressure {severity} during {varietyName} grain fill — direct grain-weight loss.',
      recommended_action_en: 'Spray Imidacloprid 17.8 SL @ 0.3 ml/L if counts > 5/tiller.' },
    { pest_code: 'leaf_rust', pest_name_en: 'Leaf (brown) rust', pest_name_hi: 'भूरा रतुआ', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Leaf rust {severity} in your district during {varietyName} grain fill — flag leaf protection is everything.',
      recommended_action_en: 'Spray Tebuconazole 25 EC @ 1 ml/L if pustules on flag leaf.' },
  ],
  'Maturity & Harvest': [
    { pest_code: 'storage_pests', pest_name_en: 'Storage pests (rice weevil etc.)', pest_name_hi: 'भंडारण कीट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'high', icon: '🐛',
      advisory_template_en: 'Storage pest activity {severity} in your area. Once {varietyName} is harvested, moisture must drop below 12% before bagging.',
      recommended_action_en: 'Sun-dry threshed grain on tarpaulin for 2 days. Use neem leaves or DE in storage bags.' },
    { pest_code: 'sprouting', pest_name_en: 'Pre-harvest sprouting', pest_name_hi: 'अंकुरण', susceptibility_level: 'low', triggered_when_regional_severity_at_least: 'high', icon: '🌱',
      advisory_template_en: 'Wet weather warning for {varietyName} at maturity — pre-harvest sprouting (grains germinating in the spike) downgrades the crop.',
      recommended_action_en: 'Harvest immediately when grain is at hard dough. Do not wait for the field to fully dry.' },
  ],
};

// ─── Hybrid downgrade (none of the 5 wheat varieties are hybrids today) ──

const downgradeForHybrid = (susc) => {
  const map = { very_high: 'high', high: 'medium', medium: 'low', low: 'low' };
  return map[susc] || susc;
};

// ─── Seeder ──────────────────────────────────────────────────────────

const WHEAT_VARIETY_CODES = ['HD2967', 'HD3086', 'PBW343', 'DBW88', 'LOK1'];

module.exports = {
  async up(queryInterface) {
    const [crops] = await queryInterface.sequelize.query(
      "SELECT crop_id, crop_code FROM crop_masters WHERE crop_code = 'WHEAT' LIMIT 1"
    );
    if (!crops || crops.length === 0) return;
    const wheatCropId = crops[0].crop_id;

    const [soils] = await queryInterface.sequelize.query(
      "SELECT id, soil_type_code FROM soil_types WHERE soil_type_code IN ('alluvial', 'ALLUVIAL') LIMIT 1"
    );
    if (!soils || soils.length === 0) return;
    const alluvialSoilId = soils[0].id;

    const [varietyRows] = await queryInterface.sequelize.query(
      "SELECT variety_id, variety_code, variety_name, duration_days_min, duration_days_max, is_hybrid FROM variety_masters WHERE variety_code IN (:codes)",
      { replacements: { codes: WHEAT_VARIETY_CODES } }
    );
    if (!varietyRows || varietyRows.length === 0) return;

    const now = new Date();

    for (const variety of varietyRows) {
      const popName = `Wheat — ${variety.variety_name} on Alluvial Soil — Phase 2A`;

      const [existing] = await queryInterface.sequelize.query(
        'SELECT id, pop_uuid FROM package_of_practices WHERE pop_name = ? LIMIT 1',
        { replacements: [popName] }
      );
      let popUuid;
      if (existing && existing.length > 0) {
        popUuid = existing[0].pop_uuid;
      } else {
        popUuid = uuidv4();
        await queryInterface.bulkInsert('package_of_practices', [{
          pop_uuid: popUuid,
          crop_id: wheatCropId,
          variety_id: variety.variety_id,
          soil_type_id: alluvialSoilId,
          climate_zone_id: null,
          state_id: null,
          pop_name: popName,
          pop_description: `Wheat cultivation package of practice for ${variety.variety_name} on alluvial soil. Phase 2A — engine-readable stage triggers.`,
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
        variety.duration_days_min || 130,
        variety.duration_days_max || 140
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
      "SELECT id, pop_uuid FROM package_of_practices WHERE pop_name LIKE 'Wheat — %%on Alluvial Soil — Phase 2A'"
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
  },
};
