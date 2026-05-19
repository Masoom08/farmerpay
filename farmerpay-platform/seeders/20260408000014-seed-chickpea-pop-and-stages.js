'use strict';

/**
 * SAGE Phase 2A — Chickpea Package of Practice + stage triggers + pest risk.
 *
 * Chickpea is the **largest pulse crop in India by area** (~10–12 million
 * hectares — dominant in MP, Maharashtra, Rajasthan, UP, Karnataka). Rabi
 * crop, sown October–November, harvested February–March, ~95–130 day cycle
 * depending on variety and zone.
 *
 * Chickpea's defining sensitivities:
 *   1. **Terminal heat stress at flowering and podding** — temps > 30°C
 *      cause flower drop and pod abortion. This is the #1 yield killer
 *      across central India in years with early March heat spikes.
 *   2. **Helicoverpa armigera (gram pod borer)** — devastating, can cause
 *      60–90% losses if untreated. Triggered at LOW regional severity for
 *      early warning.
 *   3. **Fusarium wilt** — soil-borne, no in-season cure. Modeled with
 *      LOW severity trigger so the farmer is alerted to rogue affected
 *      plants and rotate next season.
 *   4. **Frost at flowering** — kills flowers in north Indian belts (UP,
 *      Punjab, Haryana) — modeled via critical_min on the temperature
 *      trigger at flowering and podding stages.
 *
 * The 5 varieties are not in the Phase 1 variety_master seeder, so this
 * seeder bootstraps them inline before creating PoPs. Idempotent.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Chickpea variety bootstrap ──────────────────────────────────────

const CHICKPEA_VARIETIES = [
  { code: 'JG11',     name: 'JG 11',                  durationMin: 95,  durationMax: 110, yield: 1800, hybrid: false, desc: 'Most widely grown desi chickpea in India. ICAR-Indore release. Mid-early maturity, broad adaptation across MP and Maharashtra. Wilt-tolerant.' },
  { code: 'VIJAY',    name: 'Vijay (Vishal)',         durationMin: 100, durationMax: 115, yield: 1900, hybrid: false, desc: 'Popular Maharashtra variety. Bold seeded desi, good market premium.' },
  { code: 'JAKI9218', name: 'JAKI 9218',              durationMin: 105, durationMax: 120, yield: 2000, hybrid: false, desc: 'Wilt-resistant desi variety dominant in central India. Good yield even on marginal soils.' },
  { code: 'KAK2',     name: 'KAK 2',                  durationMin: 110, durationMax: 125, yield: 1700, hybrid: false, desc: 'Large-seeded kabuli type. Premium export market. Sensitive to heat at podding.' },
  { code: 'PUSA1108', name: 'Pusa 1108',              durationMin: 100, durationMax: 115, yield: 2100, hybrid: false, desc: 'Newer high-yielding variety with broad adaptation. Good Ascochyta blight resistance.' },
];

// ─── Stage definitions ───────────────────────────────────────────────

const buildStages = (durationMin, durationMax) => {
  // Anchor reference: JG 11-style 110-day cycle.
  const baseAnchor = 110;
  const target = Math.max(durationMin, durationMax || baseAnchor);
  const scale = target / baseAnchor;
  const round = (n) => Math.round(n);
  return [
    { order: 1, name: 'Germination',         startBase: 0,   endBase: 10  },
    { order: 2, name: 'Vegetative',          startBase: 10,  endBase: 40  },
    { order: 3, name: 'Flowering',           startBase: 40,  endBase: 65  },
    { order: 4, name: 'Pod Formation',       startBase: 65,  endBase: 85  },
    { order: 5, name: 'Pod Fill',            startBase: 85,  endBase: 105 },
    { order: 6, name: 'Maturity & Harvest',  startBase: 105, endBase: target + 10 },
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
      optimal_min: 18, optimal_max: 27, critical_min: 8, critical_max: 32,
      urgency_above: 'medium', urgency_below: 'medium',
      icon: '🌡️',
      advisory_template_en: '{varietyName} germination needs 18–27°C. Observed {observedValue} is past the {threshold} threshold — emergence will be uneven and stand will be patchy.',
      recommended_action_en: 'If hot, light evening irrigation cools the seed bed. If cold, delay sowing 3–5 days.',
    },
    {
      parameter_code: 'soil_moisture_percent',
      optimal_min: 25, optimal_max: 45, critical_min: 15, critical_max: 60,
      urgency_above: 'high', urgency_below: 'high',
      icon: '🟫',
      advisory_template_en: 'Soil moisture {observedValue} is past the {threshold} comfort line for {varietyName} germination — chickpea is prone to seed rot in wet soil and will not emerge in dry soil.',
      recommended_action_en: 'Open drains if wet. Light pre-sowing irrigation if too dry. Treat seed with Trichoderma + Vitavax before sowing.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 20, critical_min: null, critical_max: 50,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) on freshly-sown {varietyName} = seed rot risk above {threshold}. Chickpea is the most rot-prone of all rabi crops.',
      recommended_action_en: 'Open all drainage cuts immediately. Re-sow gaps after 7 days if emergence < 70%.',
    },
  ],
  Vegetative: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 15, optimal_max: 25, critical_min: 5, critical_max: 30,
      urgency_above: 'medium', urgency_below: 'medium',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is in vegetative growth. Observed {observedValue} is past the {threshold} band — branching slows and biomass build-up is reduced.',
      recommended_action_en: 'Maintain moisture. Apply phosphorus + potassium top-dress if not done at sowing.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 50, optimal_max: 75, critical_min: 30, critical_max: 90,
      urgency_above: 'medium', urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} vegetative growth is past the {threshold} band. High humidity invites Botrytis grey mould; low humidity stresses the plant.',
      recommended_action_en: 'If humid, scout for grey mould on lower leaves. If dry, irrigate.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 60,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) on {varietyName} vegetative crop — risk of waterlogging in low spots and Ascochyta blight pressure rising.',
      recommended_action_en: 'Open drainage cuts. Spray Mancozeb 75 WP @ 2 g/L preventively after the rain stops.',
    },
  ],
  Flowering: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 18, optimal_max: 26, critical_min: 5, critical_max: 30,
      urgency_above: 'critical', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is FLOWERING. Observed {observedValue} is past the {threshold} threshold — terminal heat stress causes flower drop. This is the #1 yield killer for chickpea in central India.',
      recommended_action_en: 'CRITICAL: light irrigation now to cool canopy. Foliar spray KNO3 (1%) at 6 AM. Postpone any other operation. If cold/frost, light evening irrigation traps heat.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 50, optimal_max: 75, critical_min: 35, critical_max: 90,
      urgency_above: 'high', urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} during {varietyName} flowering — high humidity = Botrytis grey mould (kills flowers); low humidity = pollen sterility.',
      recommended_action_en: 'If high humidity, spray Carbendazim 50 WP @ 1 g/L. If low, irrigate.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 20, critical_min: null, critical_max: 40,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Rain ({observedValue}) at {varietyName} flowering washes flowers and accelerates Botrytis. Chickpea hates wet feet at flowering.',
      recommended_action_en: 'Open drains. Spray Carbendazim 50 WP @ 1 g/L within 48h post-rain.',
    },
  ],
  'Pod Formation': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 16, optimal_max: 25, critical_min: 5, critical_max: 30,
      urgency_above: 'critical', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is forming pods. Observed {observedValue} is past the {threshold} cap — pod abortion above 30°C is direct yield loss. Frost below 5°C kills developing pods.',
      recommended_action_en: 'Light irrigation to maintain canopy temperature. Foliar spray KNO3 (1%) for pod set. Avoid any insecticide that could harm pollinators.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 50, optimal_max: 75, critical_min: 35, critical_max: 85,
      urgency_above: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} pod formation past {threshold} — Botrytis pressure rising on the developing pods.',
      recommended_action_en: 'Spray Carbendazim 50 WP @ 1 g/L if grey lesions visible on pods.',
    },
  ],
  'Pod Fill': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 16, optimal_max: 25, critical_min: 6, critical_max: 32,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} at pod fill — direct seed-weight loss above {threshold}. Observed {observedValue} is shrinking the seeds. Late February/March heat is the chickpea killer in MP.',
      recommended_action_en: 'Maintain irrigation cycle. Foliar spray thiourea (500 ppm) reduces heat stress. Do NOT cut water until pods turn yellow.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 45, optimal_max: 70, critical_min: 30, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} during {varietyName} pod fill is below {threshold}. Premature drying; seeds will be light and small.',
      recommended_action_en: 'Top up irrigation. Last irrigation should be 10–14 days before harvest.',
    },
  ],
  'Maturity & Harvest': [
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 15, critical_min: null, critical_max: 35,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Pre-harvest rain ({observedValue}) on mature {varietyName} causes pod splitting, seed germination in pods, and discoloration. Quality drops sharply.',
      recommended_action_en: 'Walk the field. If 90% of pods are dry and forecast is clear, harvest immediately. Do not wait.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: null, optimal_max: 70, critical_min: null, critical_max: 85,
      urgency_above: 'medium',
      icon: '💧',
      advisory_template_en: 'High humidity ({observedValue}) on mature {varietyName} = pod molding and bruchid attack risk in storage.',
      recommended_action_en: 'Harvest within 3 days. Sun-dry threshed seed to 10% moisture before bagging.',
    },
    {
      parameter_code: 'temp_celsius',
      optimal_min: null, optimal_max: 32, critical_min: null, critical_max: 38,
      urgency_above: 'medium',
      icon: '🌡️',
      advisory_template_en: 'Pre-harvest heat ({observedValue}) on {varietyName} — seeds shrinking faster than normal. Harvest at the earliest dry window.',
      recommended_action_en: 'Schedule harvest within 3 days. Sun-dry seed before storage.',
    },
  ],
};

// ─── Pest susceptibility templates per stage ─────────────────────────

const PEST_TEMPLATES = {
  Germination: [
    { pest_code: 'cutworm', pest_name_en: 'Cutworm', pest_name_hi: 'कटवर्म', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Cutworm reports {severity} regionally. {varietyName} young seedlings cut at the soil line — gaps appear in rows.',
      recommended_action_en: 'Apply Chlorpyriphos 20 EC @ 2.5 L/ha as a soil drench around the rows in the evening.' },
    { pest_code: 'collar_rot', pest_name_en: 'Collar rot', pest_name_hi: 'कॉलर रॉट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Collar rot {severity} in your district. {varietyName} seedlings damping off — collar region rots and plants topple.',
      recommended_action_en: 'Drench with Carbendazim 50 WP @ 1 g/L around the collar. Ensure good drainage. Treat seed with Trichoderma next season.' },
  ],
  Vegetative: [
    { pest_code: 'wilt', pest_name_en: 'Fusarium wilt', pest_name_hi: 'उकठा (विल्ट)', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🦠',
      advisory_template_en: '🚨 Fusarium wilt {severity} reports in your district — {varietyName} plants will yellow from the base, lower leaves wilt, no recovery. SOIL-BORNE — no in-season cure. FARMERPAY ALERT.',
      recommended_action_en: 'Rogue and burn affected plants. Spot-drench remaining plants with Carbendazim 50 WP @ 1 g/L. Note this field for crop rotation next season — do NOT plant chickpea here for 3 years.' },
    { pest_code: 'aphid', pest_name_en: 'Aphid', pest_name_hi: 'चेपा', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Aphid {severity} in your area. {varietyName} young growth attractive — clusters on shoot tips. Aphids transmit virus diseases too.',
      recommended_action_en: 'Spray Imidacloprid 17.8 SL @ 0.3 ml/L on first detection.' },
    { pest_code: 'ascochyta_blight', pest_name_en: 'Ascochyta blight', pest_name_hi: 'एस्कोकाइटा झुलसा', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Ascochyta blight {severity} reports in your district. {varietyName} leaves show small brown spots that expand into concentric rings. Spreads fast in cool wet weather.',
      recommended_action_en: 'Spray Mancozeb 75 WP @ 2 g/L OR Chlorothalonil 75 WP @ 2 g/L. Re-spray after 12 days if rain continues.' },
  ],
  Flowering: [
    { pest_code: 'pod_borer', pest_name_en: 'Gram pod borer (Helicoverpa armigera)', pest_name_hi: 'चना फली छेदक (हेलिकोवर्पा)', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Helicoverpa pod borer {severity} during {varietyName} flowering — caterpillars eat flowers AND will move to pods next. Untreated infestations cause 60–90% losses. THIS IS A FARMERPAY ALERT.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L OR Emamectin benzoate 5 SG @ 0.4 g/L immediately. Use evening application. Install pheromone traps @ 5/acre.' },
    { pest_code: 'botrytis', pest_name_en: 'Botrytis grey mould', pest_name_hi: 'बोट्राइटिस ग्रे मोल्ड', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Botrytis grey mould {severity} regionally — {varietyName} flowers and tender pods rotting with grey fuzz. Cool wet weather makes it explosive.',
      recommended_action_en: 'Spray Carbendazim 50 WP @ 1 g/L immediately. Improve air circulation by avoiding dense stands.' },
    { pest_code: 'wilt', pest_name_en: 'Fusarium wilt', pest_name_hi: 'उकठा (विल्ट)', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'low', icon: '🦠',
      advisory_template_en: 'Wilt {severity} in your district. {varietyName} flowering plants wilting from base — late wilt is just as deadly as early wilt.',
      recommended_action_en: 'Rogue affected plants. Drench with Carbendazim around remaining plants. Mark field for rotation.' },
  ],
  'Pod Formation': [
    { pest_code: 'pod_borer', pest_name_en: 'Gram pod borer (Helicoverpa armigera)', pest_name_hi: 'चना फली छेदक', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Helicoverpa during {varietyName} pod formation = the caterpillar bores into pods and eats developing seeds. Direct yield loss. FARMERPAY ALERT — losses can exceed ₹15,000/acre.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L immediately. Re-spray after 10 days. Hand-collect older larvae if pheromone traps show high catches.' },
    { pest_code: 'stink_bug', pest_name_en: 'Stink bug', pest_name_hi: 'गंध कीट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🪲',
      advisory_template_en: 'Stink bug reports {severity}. {varietyName} pods get punctured and seeds shrink — quality downgrade at the mandi.',
      recommended_action_en: 'Spray Lambda-cyhalothrin 5 EC @ 1 ml/L on first detection.' },
  ],
  'Pod Fill': [
    { pest_code: 'pod_borer', pest_name_en: 'Gram pod borer (Helicoverpa armigera)', pest_name_hi: 'चना फली छेदक', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Pod borer {severity} during {varietyName} pod fill — late-instar caterpillars destroy seeds inside the pod. THE single biggest yield killer for chickpea. FARMERPAY ALERT.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L OR Emamectin benzoate 5 SG @ 0.4 g/L. Use sticker for better pod coverage.' },
    { pest_code: 'dry_root_rot', pest_name_en: 'Dry root rot', pest_name_hi: 'सूखी जड़ सड़न', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Dry root rot reports {severity}. {varietyName} wilts during the day under heat stress; cut a plant and look for shredded roots.',
      recommended_action_en: 'Maintain irrigation to reduce stress. No effective in-season spray — manage with rotation and seed treatment next season.' },
  ],
  'Maturity & Harvest': [
    { pest_code: 'storage_pests', pest_name_en: 'Storage pests (bruchids)', pest_name_hi: 'भंडारण कीट', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Bruchid (pulse beetle) pressure {severity}. Chickpea is the most bruchid-prone pulse — eggs are laid on field-mature pods and hatch in storage.',
      recommended_action_en: 'Sun-dry threshed seed for 3 days. Mix neem leaves into bags. Use airtight metal bins for long storage.' },
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
      "SELECT crop_id, crop_code FROM crop_masters WHERE crop_code = 'CHICKPEA' LIMIT 1"
    );
    if (!crops || crops.length === 0) return;
    const chickpeaCropId = crops[0].crop_id;

    const [soils] = await queryInterface.sequelize.query(
      "SELECT id, soil_type_code FROM soil_types WHERE soil_type_code IN ('alluvial', 'ALLUVIAL') LIMIT 1"
    );
    if (!soils || soils.length === 0) return;
    const alluvialSoilId = soils[0].id;

    const now = new Date();

    // Bootstrap chickpea varieties (Phase 1 didn't seed them)
    const [existingVars] = await queryInterface.sequelize.query(
      'SELECT variety_id, variety_code FROM variety_masters WHERE variety_code IN (:codes)',
      { replacements: { codes: CHICKPEA_VARIETIES.map((v) => v.code) } }
    );
    const existingByCode = {};
    for (const e of existingVars) existingByCode[e.variety_code] = e.variety_id;

    const varietyRowsToInsert = [];
    for (const v of CHICKPEA_VARIETIES) {
      if (existingByCode[v.code]) continue;
      varietyRowsToInsert.push({
        variety_id: uuidv4(),
        crop_id: chickpeaCropId,
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
      { replacements: { codes: CHICKPEA_VARIETIES.map((v) => v.code) } }
    );

    for (const variety of varietyRows) {
      const popName = `Chickpea — ${variety.variety_name} on Alluvial Soil — Phase 2A`;

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
          crop_id: chickpeaCropId,
          variety_id: variety.variety_id,
          soil_type_id: alluvialSoilId,
          climate_zone_id: null,
          state_id: null,
          pop_name: popName,
          pop_description: `Chickpea cultivation package of practice for ${variety.variety_name} on alluvial soil. Phase 2A — engine-readable stage triggers.`,
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
        variety.duration_days_max || 110
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
      "SELECT id, pop_uuid FROM package_of_practices WHERE pop_name LIKE 'Chickpea — %%on Alluvial Soil — Phase 2A'"
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
