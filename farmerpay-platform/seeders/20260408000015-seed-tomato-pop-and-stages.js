'use strict';

/**
 * SAGE Phase 2A — Tomato (HORTI / Vegetables) Package of Practice +
 * stage triggers + pest risk.
 *
 * Tomato is the **highest-acreage vegetable in India** (~0.8 M hectares,
 * year-round across nearly every state — biggest belts in MP, Karnataka,
 * AP, Bihar, Maharashtra, Odisha). Selected as the canonical "vegetables"
 * representative for the HORTI sub-flow because every state grows it,
 * the pest profile is widely understood, and the price volatility makes
 * it a high-value SAGE target.
 *
 * Tomato's defining sensitivities:
 *   1. **Heat at flowering / fruit set** — temps > 32°C cause flower drop
 *      and fruit set failure. The single biggest yield killer in north
 *      Indian summer plantings.
 *   2. **Tomato Leaf Curl Virus (ToLCV)** vectored by whitefly — can wipe
 *      40-70% of yield in heavy years. Triggered at LOW regional severity
 *      for early warning, similar to soybean YMV pattern.
 *   3. **Late blight** (Phytophthora infestans) — devastating during cool
 *      humid spells, can kill plants in 5 days. Critical at flowering and
 *      fruit fill.
 *   4. **Fruit borer** (Helicoverpa armigera) — same beast as chickpea
 *      pod borer, attacks tomato fruits directly.
 *   5. **Waterlogging at any stage** — tomato is intolerant of standing
 *      water > 12h.
 *
 * The 5 varieties below are not in the Phase 1 variety_master seeder, so
 * this seeder bootstraps them inline before creating PoPs. Idempotent.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Tomato variety bootstrap ────────────────────────────────────────

const TOMATO_VARIETIES = [
  { code: 'PUSARUBY',  name: 'Pusa Ruby',                    durationMin: 90,  durationMax: 110, yield: 32500, hybrid: false, desc: 'Open-pollinated determinate variety. Medium-sized fruits, suited for rainfed conditions across north India. Disease-tolerant, popular smallholder choice.' },
  { code: 'ARKAVIKAS', name: 'Arka Vikas',                   durationMin: 100, durationMax: 120, yield: 35000, hybrid: false, desc: 'IIHR Bangalore release. Indeterminate, slightly elongated fruits, broad south Indian adoption. Good shelf life.' },
  { code: 'PUSASAB',   name: 'Pusa Sadabahar',               durationMin: 100, durationMax: 120, yield: 30000, hybrid: false, desc: 'Heat tolerant — sets fruit even at 35°C. Good for summer plantings in northern plains.' },
  { code: 'AVTAR',     name: 'Hybrid Avtar (Mahyco)',        durationMin: 95,  durationMax: 110, yield: 60000, hybrid: true,  desc: 'Indeterminate hybrid. Very high yield potential, good market premium. Resistant to ToLCV in moderate pressure.' },
  { code: 'HEEMSOHNA', name: 'Heem Sohna (Syngenta)',        durationMin: 100, durationMax: 115, yield: 65000, hybrid: true,  desc: 'Hybrid indeterminate, firm uniform fruits. Long shelf life — preferred by traders. ToLCV-tolerant.' },
];

// ─── Stage definitions ───────────────────────────────────────────────

const buildStages = (durationMin, durationMax) => {
  const baseAnchor = 110;
  const target = Math.max(durationMin, durationMax || baseAnchor);
  const scale = target / baseAnchor;
  const round = (n) => Math.round(n);
  return [
    { order: 1, name: 'Nursery & Transplant', startBase: 0,  endBase: 30  },
    { order: 2, name: 'Vegetative',           startBase: 30, endBase: 50  },
    { order: 3, name: 'Flowering & Fruit Set', startBase: 50, endBase: 70 },
    { order: 4, name: 'Fruit Development',    startBase: 70, endBase: 90  },
    { order: 5, name: 'Harvest Window',       startBase: 90, endBase: target + 10 },
  ].map((s) => ({
    ...s,
    start: round(s.startBase * scale),
    end: round(s.endBase * scale),
  }));
};

// ─── Trigger templates per stage ─────────────────────────────────────

const TRIGGER_TEMPLATES = {
  'Nursery & Transplant': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 20, optimal_max: 28, critical_min: 12, critical_max: 35,
      urgency_above: 'high', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} nursery seedlings are heat-stressed at {observedValue} — past the {threshold} tolerance. Transplant shock will be severe.',
      recommended_action_en: 'Shade the nursery beds with shade nets or banana leaves. Irrigate seedlings in the early morning. Postpone transplanting until temperatures drop below 30°C.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 85, critical_min: 35, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} is below {threshold} for {varietyName} nursery — seedling wilt risk.',
      recommended_action_en: 'Mist seedlings twice daily. Ensure shade net cover.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 60,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) on freshly-transplanted {varietyName} = root rot risk. Tomato cannot tolerate waterlogging > 12 hours.',
      recommended_action_en: 'Open all drainage cuts immediately. Drench roots with Carbendazim 50 WP @ 1 g/L if waterlogged > 6h.',
    },
  ],
  Vegetative: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 22, optimal_max: 30, critical_min: 14, critical_max: 35,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} vegetative growth slows at {observedValue} — past the {threshold} threshold. Plant height + leaf area drop, future fruit count compromised.',
      recommended_action_en: 'Top up irrigation. Apply foliar potassium 1% to reduce heat stress. Mulch the rows.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 80, critical_min: 40, critical_max: 90,
      urgency_above: 'medium', urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} is past the {threshold} comfort band for {varietyName}. High humidity invites early blight; low humidity stresses the plant.',
      recommended_action_en: 'If humid, scout for early blight (concentric rings on lower leaves). If dry, irrigate.',
    },
  ],
  'Flowering & Fruit Set': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 20, optimal_max: 30, critical_min: 14, critical_max: 32,
      urgency_above: 'critical', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is FLOWERING. Observed {observedValue} is past the {threshold} critical cap — flower drop and fruit set failure imminent. THIS IS THE #1 TOMATO YIELD KILLER.',
      recommended_action_en: 'CRITICAL: light flush irrigation immediately to cool canopy. Foliar spray KNO3 (1%) at 6 AM. Mist plants if water available. Do NOT apply any other operation until temperatures drop.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 80, critical_min: 45, critical_max: 90,
      urgency_above: 'high', urgency_below: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} during {varietyName} flowering is past the {threshold} sterility threshold. Pollen sterility risk; flowers will abort.',
      recommended_action_en: 'Maintain field moisture. Foliar mist if available.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 25, critical_min: null, critical_max: 50,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Rain ({observedValue}) at {varietyName} flowering washes pollen and brings late blight pressure.',
      recommended_action_en: 'Open drains. Spray Mancozeb 75 WP @ 2 g/L preventively within 48h post-rain.',
    },
  ],
  'Fruit Development': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 20, optimal_max: 28, critical_min: 14, critical_max: 33,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} at fruit fill — temperatures past {threshold} cause sun-scald and small fruit. Observed {observedValue} is shrinking the harvest.',
      recommended_action_en: 'Maintain irrigation cycle every 4-5 days. Mulch the rows. Tie up vines to lift fruits off hot soil.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 55, optimal_max: 80, critical_min: 40, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} during {varietyName} fruit fill is below {threshold}. Premature ripening; reduced fruit size.',
      recommended_action_en: 'Top up irrigation. Mulch to retain moisture.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 60,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) on developing {varietyName} fruits — cracking and late blight pressure both rise. Open drains immediately.',
      recommended_action_en: 'Open drains. Spray Metalaxyl + Mancozeb @ 2 g/L within 48h to head off late blight.',
    },
  ],
  'Harvest Window': [
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 20, critical_min: null, critical_max: 40,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Pre-harvest rain ({observedValue}) on mature {varietyName} fruits causes cracking and rot in storage. Schedule harvest for the next dry window.',
      recommended_action_en: 'Harvest within 24 hours of pods drying. Sort cracked fruits for immediate sale. Do not pack wet.',
    },
    {
      parameter_code: 'temp_celsius',
      optimal_min: null, optimal_max: 32, critical_min: null, critical_max: 38,
      urgency_above: 'medium',
      icon: '🌡️',
      advisory_template_en: 'Heat ({observedValue}) on mature {varietyName} — fruits over-ripen quickly. Harvest at first morning, store in shade.',
      recommended_action_en: 'Harvest early morning. Pre-cool fruits in shade for 2 hours before transport.',
    },
  ],
};

// ─── Pest susceptibility templates per stage ─────────────────────────

const PEST_TEMPLATES = {
  'Nursery & Transplant': [
    { pest_code: 'damping_off', pest_name_en: 'Damping-off', pest_name_hi: 'अंकुर सड़न', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Damping-off pressure {severity} regionally — {varietyName} seedlings will collapse at the soil line in cool wet weather.',
      recommended_action_en: 'Drench nursery with Carbendazim 50 WP @ 1 g/L. Avoid over-watering. Treat seed with Trichoderma before sowing next time.' },
    { pest_code: 'root_knot', pest_name_en: 'Root-knot nematode', pest_name_hi: 'जड़ गांठ निमेटोड', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🪱',
      advisory_template_en: 'Root-knot nematode {severity} in your area. {varietyName} transplants will show stunted growth + galls on roots — check after 14 days.',
      recommended_action_en: 'Apply Carbofuran 3G @ 25 kg/ha at transplant. Long term: rotate with marigold to break the cycle.' },
  ],
  Vegetative: [
    { pest_code: 'whitefly', pest_name_en: 'Whitefly', pest_name_hi: 'सफेद मक्खी', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🪰',
      advisory_template_en: '🚨 Whitefly {severity} in your area — {varietyName} is highly vulnerable AND whitefly transmits Tomato Leaf Curl Virus (ToLCV) which is the bigger threat. FARMERPAY ALERT.',
      recommended_action_en: 'Spray Diafenthiuron 50 WP @ 1.2 g/L immediately. Install yellow sticky traps @ 25/acre. Use shade nets if possible.' },
    { pest_code: 'tolcv', pest_name_en: 'Tomato Leaf Curl Virus (ToLCV)', pest_name_hi: 'टमाटर पत्ती कुंचन विषाणु', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🦠',
      advisory_template_en: '🚨 ToLCV {severity} regionally — {varietyName} infection causes leaves to curl upward, plants stunt, fruit set fails. 40-70% yield loss possible. NO CURE once infected. FARMERPAY ALERT.',
      recommended_action_en: 'Aggressively control whitefly (Diafenthiuron 50 WP @ 1.2 g/L). Rogue infected plants and burn. Use ToLCV-resistant varieties next season.' },
    { pest_code: 'early_blight', pest_name_en: 'Early blight', pest_name_hi: 'अर्ली ब्लाइट', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Early blight pressure {severity} — {varietyName} lower leaves develop concentric brown rings. Spreads upward fast in humid weather.',
      recommended_action_en: 'Spray Mancozeb 75 WP @ 2 g/L OR Chlorothalonil 75 WP @ 2 g/L on first detection. Re-spray every 10 days.' },
  ],
  'Flowering & Fruit Set': [
    { pest_code: 'whitefly', pest_name_en: 'Whitefly', pest_name_hi: 'सफेद मक्खी', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🪰',
      advisory_template_en: '🚨 Whitefly during {varietyName} flowering — peak pollinator-disturbance window AND ToLCV transmission. Control aggressively but avoid bee-toxic chemicals.',
      recommended_action_en: 'Spray Diafenthiuron 50 WP @ 1.2 g/L in the evening to spare bees. Sticky traps @ 30/acre.' },
    { pest_code: 'fruit_borer', pest_name_en: 'Fruit borer (Helicoverpa)', pest_name_hi: 'फल छेदक', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Fruit borer pressure {severity} during {varietyName} flowering — caterpillars eat flowers AND newly-set fruits. Direct yield loss. FARMERPAY ALERT.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L in the evening. Install pheromone traps @ 8/acre.' },
    { pest_code: 'late_blight', pest_name_en: 'Late blight', pest_name_hi: 'लेट ब्लाइट', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🦠',
      advisory_template_en: '🚨 Late blight {severity} in your district — {varietyName} can be killed in 5 days under cool wet conditions. THIS IS A FARMERPAY ALERT.',
      recommended_action_en: 'Spray Metalaxyl + Mancozeb @ 2 g/L IMMEDIATELY. Repeat every 7 days through fruit fill. Open drains.' },
  ],
  'Fruit Development': [
    { pest_code: 'fruit_borer', pest_name_en: 'Fruit borer (Helicoverpa)', pest_name_hi: 'फल छेदक', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Fruit borer {severity} during {varietyName} fruit fill — caterpillars bore directly into developing fruits. Unrecoverable yield loss per damaged fruit.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L. Hand-pick visible larvae. Pheromone traps @ 8/acre.' },
    { pest_code: 'late_blight', pest_name_en: 'Late blight', pest_name_hi: 'लेट ब्लाइट', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🦠',
      advisory_template_en: '🚨 Late blight {severity} during {varietyName} fruit development — fruits develop greasy brown patches and rot. Spreads to neighbouring fruits in storage.',
      recommended_action_en: 'Spray Metalaxyl + Mancozeb @ 2 g/L. Remove and burn infected fruits. Do NOT pack with healthy fruit.' },
    { pest_code: 'blossom_end_rot', pest_name_en: 'Blossom-end rot', pest_name_hi: 'फूल-अंत सड़न', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🍅',
      advisory_template_en: 'Blossom-end rot {severity} in your area. {varietyName} fruits will show black sunken spots at the bottom — calcium deficiency triggered by inconsistent irrigation.',
      recommended_action_en: 'Foliar spray calcium nitrate (1%) twice at 10-day intervals. Maintain even soil moisture.' },
  ],
  'Harvest Window': [
    { pest_code: 'fruit_borer', pest_name_en: 'Fruit borer (Helicoverpa)', pest_name_hi: 'फल छेदक', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: 'Fruit borer {severity} continues through harvest for {varietyName}. Pick mature fruits before borer reaches them.',
      recommended_action_en: 'Harvest every 2 days. Spray Emamectin benzoate 5 SG @ 0.4 g/L if heavy infestation.' },
    { pest_code: 'storage_rot', pest_name_en: 'Storage rot', pest_name_hi: 'भंडारण सड़न', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Storage rot pressure {severity}. {varietyName} fruits picked wet or damaged will rot in transit, contaminating healthy fruits.',
      recommended_action_en: 'Pick fruits dry. Sort out cracked or damaged fruits. Pre-cool 2 hours in shade before packing.' },
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
      "SELECT crop_id, crop_code FROM crop_masters WHERE crop_code = 'TOMATO' LIMIT 1"
    );
    if (!crops || crops.length === 0) return;
    const tomatoCropId = crops[0].crop_id;

    const [soils] = await queryInterface.sequelize.query(
      "SELECT id, soil_type_code FROM soil_types WHERE soil_type_code IN ('alluvial', 'ALLUVIAL') LIMIT 1"
    );
    if (!soils || soils.length === 0) return;
    const alluvialSoilId = soils[0].id;

    const now = new Date();

    const [existingVars] = await queryInterface.sequelize.query(
      'SELECT variety_id, variety_code FROM variety_masters WHERE variety_code IN (:codes)',
      { replacements: { codes: TOMATO_VARIETIES.map((v) => v.code) } }
    );
    const existingByCode = {};
    for (const e of existingVars) existingByCode[e.variety_code] = e.variety_id;

    const varietyRowsToInsert = [];
    for (const v of TOMATO_VARIETIES) {
      if (existingByCode[v.code]) continue;
      varietyRowsToInsert.push({
        variety_id: uuidv4(),
        crop_id: tomatoCropId,
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
      { replacements: { codes: TOMATO_VARIETIES.map((v) => v.code) } }
    );

    for (const variety of varietyRows) {
      const popName = `Tomato — ${variety.variety_name} on Alluvial Soil — Phase 2A`;

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
          crop_id: tomatoCropId,
          variety_id: variety.variety_id,
          soil_type_id: alluvialSoilId,
          climate_zone_id: null,
          state_id: null,
          pop_name: popName,
          pop_description: `Tomato cultivation package of practice for ${variety.variety_name} on alluvial soil. Phase 2A — engine-readable stage triggers for the HORTI sub-flow.`,
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
        variety.duration_days_min || 100,
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
      "SELECT id, pop_uuid FROM package_of_practices WHERE pop_name LIKE 'Tomato — %%on Alluvial Soil — Phase 2A'"
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
