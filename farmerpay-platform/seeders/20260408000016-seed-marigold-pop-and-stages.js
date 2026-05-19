'use strict';

/**
 * SAGE Phase 2A — Marigold (HORTI / Flowers) Package of Practice +
 * stage triggers + pest risk.
 *
 * Marigold is the dominant Indian flower crop by acreage (used heavily
 * for garlands, religious offerings, weddings). Major belts: Karnataka,
 * Tamil Nadu, AP, MP, West Bengal. Annual ~100-day cycle.
 *
 * Selected as the canonical "flowers" representative for the HORTI
 * sub-flow because every state grows it, the pest profile is widely
 * understood, and the price volatility around festivals (Dussehra,
 * Diwali, Navratri) makes it a high-value SAGE target — the engine
 * could later trigger "harvest before festival" advisories.
 *
 * Marigold's defining sensitivities:
 *   1. **Heat at bud initiation** — temps > 32°C cause flower drop and
 *      smaller blooms. Smallholder yield killer in summer plantings.
 *   2. **Powdery mildew** in cool humid spells — coats leaves white,
 *      kills photosynthesis. Triggered at LOW regional severity for
 *      early warning.
 *   3. **Thrips** + spider mites — suck juice, distort buds. Peak attack
 *      at flowering.
 *   4. **Waterlogging at any stage** — root rot kills plants in 24h.
 *
 * crop_masters does NOT have a MARIGOLD row (Phase 1 base seeder skipped
 * flowers entirely). This seeder bootstraps the crop AND its varieties
 * AND its PoPs in one shot. Idempotent.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Marigold variety bootstrap ──────────────────────────────────────

const MARIGOLD_VARIETIES = [
  { code: 'PUSANARANGI', name: 'Pusa Narangi Gainda', durationMin: 95,  durationMax: 110, yield: 12000, hybrid: false, desc: 'IARI Delhi release. Bright orange African-type pompom. ~9 t/ha standard yield, popular across northern plains. Tolerates moderate heat.' },
  { code: 'PUSABASANTI', name: 'Pusa Basanti Gainda', durationMin: 100, durationMax: 115, yield: 11000, hybrid: false, desc: 'IARI Delhi release. Bright yellow African-type. Premium for festival markets, particularly during Basant.' },
  { code: 'AFRICANTALL', name: 'African Tall Orange', durationMin: 90,  durationMax: 105, yield: 10000, hybrid: false, desc: 'Open-pollinated tall variety with very large pompom flowers. Long stems suit garland-makers.' },
  { code: 'CALCUTTAORG', name: 'Calcutta Orange',     durationMin: 95,  durationMax: 110, yield: 11500, hybrid: false, desc: 'West Bengal–popular open-pollinated orange. Heat-tolerant, multi-pick over 4–6 weeks.' },
  { code: 'MDU1',        name: 'MDU 1',                durationMin: 90,  durationMax: 100, yield: 13000, hybrid: false, desc: 'TNAU release. Compact French-African hybrid. Pest-tolerant — particularly thrips. South Indian belt.' },
];

// ─── Stage definitions ───────────────────────────────────────────────

const buildStages = (durationMin, durationMax) => {
  const baseAnchor = 100;
  const target = Math.max(durationMin, durationMax || baseAnchor);
  const scale = target / baseAnchor;
  const round = (n) => Math.round(n);
  return [
    { order: 1, name: 'Nursery & Transplant', startBase: 0,  endBase: 25  },
    { order: 2, name: 'Vegetative',           startBase: 25, endBase: 45  },
    { order: 3, name: 'Bud Initiation',       startBase: 45, endBase: 65  },
    { order: 4, name: 'Flowering',            startBase: 65, endBase: 85  },
    { order: 5, name: 'Harvest Window',       startBase: 85, endBase: target + 10 },
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
      optimal_min: 18, optimal_max: 28, critical_min: 10, critical_max: 35,
      urgency_above: 'high', urgency_below: 'medium',
      icon: '🌡️',
      advisory_template_en: '{varietyName} nursery seedlings stressed at {observedValue} — past the {threshold} tolerance. Transplant shock will be severe.',
      recommended_action_en: 'Shade nursery beds with shade nets. Irrigate seedlings in early morning. Postpone transplanting until temperatures drop.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 25, critical_min: null, critical_max: 50,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) on freshly-transplanted {varietyName} = root rot risk. Marigold cannot tolerate waterlogging > 24h.',
      recommended_action_en: 'Open drainage cuts. Drench roots with Carbendazim 50 WP @ 1 g/L if waterlogged > 12h.',
    },
  ],
  Vegetative: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 20, optimal_max: 30, critical_min: 12, critical_max: 35,
      urgency_above: 'medium',
      icon: '🌡️',
      advisory_template_en: '{varietyName} vegetative growth slows at {observedValue} — past the {threshold} threshold. Plant size + future flower count compromised.',
      recommended_action_en: 'Top up irrigation. Apply foliar potassium 1% to reduce heat stress. Mulch the rows.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 80, critical_min: 35, critical_max: 90,
      urgency_above: 'medium', urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} past the {threshold} comfort band for {varietyName}. High humidity = powdery mildew; low humidity = wilt.',
      recommended_action_en: 'If humid, scout for white powdery patches. If dry, irrigate.',
    },
  ],
  'Bud Initiation': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 20, optimal_max: 28, critical_min: 12, critical_max: 32,
      urgency_above: 'critical', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is at BUD INITIATION. Observed {observedValue} is past the {threshold} cap — bud drop and smaller flowers. THIS IS THE #1 MARIGOLD YIELD KILLER.',
      recommended_action_en: 'CRITICAL: irrigate immediately to cool canopy. Foliar spray KNO3 (1%) at 6 AM. Mulch to retain soil moisture. Postpone any other operation.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 55, optimal_max: 75, critical_min: 35, critical_max: 90,
      urgency_above: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} during {varietyName} bud initiation past {threshold} — powdery mildew pressure rising rapidly.',
      recommended_action_en: 'Spray Sulphur 80 WP @ 2 g/L OR Hexaconazole 5 EC @ 2 ml/L preventively.',
    },
  ],
  Flowering: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 18, optimal_max: 28, critical_min: 10, critical_max: 35,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is flowering — heat at {observedValue} past {threshold} reduces flower size and shelf life. Direct ₹/quintal loss at the market.',
      recommended_action_en: 'Maintain irrigation cycle every 4 days. Pick flowers in early morning to preserve quality.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 25, critical_min: null, critical_max: 50,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Rain ({observedValue}) on flowering {varietyName} = petal damage and Botrytis pressure. Plan harvest for the next dry window.',
      recommended_action_en: 'Open drains. Spray Carbendazim 50 WP @ 1 g/L within 48h post-rain.',
    },
  ],
  'Harvest Window': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 35,
      urgency_above: 'medium',
      icon: '🌡️',
      advisory_template_en: 'Heat ({observedValue}) on mature {varietyName} flowers — petals wilt and shelf life drops to 2 days from 5. Harvest at first morning.',
      recommended_action_en: 'Pick flowers between 5 and 7 AM. Pre-cool in shade for 2 hours before transport.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 15, critical_min: null, critical_max: 30,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Rain ({observedValue}) on mature {varietyName} flowers = petal rot and reject at the market. Harvest before the next shower.',
      recommended_action_en: 'Harvest within 24 hours. Sort out water-damaged flowers; sell good ones quickly.',
    },
  ],
};

// ─── Pest susceptibility templates per stage ─────────────────────────

const PEST_TEMPLATES = {
  'Nursery & Transplant': [
    { pest_code: 'damping_off', pest_name_en: 'Damping-off', pest_name_hi: 'अंकुर सड़न', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Damping-off pressure {severity} regionally — {varietyName} seedlings collapse at the soil line in cool wet weather.',
      recommended_action_en: 'Drench nursery with Carbendazim 50 WP @ 1 g/L. Avoid over-watering. Treat seed with Trichoderma next time.' },
  ],
  Vegetative: [
    { pest_code: 'aphid', pest_name_en: 'Aphid', pest_name_hi: 'चेपा', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Aphid {severity} in your area. {varietyName} young growth attractive — clusters on shoot tips.',
      recommended_action_en: 'Spray Imidacloprid 17.8 SL @ 0.3 ml/L on first detection.' },
    { pest_code: 'powdery_mildew', pest_name_en: 'Powdery mildew', pest_name_hi: 'चूर्णिल आसिता', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'low', icon: '🍂',
      advisory_template_en: '🚨 Powdery mildew {severity} regionally — {varietyName} leaves develop white powdery patches that block photosynthesis. Spreads fast in cool humid weather. FARMERPAY ALERT.',
      recommended_action_en: 'Spray Sulphur 80 WP @ 2 g/L OR Hexaconazole 5 EC @ 2 ml/L immediately. Re-spray after 12 days.' },
  ],
  'Bud Initiation': [
    { pest_code: 'thrips', pest_name_en: 'Thrips', pest_name_hi: 'थ्रिप्स', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Thrips pressure {severity} during {varietyName} bud initiation — buds become distorted, brown-streaked, unsalable. FARMERPAY ALERT.',
      recommended_action_en: 'Spray Spinosad 45 SC @ 0.4 ml/L OR Fipronil 5 SC @ 1 ml/L immediately. Install blue sticky traps @ 25/acre.' },
    { pest_code: 'spider_mite', pest_name_en: 'Two-spotted spider mite', pest_name_hi: 'मकड़ी', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🕷️',
      advisory_template_en: 'Spider mite {severity} in dry weather. {varietyName} leaves show stippling + bronzing. Severe infestation kills the bud stalk.',
      recommended_action_en: 'Spray Dicofol 18.5 EC @ 2 ml/L OR Fenazaquin 10 EC @ 1 ml/L. Increase irrigation frequency.' },
  ],
  Flowering: [
    { pest_code: 'thrips', pest_name_en: 'Thrips', pest_name_hi: 'थ्रिप्स', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Thrips {severity} during {varietyName} flowering — open flowers get brown streaks, unsold at the mandi. FARMERPAY ALERT.',
      recommended_action_en: 'Spray Spinosad 45 SC @ 0.4 ml/L in evening. Pick clean flowers daily before they accumulate damage.' },
    { pest_code: 'leaf_spot', pest_name_en: 'Alternaria leaf spot', pest_name_hi: 'पत्ती धब्बा', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Alternaria leaf spot {severity} regionally — {varietyName} lower leaves develop brown concentric rings.',
      recommended_action_en: 'Spray Mancozeb 75 WP @ 2 g/L. Re-spray every 10 days.' },
    { pest_code: 'flower_bud_borer', pest_name_en: 'Flower bud borer (Helicoverpa)', pest_name_hi: 'फूल छेदक', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Helicoverpa {severity} in your area — caterpillars bore into {varietyName} flower buds, destroying them before harvest.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L in evening. Install pheromone traps @ 8/acre.' },
  ],
  'Harvest Window': [
    { pest_code: 'thrips', pest_name_en: 'Thrips', pest_name_hi: 'थ्रिप्स', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: 'Thrips continue through harvest for {varietyName}. Inspect each pick for browning before packing.',
      recommended_action_en: 'Pick clean flowers; cull damaged. Quick spray of Spinosad if heavy.' },
    { pest_code: 'botrytis', pest_name_en: 'Botrytis grey mould', pest_name_hi: 'बोट्राइटिस', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Botrytis {severity} regionally — picked {varietyName} flowers rot in storage if humidity is high. Contaminate clean flowers.',
      recommended_action_en: 'Pre-cool harvested flowers. Remove any with grey fuzz before packing.' },
  ],
};

const downgradeForHybrid = (susc) => {
  const map = { very_high: 'high', high: 'medium', medium: 'low', low: 'low' };
  return map[susc] || susc;
};

// ─── Seeder ──────────────────────────────────────────────────────────

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // 1. Bootstrap crop_masters row for MARIGOLD if missing
    const [existingCrop] = await queryInterface.sequelize.query(
      "SELECT crop_id FROM crop_masters WHERE crop_code = 'MARIGOLD' LIMIT 1"
    );
    let marigoldCropId;
    if (existingCrop && existingCrop.length > 0) {
      marigoldCropId = existingCrop[0].crop_id;
    } else {
      marigoldCropId = uuidv4();
      await queryInterface.bulkInsert('crop_masters', [{
        crop_id: marigoldCropId,
        crop_code: 'MARIGOLD',
        crop_name: 'Marigold',
        crop_group: 'Flowers',
        botanical_name: 'Tagetes spp.',
        crop_duration_days_min: 90,
        crop_duration_days_max: 115,
        is_annual: true,
        is_perennial: false,
        ideal_season: 'multiple',
        water_requirement_mm: 400,
        is_active: true,
        created_at: now,
        updated_at: now,
      }]);
    }

    // 2. Resolve alluvial soil
    const [soils] = await queryInterface.sequelize.query(
      "SELECT id FROM soil_types WHERE soil_type_code IN ('alluvial', 'ALLUVIAL') LIMIT 1"
    );
    if (!soils || soils.length === 0) return;
    const alluvialSoilId = soils[0].id;

    // 3. Bootstrap varieties
    const [existingVars] = await queryInterface.sequelize.query(
      'SELECT variety_id, variety_code FROM variety_masters WHERE variety_code IN (:codes)',
      { replacements: { codes: MARIGOLD_VARIETIES.map((v) => v.code) } }
    );
    const existingByCode = {};
    for (const e of existingVars) existingByCode[e.variety_code] = e.variety_id;

    const varietyRowsToInsert = [];
    for (const v of MARIGOLD_VARIETIES) {
      if (existingByCode[v.code]) continue;
      varietyRowsToInsert.push({
        variety_id: uuidv4(),
        crop_id: marigoldCropId,
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
      { replacements: { codes: MARIGOLD_VARIETIES.map((v) => v.code) } }
    );

    // 4. PoP + workbands + triggers + pests per variety
    for (const variety of varietyRows) {
      const popName = `Marigold — ${variety.variety_name} on Alluvial Soil — Phase 2A`;

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
          crop_id: marigoldCropId,
          variety_id: variety.variety_id,
          soil_type_id: alluvialSoilId,
          climate_zone_id: null,
          state_id: null,
          pop_name: popName,
          pop_description: `Marigold cultivation package of practice for ${variety.variety_name} on alluvial soil. Phase 2A — engine-readable stage triggers for the HORTI/flowers sub-flow.`,
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

      const stages = buildStages(variety.duration_days_min || 95, variety.duration_days_max || 110);
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
      "SELECT id, pop_uuid FROM package_of_practices WHERE pop_name LIKE 'Marigold — %%on Alluvial Soil — Phase 2A'"
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
