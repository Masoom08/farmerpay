'use strict';

/**
 * SAGE Phase 2A — Mango (HORTI / Fruits) Package of Practice +
 * stage triggers + pest risk.
 *
 * India is the world's largest mango producer (~50% of global output).
 * Major belts: Maharashtra (Konkan / Alphonso), UP (Dasheri / Langra),
 * AP/Telangana (Banganpalli), Gujarat (Kesar), Karnataka (Totapuri),
 * West Bengal (Himsagar).
 *
 * Selected as the canonical "fruits" representative for the HORTI
 * sub-flow because it's the highest-value tree fruit in India and the
 * pest profile + weather sensitivities are well-documented.
 *
 * **Mango is perennial, not annual.** The Phase 2A engine + workband
 * schema were built around `days_from_sowing_start/end`, which assume an
 * annual cycle starting from sowing. For mango we treat each year's
 * **productive cycle** as a ~180-day window starting from "year start"
 * (Jan 1 in north Indian belts, when the tree breaks winter dormancy
 * and begins the new vegetative + flowering + fruit-set + fruit-fill
 * sequence). The farmer's `cycle_sowing_date` semantically becomes
 * "the start of this fruiting year" rather than literal sowing.
 *
 * Mango's defining sensitivities (within the productive window):
 *   1. **Frost / cold at flowering** — temps below 10°C kill bloom.
 *      Critical for north Indian belts in Feb–Mar.
 *   2. **Mango hopper (Idioscopus spp.)** — sucks juice from
 *      inflorescences, peak attack at flowering. Direct fruit-set loss.
 *   3. **Powdery mildew on inflorescences** — kills bloom in cool humid
 *      spells. Triggered at LOW severity for early warning.
 *   4. **Anthracnose** at fruit set + fruit fill — black spots on fruit,
 *      mandi rejection.
 *   5. **Heat / hailstorm** during fruit development — direct yield loss.
 *   6. **Fruit fly** at maturity — maggots inside fruits, post-harvest
 *      rejection.
 *
 * crop_masters does NOT have a MANGO row. This seeder bootstraps the
 * crop AND its varieties AND its PoPs in one shot. Idempotent.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Mango variety bootstrap ─────────────────────────────────────────

const MANGO_VARIETIES = [
  { code: 'ALPHONSO',    name: 'Alphonso (Hapus)',         durationMin: 165, durationMax: 185, yield: 8000,  hybrid: false, desc: 'Premium Konkan variety. Saffron-coloured flesh, intensely aromatic. India\'s export icon. Sensitive to weather; needs careful husbandry.' },
  { code: 'DASHERI',     name: 'Dasheri',                  durationMin: 170, durationMax: 190, yield: 12000, hybrid: false, desc: 'UP/north India favourite. Mid-season, fiberless, sweet. Workhorse variety with high yield potential.' },
  { code: 'LANGRA',      name: 'Langra',                   durationMin: 175, durationMax: 195, yield: 10000, hybrid: false, desc: 'Late-season Bihar/UP variety. Greenish-yellow skin, very juicy. Stable yields under variable weather.' },
  { code: 'BANGANPALLI', name: 'Banganpalli (Benishan)',   durationMin: 165, durationMax: 185, yield: 14000, hybrid: false, desc: 'AP/Telangana bulk variety. Large size, mild sweetness, long shelf life. Volume crop for North Indian markets.' },
  { code: 'KESAR',       name: 'Kesar',                    durationMin: 170, durationMax: 190, yield: 9000,  hybrid: false, desc: 'Gujarat signature variety. Bright orange flesh, distinct aroma. GI-tagged, premium for processing and export.' },
];

// ─── Stage definitions (annual fruiting cycle, ~180 days) ────────────

const buildStages = (durationMin, durationMax) => {
  const baseAnchor = 180;
  const target = Math.max(durationMin, durationMax || baseAnchor);
  const scale = target / baseAnchor;
  const round = (n) => Math.round(n);
  return [
    { order: 1, name: 'Vegetative Recovery', startBase: 0,   endBase: 30  },
    { order: 2, name: 'Flowering & Bloom',   startBase: 30,  endBase: 60  },
    { order: 3, name: 'Fruit Set',           startBase: 60,  endBase: 90  },
    { order: 4, name: 'Fruit Development',   startBase: 90,  endBase: 150 },
    { order: 5, name: 'Maturity & Harvest',  startBase: 150, endBase: target + 10 },
  ].map((s) => ({
    ...s,
    start: round(s.startBase * scale),
    end: round(s.endBase * scale),
  }));
};

// ─── Trigger templates per stage ─────────────────────────────────────

const TRIGGER_TEMPLATES = {
  'Vegetative Recovery': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 15, optimal_max: 28, critical_min: 4, critical_max: 38,
      urgency_above: 'medium', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is in vegetative recovery. Observed {observedValue} is past the {threshold} threshold — flush growth slows, future bloom is compromised.',
      recommended_action_en: 'If cold, smudging in the orchard preserves bud temperature. If hot, irrigate basins. Apply potassium sulphate to push flush.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 50, optimal_max: 75, critical_min: 30, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} past {threshold} — {varietyName} winter flush stressed. Tree health going into bloom is compromised.',
      recommended_action_en: 'Top up basin irrigation. Mulch the basin.',
    },
  ],
  'Flowering & Bloom': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 20, optimal_max: 28, critical_min: 10, critical_max: 35,
      urgency_above: 'critical', urgency_below: 'critical',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is FLOWERING. Observed {observedValue} is past the {threshold} critical threshold. Frost below 10°C kills bloom; heat above 35°C causes flower drop. THIS IS THE #1 MANGO YIELD KILLER.',
      recommended_action_en: 'CRITICAL: if frost forecast, smudge at 4 AM and irrigate basins (wet soil holds heat). If heat, basin irrigation cools the canopy. Spray Planofix (NAA) 15 ppm to retain panicles.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 50, optimal_max: 70, critical_min: 30, critical_max: 90,
      urgency_above: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} during {varietyName} bloom past {threshold} — powdery mildew on inflorescences. Bloom will be lost.',
      recommended_action_en: 'Spray Sulphur 80 WP @ 2 g/L OR Hexaconazole 5 EC @ 2 ml/L immediately. Repeat after 10 days.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 15, critical_min: null, critical_max: 30,
      urgency_above: 'critical',
      icon: '🌧️',
      advisory_template_en: 'Unseasonal rain ({observedValue}) on {varietyName} bloom = panicle wash-off + powdery mildew bloom. Direct fruit-set loss. UNRECOVERABLE for affected panicles.',
      recommended_action_en: 'After rain, spray Carbendazim 50 WP @ 1 g/L within 24h. Foliar spray 2,4-D @ 10 ppm to retain remaining panicles.',
    },
  ],
  'Fruit Set': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 22, optimal_max: 32, critical_min: 14, critical_max: 38,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is at fruit set. Observed {observedValue} past {threshold} — fruit drop accelerates. Each tree losing 30%+ of small fruits.',
      recommended_action_en: 'Basin irrigation every 7 days. Foliar spray potassium 1% + boron 0.1% to reduce drop. Mulch basins.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 55, optimal_max: 75, critical_min: 35, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity {observedValue} during {varietyName} fruit set below {threshold} — pea-stage fruit drop rising.',
      recommended_action_en: 'Increase irrigation frequency. Foliar mist if water available.',
    },
  ],
  'Fruit Development': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 24, optimal_max: 32, critical_min: 16, critical_max: 40,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} fruits developing — heat at {observedValue} past {threshold} causes sunburn on exposed fruits and stops sizing. Direct ₹/kg loss.',
      recommended_action_en: 'Maintain basin irrigation. Whitewash or shade-net the south-facing canopy face if available. Pick scorched fruits early.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 25, critical_min: null, critical_max: 60,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain ({observedValue}) on developing {varietyName} fruits — anthracnose pressure soars and fruits crack. Open drains in basins.',
      recommended_action_en: 'Spray Mancozeb 75 WP @ 2 g/L + Carbendazim 50 WP @ 1 g/L within 48h. Open basin drains.',
    },
    {
      parameter_code: 'wind_speed_kmh',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 50,
      urgency_above: 'critical',
      icon: '💨',
      advisory_template_en: 'Wind at {observedValue} km/h on {varietyName} — past {threshold} km/h fruits drop and branches break. Hailstorm risk also.',
      recommended_action_en: 'Inspect after the storm. Pick mature dropped fruits same day. Prune broken branches and seal cuts with Bordeaux paste.',
    },
  ],
  'Maturity & Harvest': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: null, optimal_max: 36, critical_min: null, critical_max: 42,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: 'Heat ({observedValue}) on mature {varietyName} fruits — over-ripening accelerates, shelf life drops. Harvest at first morning.',
      recommended_action_en: 'Harvest in early morning. Pre-cool fruits in shade for 4 hours before transport. Use bamboo padding in crates.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 20, critical_min: null, critical_max: 40,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Pre-harvest rain ({observedValue}) on mature {varietyName} = anthracnose on harvested fruits, rejection at the mandi.',
      recommended_action_en: 'Harvest within 24 hours of fruits drying. Sort out spotted fruits for local market. Dip clean fruits in 50°C water for 5 minutes (hot-water treatment).',
    },
  ],
};

// ─── Pest susceptibility templates per stage ─────────────────────────

const PEST_TEMPLATES = {
  'Vegetative Recovery': [
    { pest_code: 'stem_borer', pest_name_en: 'Mango stem borer', pest_name_hi: 'तना छेदक', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Stem borer reports {severity} regionally. {varietyName} trees show frass at the trunk base — once inside, only mechanical removal works.',
      recommended_action_en: 'Probe holes with a wire to kill grubs. Inject Dichlorvos 76 EC @ 5 ml/hole and seal with mud. Whitewash trunks.' },
  ],
  'Flowering & Bloom': [
    { pest_code: 'mango_hopper', pest_name_en: 'Mango hopper (Idioscopus)', pest_name_hi: 'आम का फुदका', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Mango hopper {severity} during {varietyName} bloom — adults and nymphs suck juice from inflorescences, panicles dry up, fruit set fails. CAN COST 60-80% OF THE CROP. FARMERPAY ALERT.',
      recommended_action_en: 'Spray Imidacloprid 17.8 SL @ 0.3 ml/L OR Thiamethoxam 25 WG @ 0.2 g/L immediately. Cover the entire canopy. Repeat after 10 days if pressure persists.' },
    { pest_code: 'powdery_mildew', pest_name_en: 'Powdery mildew', pest_name_hi: 'चूर्णिल आसिता', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🍂',
      advisory_template_en: '🚨 Powdery mildew {severity} regionally — {varietyName} inflorescences develop white powdery patches and dry up. Bloom is lost. FARMERPAY ALERT.',
      recommended_action_en: 'Spray Sulphur 80 WP @ 2 g/L OR Hexaconazole 5 EC @ 2 ml/L immediately. Repeat after 10 days. Critical to spray BEFORE the attack is visible.' },
    { pest_code: 'thrips', pest_name_en: 'Thrips', pest_name_hi: 'थ्रिप्स', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Thrips {severity} during {varietyName} bloom — distort flowers and young fruits. Russetting on fruit skin downgrades market grade.',
      recommended_action_en: 'Spray Spinosad 45 SC @ 0.4 ml/L in the evening. Avoid bee-toxic chemicals during bloom.' },
  ],
  'Fruit Set': [
    { pest_code: 'mango_hopper', pest_name_en: 'Mango hopper (Idioscopus)', pest_name_hi: 'आम का फुदका', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'low', icon: '🐛',
      advisory_template_en: '🚨 Hopper continues during {varietyName} fruit set — small fruits drop at pea stage. FARMERPAY ALERT.',
      recommended_action_en: 'Re-spray Imidacloprid 17.8 SL @ 0.3 ml/L if hopper counts > 5 per panicle.' },
    { pest_code: 'mealybug', pest_name_en: 'Mango mealybug', pest_name_hi: 'मीली बग', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Mealybug {severity} in your area. {varietyName} fruit pedicels show waxy clusters; ants are the warning sign. Sooty mould follows.',
      recommended_action_en: 'Apply Chlorpyriphos 20 EC @ 2.5 ml/L on the trunk + ground. Sticky bands at 1 m height to block crawlers from re-entering.' },
    { pest_code: 'anthracnose', pest_name_en: 'Anthracnose', pest_name_hi: 'एंथ्रेक्नोज', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Anthracnose {severity} regionally — {varietyName} young fruits develop black sunken spots. Spreads in humid post-monsoon weather.',
      recommended_action_en: 'Spray Mancozeb 75 WP @ 2 g/L + Carbendazim 50 WP @ 1 g/L. Re-spray every 12 days until harvest.' },
  ],
  'Fruit Development': [
    { pest_code: 'fruit_fly', pest_name_en: 'Mango fruit fly', pest_name_hi: 'फल मक्खी', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🪰',
      advisory_template_en: '🚨 Fruit fly {severity} in your district — {varietyName} fruits get punctured, maggots develop inside, fruits rot from within. Mandi rejection guaranteed. FARMERPAY ALERT.',
      recommended_action_en: 'Install methyl eugenol pheromone traps @ 8/acre. Spray Malathion 50 EC + protein hydrolysate as bait. Harvest mature fruits before any further damage.' },
    { pest_code: 'anthracnose', pest_name_en: 'Anthracnose', pest_name_hi: 'एंथ्रेक्नोज', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Anthracnose {severity} during {varietyName} fruit fill — black spots expand, fruits unsold at the mandi. Spreads in storage.',
      recommended_action_en: 'Spray Carbendazim 50 WP @ 1 g/L or Propiconazole 25 EC @ 1 ml/L. Avoid harvesting wet fruits.' },
    { pest_code: 'leaf_webber', pest_name_en: 'Leaf webber', pest_name_hi: 'पत्ती वेबर', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Leaf webber {severity}. {varietyName} new flush leaves get webbed together; feeding inside reduces canopy + future bloom.',
      recommended_action_en: 'Prune affected shoots and burn. Spray Quinalphos 25 EC @ 2 ml/L if heavy.' },
  ],
  'Maturity & Harvest': [
    { pest_code: 'fruit_fly', pest_name_en: 'Mango fruit fly', pest_name_hi: 'फल मक्खी', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'low', icon: '🪰',
      advisory_template_en: '🚨 Fruit fly {severity} continues at {varietyName} maturity — every day of delay = more punctured fruits. Pheromone traps + early harvest are the only defence.',
      recommended_action_en: 'Harvest mature fruits immediately. Maintain pheromone traps. Hot-water treat harvested fruits at 50°C for 5 minutes to kill any maggots before storage.' },
    { pest_code: 'storage_rot', pest_name_en: 'Storage rot', pest_name_hi: 'भंडारण सड़न', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🦠',
      advisory_template_en: 'Storage rot pressure {severity}. Wet or bruised {varietyName} fruits rot in transit, contaminating healthy fruits.',
      recommended_action_en: 'Hot-water treatment (50°C, 5 min) before packing. Ventilated crates only. Sort out any soft fruits.' },
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

    // 1. Bootstrap crop_masters row for MANGO if missing
    const [existingCrop] = await queryInterface.sequelize.query(
      "SELECT crop_id FROM crop_masters WHERE crop_code = 'MANGO' LIMIT 1"
    );
    let mangoCropId;
    if (existingCrop && existingCrop.length > 0) {
      mangoCropId = existingCrop[0].crop_id;
    } else {
      mangoCropId = uuidv4();
      await queryInterface.bulkInsert('crop_masters', [{
        crop_id: mangoCropId,
        crop_code: 'MANGO',
        crop_name: 'Mango',
        crop_group: 'Fruits',
        botanical_name: 'Mangifera indica',
        crop_duration_days_min: 165,
        crop_duration_days_max: 195,
        is_annual: false,
        is_perennial: true,
        ideal_season: 'multiple',
        water_requirement_mm: 800,
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
      { replacements: { codes: MANGO_VARIETIES.map((v) => v.code) } }
    );
    const existingByCode = {};
    for (const e of existingVars) existingByCode[e.variety_code] = e.variety_id;

    const varietyRowsToInsert = [];
    for (const v of MANGO_VARIETIES) {
      if (existingByCode[v.code]) continue;
      varietyRowsToInsert.push({
        variety_id: uuidv4(),
        crop_id: mangoCropId,
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

    const [varietyRows] = await queryInterface.sequelize.query(
      'SELECT variety_id, variety_code, variety_name, duration_days_min, duration_days_max, is_hybrid FROM variety_masters WHERE variety_code IN (:codes)',
      { replacements: { codes: MANGO_VARIETIES.map((v) => v.code) } }
    );

    // 4. PoP + workbands + triggers + pests per variety
    for (const variety of varietyRows) {
      const popName = `Mango — ${variety.variety_name} on Alluvial Soil — Phase 2A`;

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
          crop_id: mangoCropId,
          variety_id: variety.variety_id,
          soil_type_id: alluvialSoilId,
          climate_zone_id: null,
          state_id: null,
          pop_name: popName,
          pop_description: `Mango cultivation package of practice for ${variety.variety_name} on alluvial soil. Annual fruiting cycle treated as a 180-day window starting from "year start". Phase 2A — engine-readable stage triggers for the HORTI/fruits sub-flow.`,
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

      const stages = buildStages(variety.duration_days_min || 165, variety.duration_days_max || 185);
      const workbandRows = stages.map((s) => ({
        pop_id: popUuid,
        workband_order: s.order,
        workband_name: s.name,
        days_from_sowing_start: s.start,
        days_from_sowing_end: s.end,
        workband_description: `${s.name} phase for ${variety.variety_name} (days ${s.start}–${s.end} from year-start). Perennial — sowing_date semantically means "start of fruiting year".`,
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
      "SELECT id, pop_uuid FROM package_of_practices WHERE pop_name LIKE 'Mango — %%on Alluvial Soil — Phase 2A'"
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
