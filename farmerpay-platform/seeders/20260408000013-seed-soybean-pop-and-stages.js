'use strict';

/**
 * SAGE Phase 2A — Soybean Package of Practice + stage triggers + pest risk.
 *
 * Soybean is the **largest non-cereal crop in India by area** (~12 million
 * hectares, dominant in MP, Maharashtra, Rajasthan). Kharif crop, sown
 * June–July, harvested October–November, ~95–110 day cycle.
 *
 * Soybean's defining sensitivities:
 *   1. **Heat at flowering** — temps > 35°C drop pod set sharply, the
 *      single biggest yield killer in central Indian belts during heat
 *      waves.
 *   2. **Yellow Mosaic Virus** vectored by whitefly — can wipe 30–60% of
 *      yield in heavy years. Triggered at LOW regional severity for early
 *      warning (similar to sugarcane red rot pattern).
 *   3. **Spodoptera litura** (tobacco caterpillar) defoliation — peak
 *      attack at vegetative → flowering, can strip plants.
 *   4. **Waterlogging at germination** — soybean cannot tolerate standing
 *      water > 24h at emergence.
 *
 * The 5 varieties below are not in the Phase 1 variety_master seeder, so
 * this seeder bootstraps them inline before creating the PoPs. Idempotent.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Soybean variety bootstrap ───────────────────────────────────────

const SOYBEAN_VARIETIES = [
  { code: 'JS335',   name: 'JS 335',                  durationMin: 95,  durationMax: 105, yield: 2500, hybrid: false, desc: 'Most widely grown soybean variety in India. ICAR-Indore release. Mid maturity, broad adaptation across MP and Maharashtra.' },
  { code: 'JS9560',  name: 'JS 9560',                 durationMin: 82,  durationMax: 92,  yield: 2700, hybrid: false, desc: 'Early maturity, escapes terminal drought. High yield potential under moderate inputs. Popular replacement for JS 335 in MP.' },
  { code: 'JS2034',  name: 'JS 20-34',                durationMin: 86,  durationMax: 96,  yield: 2800, hybrid: false, desc: 'Newer high-yielding variety with good rust tolerance. Suited for assured-rainfall belts.' },
  { code: 'NRC86',   name: 'NRC 86',                  durationMin: 95,  durationMax: 105, yield: 2400, hybrid: false, desc: 'Drought tolerant. Good choice for rainfed Vidarbha and Rajasthan belts. Resistant to YMV.' },
  { code: 'MAUS162', name: 'MAUS 162',                durationMin: 95,  durationMax: 110, yield: 2600, hybrid: false, desc: 'Maharashtra-bred variety with good pod retention. Performs in heavy soils.' },
];

// ─── Stage definitions ───────────────────────────────────────────────

const buildStages = (durationMin, durationMax) => {
  const baseAnchor = 100;
  const target = Math.max(durationMin, durationMax || baseAnchor);
  const scale = target / baseAnchor;
  const round = (n) => Math.round(n);
  return [
    { order: 1, name: 'Germination & Emergence', startBase: 0,  endBase: 15  },
    { order: 2, name: 'Vegetative Growth',       startBase: 15, endBase: 35  },
    { order: 3, name: 'Flowering',               startBase: 35, endBase: 55  },
    { order: 4, name: 'Pod Formation',           startBase: 55, endBase: 75  },
    { order: 5, name: 'Pod Fill',                startBase: 75, endBase: 95  },
    { order: 6, name: 'Maturity & Harvest',      startBase: 95, endBase: target + 10 },
  ].map((s) => ({
    ...s,
    start: round(s.startBase * scale),
    end: round(s.endBase * scale),
  }));
};

// ─── Trigger templates per stage ─────────────────────────────────────

const TRIGGER_TEMPLATES = {
  'Germination & Emergence': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 22, optimal_max: 30, critical_min: 15, critical_max: 35,
      urgency_above: 'high', urgency_below: 'medium',
      icon: '🌡️',
      advisory_template_en: '{varietyName} germination needs 22–30°C. Observed {observedValue} is past the {threshold} threshold — emergence will be uneven, gaps in rows.',
      recommended_action_en: 'If hot, delay sowing to evening of next rain. Light irrigation cools the soil.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 40, critical_min: null, critical_max: 70,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: '{observedValue} rain on freshly-sown {varietyName} = waterlogging risk above {threshold}. Soybean seedlings die after 24h underwater.',
      recommended_action_en: 'Open all drainage cuts immediately. If gaps appear, gap-fill within 7 days of emergence.',
    },
    {
      parameter_code: 'soil_moisture_percent',
      optimal_min: 25, optimal_max: 50, critical_min: 18, critical_max: 70,
      urgency_above: 'high', urgency_below: 'high',
      icon: '🟫',
      advisory_template_en: 'Soil moisture {observedValue} is past the {threshold} comfort line for {varietyName} emergence.',
      recommended_action_en: 'If too dry, light irrigation. If too wet, open drains to prevent rotting.',
    },
  ],
  'Vegetative Growth': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 25, optimal_max: 32, critical_min: 18, critical_max: 36,
      urgency_above: 'medium', urgency_below: 'medium',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is in vegetative growth. Observed {observedValue} is past the {threshold} band — node count and canopy biomass will be lower.',
      recommended_action_en: 'Top-dress with phosphorus + potassium. Maintain weed control until canopy closes.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 85, critical_min: 40, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} vegetative growth is below {threshold}. Stress symptoms — leaf rolling, slow node addition.',
      recommended_action_en: 'Irrigate if water available. Watch for whitefly which thrives in dry weather.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 50, critical_min: null, critical_max: 100,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) on {varietyName} vegetative crop — risk of waterlogging in low spots and leaf disease pressure rising.',
      recommended_action_en: 'Open drainage cuts. Spray Mancozeb 75 WP @ 2 g/L preventively after the rain stops.',
    },
  ],
  Flowering: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 24, optimal_max: 30, critical_min: 18, critical_max: 35,
      urgency_above: 'critical', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is FLOWERING. Observed {observedValue} is past the {threshold} cap — pod set drops sharply above 35°C. This is the #1 yield killer for soybean in central India.',
      recommended_action_en: 'CRITICAL: irrigate immediately to cool canopy. Foliar spray KNO3 (1%) at 6 AM for the next 3 days. Postpone any other operation.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 65, optimal_max: 85, critical_min: 45, critical_max: null,
      urgency_below: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} flowering is below the {threshold} threshold. Pollen sterility risk; flowers will abort.',
      recommended_action_en: 'Maintain field moisture. Foliar mist if available.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 60,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) at {varietyName} flowering washes pollen and promotes Phytophthora root rot.',
      recommended_action_en: 'Open drains. Spray Metalaxyl + Mancozeb @ 2 g/L within 48h.',
    },
  ],
  'Pod Formation': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 22, optimal_max: 30, critical_min: 18, critical_max: 34,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is forming pods. Observed {observedValue} is past the {threshold} cap; pod count drops and pod size shrinks.',
      recommended_action_en: 'Irrigate to maintain canopy temperature. Avoid any insecticide spray that could harm pollinators.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 80, critical_min: 45, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} pod formation is below {threshold}. Pod abortion risk.',
      recommended_action_en: 'Top up irrigation. Foliar spray boric acid (0.1%) for better pod retention.',
    },
  ],
  'Pod Fill': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 21, optimal_max: 28, critical_min: 16, critical_max: 32,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} at pod fill — direct seed-weight loss above {threshold}. Observed {observedValue} is shrinking the seeds.',
      recommended_action_en: 'Maintain irrigation cycle every 8–10 days through pod fill. Do NOT cut water until seeds are firm.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 55, optimal_max: 80, critical_min: 40, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} during {varietyName} pod fill is below {threshold}. Premature drying risk; seeds will be light.',
      recommended_action_en: 'Keep field at field capacity until pods turn yellow.',
    },
  ],
  'Maturity & Harvest': [
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 20, critical_min: null, critical_max: 50,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Pre-harvest rain ({observedValue}) on mature {varietyName} causes pod splitting and seed sprouting in pods. Plan harvest in next dry window.',
      recommended_action_en: 'Walk the field. If 90% of pods are brown and forecast is dry, harvest immediately.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: null, optimal_max: 75, critical_min: null, critical_max: 90,
      urgency_above: 'medium',
      icon: '💧',
      advisory_template_en: 'High humidity ({observedValue}) on mature {varietyName} = pod molding and seed quality drop.',
      recommended_action_en: 'Harvest within 3 days. Sun-dry threshed seed to 11% moisture before bagging.',
    },
    {
      parameter_code: 'wind_speed_kmh',
      optimal_min: null, optimal_max: 25, critical_min: null, critical_max: 40,
      urgency_above: 'medium',
      icon: '💨',
      advisory_template_en: 'Wind at {observedValue}km/h on standing mature {varietyName} — pod shattering risk above {threshold}km/h. Direct yield loss to the ground.',
      recommended_action_en: 'Harvest within 24 hours. Cut early morning when pods are slightly damp to reduce shattering.',
    },
  ],
};

// ─── Pest susceptibility templates per stage ─────────────────────────

const PEST_TEMPLATES = {
  'Germination & Emergence': [
    { pest_code: 'stem_fly', pest_name_en: 'Stem fly', pest_name_hi: 'तना मक्खी', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🪰',
      advisory_template_en: 'Stem fly reports {severity} regionally. {varietyName} young seedlings are vulnerable — central shoot wilting and bending.',
      recommended_action_en: 'Spray Thiamethoxam 25 WG @ 0.2 g/L on first detection. Seed treatment with Imidacloprid prevents this if not done.' },
    { pest_code: 'collar_rot', pest_name_en: 'Collar rot', pest_name_hi: 'कॉलर रॉट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Collar rot {severity} in your district. {varietyName} seedlings damping off — check soil line for white fungal mat.',
      recommended_action_en: 'Drench with Carbendazim 50 WP @ 1 g/L around the collar region. Ensure good drainage.' },
  ],
  'Vegetative Growth': [
    { pest_code: 'spodoptera', pest_name_en: 'Tobacco caterpillar (Spodoptera litura)', pest_name_hi: 'तंबाकू सूंडी', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Spodoptera pressure {severity} in your area — {varietyName} can be defoliated to skeleton in 5 days. THIS IS A FARMERPAY ALERT.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L OR Emamectin benzoate 5 SG @ 0.4 g/L immediately. Use evening application.' },
    { pest_code: 'whitefly', pest_name_en: 'Whitefly', pest_name_hi: 'सफेद मक्खी', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🪰',
      advisory_template_en: 'Whitefly pressure {severity}. {varietyName} is vulnerable AND whitefly transmits Yellow Mosaic Virus — the bigger threat.',
      recommended_action_en: 'Spray Diafenthiuron 50 WP @ 1.2 g/L. Install yellow sticky traps @ 20/acre.' },
    { pest_code: 'girdle_beetle', pest_name_en: 'Girdle beetle', pest_name_hi: 'गर्डल बीटल', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🪲',
      advisory_template_en: 'Girdle beetle {severity} regionally. {varietyName} stems show two girdling cuts — affected branches snap and dry.',
      recommended_action_en: 'Spray Triazophos 40 EC @ 1.5 ml/L OR Indoxacarb 14.5 SC @ 0.5 ml/L on first detection.' },
  ],
  Flowering: [
    { pest_code: 'spodoptera', pest_name_en: 'Tobacco caterpillar (Spodoptera litura)', pest_name_hi: 'तंबाकू सूंडी', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Spodoptera at {severity} during {varietyName} flowering — caterpillars eat flowers directly. Yield loss is immediate and irreversible. FARMERPAY ALERT.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L within 24h. Use evening application to spare pollinators.' },
    { pest_code: 'ymv', pest_name_en: 'Yellow Mosaic Virus (YMV)', pest_name_hi: 'पीला मोज़ेक विषाणु', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🦠',
      advisory_template_en: '🚨 YMV pressure {severity} in your district — vectored by whitefly. {varietyName} can lose 30–60% yield if infection takes hold during flowering. FARMERPAY ALERT.',
      recommended_action_en: 'Control whitefly aggressively (Diafenthiuron 50 WP @ 1.2 g/L). Rogue infected plants. There is NO cure once infected.' },
    { pest_code: 'rust', pest_name_en: 'Soybean rust', pest_name_hi: 'सोयाबीन रतुआ', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Rust pressure {severity}. {varietyName} flowering canopy is at risk — yellow specks turning to brown pustules on lower leaves first.',
      recommended_action_en: 'Spray Hexaconazole 5 EC @ 2 ml/L OR Tebuconazole 25 EC @ 1 ml/L. Re-spray after 12 days.' },
  ],
  'Pod Formation': [
    { pest_code: 'pod_borer', pest_name_en: 'Pod borer', pest_name_hi: 'फली छेदक', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Pod borer {severity} during {varietyName} pod formation — direct yield loss as caterpillars feed inside pods.',
      recommended_action_en: 'Spray Indoxacarb 14.5 SC @ 0.5 ml/L OR Lambda-cyhalothrin 5 EC @ 1 ml/L on first detection.' },
    { pest_code: 'rust', pest_name_en: 'Soybean rust', pest_name_hi: 'सोयाबीन रतुआ', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Rust {severity} during {varietyName} pod formation — direct hit on photosynthetic surface that fills the pods.',
      recommended_action_en: 'Spray Hexaconazole 5 EC @ 2 ml/L immediately. Critical to maintain healthy lower canopy.' },
    { pest_code: 'stink_bug', pest_name_en: 'Stink bug', pest_name_hi: 'गंध कीट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🪲',
      advisory_template_en: 'Stink bug reports {severity}. {varietyName} pods get punctured and seeds shrink — quality downgrade at the mandi.',
      recommended_action_en: 'Spray Lambda-cyhalothrin 5 EC @ 1 ml/L on first detection.' },
  ],
  'Pod Fill': [
    { pest_code: 'pod_borer', pest_name_en: 'Pod borer', pest_name_hi: 'फली छेदक', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Pod borer {severity} during {varietyName} pod fill — borers eat developing seeds inside the pod. Yield loss is direct and unrecoverable.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L immediately. Use a sticker for better pod coverage.' },
    { pest_code: 'charcoal_rot', pest_name_en: 'Charcoal rot', pest_name_hi: 'चारकोल रॉट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Charcoal rot {severity} regionally. {varietyName} wilts prematurely under heat stress; cut a stem and look for grey/black streaks.',
      recommended_action_en: 'Maintain irrigation to reduce stress. No effective spray once visible — manage with rotation next season.' },
  ],
  'Maturity & Harvest': [
    { pest_code: 'storage_pests', pest_name_en: 'Storage pests', pest_name_hi: 'भंडारण कीट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'high', icon: '🐛',
      advisory_template_en: 'Storage pest {severity} reports. Once harvested, {varietyName} seed must be dried below 11% moisture before bagging.',
      recommended_action_en: 'Sun-dry threshed seed for 2 days. Use neem leaves or DE in storage bags.' },
    { pest_code: 'pre_harvest_sprout', pest_name_en: 'Pre-harvest pod sprouting', pest_name_hi: 'फली में अंकुरण', susceptibility_level: 'low', triggered_when_regional_severity_at_least: 'high', icon: '🌱',
      advisory_template_en: 'Wet weather warning for mature {varietyName} — seeds can germinate inside the pod. Quality and germination drop.',
      recommended_action_en: 'Harvest within 24 hours of pods drying. Do not delay for "perfect" weather windows in wet years.' },
  ],
};

const downgradeForHybrid = (susc) => {
  const map = { very_high: 'high', high: 'medium', medium: 'low', low: 'low' };
  return map[susc] || susc;
};

// ─── Seeder ──────────────────────────────────────────────────────────

module.exports = {
  async up(queryInterface) {
    const [crops] = await queryInterface.sequelize.query(
      "SELECT crop_id, crop_code FROM crop_masters WHERE crop_code = 'SOYBEAN' LIMIT 1"
    );
    if (!crops || crops.length === 0) return;
    const soybeanCropId = crops[0].crop_id;

    const [soils] = await queryInterface.sequelize.query(
      "SELECT id, soil_type_code FROM soil_types WHERE soil_type_code IN ('alluvial', 'ALLUVIAL') LIMIT 1"
    );
    if (!soils || soils.length === 0) return;
    const alluvialSoilId = soils[0].id;

    const now = new Date();

    // Bootstrap soybean varieties
    const [existingVars] = await queryInterface.sequelize.query(
      'SELECT variety_id, variety_code FROM variety_masters WHERE variety_code IN (:codes)',
      { replacements: { codes: SOYBEAN_VARIETIES.map((v) => v.code) } }
    );
    const existingByCode = {};
    for (const e of existingVars) existingByCode[e.variety_code] = e.variety_id;

    const varietyRowsToInsert = [];
    for (const v of SOYBEAN_VARIETIES) {
      if (existingByCode[v.code]) continue;
      varietyRowsToInsert.push({
        variety_id: uuidv4(),
        crop_id: soybeanCropId,
        variety_name: v.name,
        variety_code: v.code,
        variety_description: v.desc,
        duration_days_min: v.durationMin,
        duration_days_max: v.durationMax,
        expected_yield_kg_per_hectare: v.yield,
        seed_company: null,
        seed_treatment_recommended: true,
        is_hybrid: v.hybrid,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }
    if (varietyRowsToInsert.length > 0) {
      await queryInterface.bulkInsert('variety_masters', varietyRowsToInsert);
    }

    const [varietyRows] = await queryInterface.sequelize.query(
      'SELECT variety_id, variety_code, variety_name, duration_days_min, duration_days_max, is_hybrid FROM variety_masters WHERE variety_code IN (:codes)',
      { replacements: { codes: SOYBEAN_VARIETIES.map((v) => v.code) } }
    );

    for (const variety of varietyRows) {
      const popName = `Soybean — ${variety.variety_name} on Alluvial Soil — Phase 2A`;

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
          crop_id: soybeanCropId,
          variety_id: variety.variety_id,
          soil_type_id: alluvialSoilId,
          climate_zone_id: null,
          state_id: null,
          pop_name: popName,
          pop_description: `Soybean cultivation package of practice for ${variety.variety_name} on alluvial soil. Phase 2A — engine-readable stage triggers.`,
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
        variety.duration_days_min || 95,
        variety.duration_days_max || 105
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
      "SELECT id, pop_uuid FROM package_of_practices WHERE pop_name LIKE 'Soybean — %%on Alluvial Soil — Phase 2A'"
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
