'use strict';

/**
 * SAGE Phase 2A — Rice Package of Practice + stage triggers + pest risk.
 *
 * For each of the 5 rice varieties (IR-64, Pusa Basmati 1121, Swarna,
 * BPT 5204, PHB 71) on alluvial soil, seeds:
 *
 *   - 1 package_of_practices row
 *   - 7 pop_workbands (Nursery → Maturity)
 *   - ~5 pop_workband_triggers per workband (temp + humidity + rainfall)
 *   - ~3 pop_workband_pest_susceptibilities per workband
 *
 * Idempotent: looks up varieties + soils + crops by code, skips PoPs that
 * already exist by name.
 *
 * Tagged via pop_name = 'Rice — {variety} on Alluvial Soil — Phase 2A'
 * so a future cleanup seeder can purge them safely.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Stage definitions (day offsets calibrated per duration band) ───────

/**
 * Build the 7 stage windows for a variety, scaled to the variety's
 * duration_days_max so longer-duration varieties stretch and shorter
 * ones compress proportionally. Anchor reference is the IR-64-style
 * 125-day cycle.
 */
const buildStages = (durationMin, durationMax) => {
  const baseAnchor = 125;
  const target = Math.max(durationMin, durationMax || baseAnchor);
  const scale = target / baseAnchor;
  const round = (n) => Math.round(n);
  return [
    { order: 1, name: 'Nursery',            startBase: 0,   endBase: 25 },
    { order: 2, name: 'Transplanting',      startBase: 25,  endBase: 35 },
    { order: 3, name: 'Tillering',          startBase: 35,  endBase: 65 },
    { order: 4, name: 'Panicle Initiation', startBase: 65,  endBase: 85 },
    { order: 5, name: 'Flowering',          startBase: 85,  endBase: 105 },
    { order: 6, name: 'Grain Filling',      startBase: 105, endBase: 125 },
    { order: 7, name: 'Maturity & Harvest', startBase: 125, endBase: target + 5 },
  ].map((s) => ({
    ...s,
    start: round(s.startBase * scale),
    end: round(s.endBase * scale),
  }));
};

// ─── Trigger templates per stage ────────────────────────────────────────

const TRIGGER_TEMPLATES = {
  Nursery: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 22, optimal_max: 30, critical_min: 16, critical_max: 35,
      urgency_above: 'medium', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: 'Nursery seedlings of {varietyName} are stressed — temperature has hit {observedValue} which is past the {threshold} comfort zone. Cool with afternoon irrigation; check seedling vigor at sundown.',
      recommended_action_en: 'Irrigate seed beds in the morning. Avoid heavy fertilizer top-up until temperatures normalize.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 90, critical_min: 35, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Nursery humidity dropped to {observedValue}, below the {threshold} comfort line for {varietyName} seedlings. Mist seed beds twice daily until conditions recover.',
      recommended_action_en: 'Mist or sprinkler-irrigate seed beds twice daily.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 80,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rainfall of {observedValue} hit your nursery — risk of seedling wash-out for {varietyName}. Inspect drainage channels at first light.',
      recommended_action_en: 'Open drainage cuts; raise affected seedlings if waterlogged > 6h.',
    },
  ],
  Transplanting: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 22, optimal_max: 32, critical_min: 18, critical_max: 36,
      urgency_above: 'high', urgency_below: 'medium',
      icon: '🌡️',
      advisory_template_en: 'Transplanting {varietyName} at {observedValue} will shock the seedlings — wait until canopy temperature drops below {threshold} before moving any more rows.',
      recommended_action_en: 'Schedule transplanting for early morning or after sundown only.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 65, optimal_max: 90, critical_min: 40, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Air humidity is {observedValue}, below the {threshold} threshold for safe {varietyName} transplant. Newly planted hills will wilt — keep field bunds full.',
      recommended_action_en: 'Maintain 2–3 cm standing water on transplanted plots.',
    },
  ],
  Tillering: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 25, optimal_max: 32, critical_min: 18, critical_max: 35,
      urgency_above: 'high', urgency_below: 'medium',
      icon: '🌡️',
      advisory_template_en: 'Your {varietyName} is in tillering and ambient temperature has hit {observedValue} — past the {threshold} cap. Tillering slows sharply above this point and you can lose 8–15% yield.',
      recommended_action_en: 'Top up field bunds to cool the canopy. Shift weeding to evening hours.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 85, critical_min: 40, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} is below the {threshold} comfort zone for {varietyName} tillering — leaf rolling likely. Increase irrigation frequency.',
      recommended_action_en: 'Irrigate every 3–4 days; avoid mid-day weeding.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 50, critical_min: null, critical_max: 80,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Tillering field hit by {observedValue} of rain — {varietyName} risks tiller submergence above {threshold}. Open drainage cuts immediately.',
      recommended_action_en: 'Open all drainage cuts; do not apply urea top-dressing for the next 5 days.',
    },
  ],
  'Panicle Initiation': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 22, optimal_max: 30, critical_min: 18, critical_max: 33,
      urgency_above: 'high', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is at panicle initiation — the most temperature-sensitive stage. Observed {observedValue} is past {threshold} and panicle differentiation is at risk.',
      recommended_action_en: 'Keep continuous shallow water in the field. Spray potassium-rich foliar mix.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 65, optimal_max: 85, critical_min: 45, critical_max: null,
      urgency_below: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} is dangerously low for {varietyName} panicle initiation — pollen sterility risk above {threshold}.',
      recommended_action_en: 'Maintain 5cm standing water. Foliar-spray water in the evening if available.',
    },
  ],
  Flowering: [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 22, optimal_max: 30, critical_min: 18, critical_max: 33,
      urgency_above: 'critical', urgency_below: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} is FLOWERING and temperature has hit {observedValue} — past the {threshold} pollen sterility threshold. Yield can drop 25–40%. Act now.',
      recommended_action_en: 'Irrigate immediately to cool canopy. If feasible, foliar-spray water at 6 AM and 6 PM for the next 3 days.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 65, optimal_max: 85, critical_min: 50, critical_max: null,
      urgency_below: 'high',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} during {varietyName} flowering is past the {threshold} sterility threshold. Mist canopy if possible.',
      recommended_action_en: 'Maintain standing water; foliar mist twice daily; postpone any spray operations.',
    },
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 50,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Heavy rain of {observedValue} during {varietyName} flowering will wash pollen — yield risk. Drain excess water but keep root zone moist.',
      recommended_action_en: 'Open drains to prevent submergence; do not apply any spray for 3 days post-rain.',
    },
  ],
  'Grain Filling': [
    {
      parameter_code: 'temp_celsius',
      optimal_min: 21, optimal_max: 28, critical_min: 16, critical_max: 32,
      urgency_above: 'high',
      icon: '🌡️',
      advisory_template_en: '{varietyName} at grain filling — {observedValue} is past {threshold} and grain chalkiness is rising. Lower canopy temperature with shallow continuous irrigation.',
      recommended_action_en: 'Maintain 3cm standing water. Avoid letting soil dry between irrigations.',
    },
    {
      parameter_code: 'humidity_percent',
      optimal_min: 60, optimal_max: 80, critical_min: 45, critical_max: null,
      urgency_below: 'medium',
      icon: '💧',
      advisory_template_en: 'Humidity at {observedValue} is below the grain-filling comfort line for {varietyName}. Risk of premature drying.',
      recommended_action_en: 'Maintain shallow standing water; stop draining the field until 7 days before harvest.',
    },
  ],
  'Maturity & Harvest': [
    {
      parameter_code: 'rainfall_mm_24h',
      optimal_min: null, optimal_max: 25, critical_min: null, critical_max: 50,
      urgency_above: 'high',
      icon: '🌧️',
      advisory_template_en: 'Pre-harvest rain of {observedValue} on {varietyName} risks grain shedding and lodging if it crosses {threshold}. Plan harvest for the next dry window.',
      recommended_action_en: 'Inspect for lodging. If grain moisture is < 20%, harvest within 48h.',
    },
    {
      parameter_code: 'wind_speed_kmh',
      optimal_min: null, optimal_max: 30, critical_min: null, critical_max: 45,
      urgency_above: 'high',
      icon: '💨',
      advisory_template_en: 'Wind at {observedValue} km/h around your mature {varietyName} — lodging risk above {threshold} km/h. Walk the field at first light.',
      recommended_action_en: 'If lodging > 20% of plot, harvest immediately even if grain moisture is slightly above target.',
    },
  ],
};

// ─── Pest susceptibility templates per stage ────────────────────────────

const PEST_TEMPLATES = {
  Nursery: [
    { pest_code: 'blast', pest_name_en: 'Rice blast', pest_name_hi: 'राइस ब्लास्ट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Regional rice blast pressure is {severity} and your {varietyName} nursery is in the susceptible window. Inspect seedlings for diamond-shaped lesions.',
      recommended_action_en: 'Apply Tricyclazole 75 WP @ 0.6 g/L on infected patches. Drain and re-flood after 24h.' },
    { pest_code: 'seedling_rot', pest_name_en: 'Seedling rot', pest_name_hi: 'अंकुर सड़न', susceptibility_level: 'low', triggered_when_regional_severity_at_least: 'high', icon: '🦠',
      advisory_template_en: 'Seedling rot reports nearby — keep your {varietyName} nursery beds well-drained and avoid over-watering.',
      recommended_action_en: 'Reduce water depth; ensure 1 inch standing water max.' },
  ],
  Transplanting: [
    { pest_code: 'root_aphid', pest_name_en: 'Rice root aphid', pest_name_hi: 'जड़ माहू', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Root aphid pressure {severity} in your district — inspect transplant clumps before moving any new seedlings.',
      recommended_action_en: 'Dip seedling roots in Imidacloprid 17.8 SL @ 0.5 ml/L for 4 hours before transplant.' },
  ],
  Tillering: [
    { pest_code: 'stem_borer', pest_name_en: 'Yellow stem borer', pest_name_hi: 'पीला तना छेदक', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Stem borer pressure is {severity} in your area and {varietyName} tillering is at risk. Look for dead hearts on 5% of plants. Skipping spray could cost ₹6,000–₹8,000 per acre.',
      recommended_action_en: 'Spray Cartap Hydrochloride 50 SP @ 1 g/L OR install pheromone traps @ 5/acre.' },
    { pest_code: 'leaf_folder', pest_name_en: 'Leaf folder', pest_name_hi: 'पत्ती मोड़क', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🍃',
      advisory_template_en: 'Leaf folder activity reported in your district at {severity} level. Inspect {varietyName} flag leaves for folded tubes.',
      recommended_action_en: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L if 2+ folded leaves per hill.' },
    { pest_code: 'blast', pest_name_en: 'Rice blast', pest_name_hi: 'राइस ब्लास्ट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Blast pressure {severity} regionally — {varietyName} tillering plants are vulnerable. Look for diamond-shaped leaf lesions.',
      recommended_action_en: 'Apply Tricyclazole 75 WP @ 0.6 g/L on first detection.' },
  ],
  'Panicle Initiation': [
    { pest_code: 'stem_borer', pest_name_en: 'Yellow stem borer', pest_name_hi: 'पीला तना छेदक', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Stem borer at {severity} pressure during {varietyName} panicle initiation = "white ear" risk. This stage is the highest yield-loss window for stem borer.',
      recommended_action_en: 'Spray Cartap Hydrochloride 50 SP immediately. Re-spray after 10 days if pressure persists.' },
    { pest_code: 'gall_midge', pest_name_en: 'Asian rice gall midge', pest_name_hi: 'गाल मिज', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🪰',
      advisory_template_en: 'Gall midge regional pressure is {severity}. Check {varietyName} tillers for silver shoot symptoms.',
      recommended_action_en: 'Apply Carbofuran 3G @ 25 kg/ha in standing water.' },
    { pest_code: 'sheath_blight', pest_name_en: 'Sheath blight', pest_name_hi: 'शीथ ब्लाइट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Sheath blight reported regionally at {severity}. {varietyName} canopy at panicle initiation is at risk — look for greyish-green oval lesions on sheaths.',
      recommended_action_en: 'Spray Hexaconazole 5 EC @ 2 ml/L on first detection.' },
  ],
  Flowering: [
    { pest_code: 'bph', pest_name_en: 'Brown planthopper', pest_name_hi: 'भूरा फुदका', susceptibility_level: 'very_high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'Brown planthopper pressure {severity} during {varietyName} flowering = severe risk. Hopperburn can wipe out 30–60% of yield in 10 days.',
      recommended_action_en: 'Drain field for 3–4 days. Spray Buprofezin 25 SC @ 1.6 ml/L. Avoid synthetic pyrethroids.' },
    { pest_code: 'neck_blast', pest_name_en: 'Neck blast', pest_name_hi: 'नेक ब्लास्ट', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Neck blast risk {severity} during {varietyName} flowering — direct yield loss. Inspect for blackened panicle bases.',
      recommended_action_en: 'Spray Tricyclazole 75 WP @ 0.6 g/L preventively. Re-spray after 12 days.' },
    { pest_code: 'blb', pest_name_en: 'Bacterial leaf blight', pest_name_hi: 'जीवाणु पत्ती झुलसा', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Bacterial leaf blight {severity} in your area — {varietyName} panicles at risk. Look for yellow streaks running down leaf edges.',
      recommended_action_en: 'Drain field. Apply Streptocycline 200 ppm + Copper Oxychloride 50 WP @ 2.5 g/L.' },
  ],
  'Grain Filling': [
    { pest_code: 'bph', pest_name_en: 'Brown planthopper', pest_name_hi: 'भूरा फुदका', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🐛',
      advisory_template_en: 'BPH pressure {severity} during {varietyName} grain filling — hopperburn cuts grain weight directly.',
      recommended_action_en: 'Drain field for 3 days. Apply Buprofezin 25 SC.' },
    { pest_code: 'neck_blast', pest_name_en: 'Neck blast', pest_name_hi: 'नेक ब्लास्ट', susceptibility_level: 'high', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Neck blast {severity} during {varietyName} grain filling — direct chaffy grain risk.',
      recommended_action_en: 'Spray Tricyclazole 75 WP if any blackened panicle bases visible.' },
    { pest_code: 'sheath_rot', pest_name_en: 'Sheath rot', pest_name_hi: 'शीथ रॉट', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'medium', icon: '🍂',
      advisory_template_en: 'Sheath rot reports in your district at {severity}. {varietyName} flag-leaf sheaths are vulnerable — look for reddish-brown lesions.',
      recommended_action_en: 'Spray Carbendazim 50 WP @ 1 g/L on first detection.' },
  ],
  'Maturity & Harvest': [
    { pest_code: 'bph', pest_name_en: 'Brown planthopper', pest_name_hi: 'भूरा फुदका', susceptibility_level: 'medium', triggered_when_regional_severity_at_least: 'high', icon: '🐛',
      advisory_template_en: 'BPH still active at {severity} in your area near harvest — late lodging risk. If your {varietyName} is still standing, harvest within 5 days.',
      recommended_action_en: 'Schedule harvest immediately if BPH counts > 5/hill.' },
    { pest_code: 'grain_discoloration', pest_name_en: 'Grain discoloration', pest_name_hi: 'दाना विवर्णता', susceptibility_level: 'low', triggered_when_regional_severity_at_least: 'high', icon: '🍂',
      advisory_template_en: 'Grain discoloration reports {severity} in your district. Inspect {varietyName} panicles before threshing.',
      recommended_action_en: 'Sun-dry harvested grain to 12% moisture before storage.' },
  ],
};

// ─── Hybrid variety adjustment (PHB 71) ─────────────────────────────────

/**
 * Hybrid varieties (e.g. PHB 71) get a one-step downgrade in pest
 * susceptibility to reflect their built-in resistance traits.
 */
const downgradeForHybrid = (susc) => {
  const map = { very_high: 'high', high: 'medium', medium: 'low', low: 'low' };
  return map[susc] || susc;
};

// ─── Seeder ─────────────────────────────────────────────────────────────

const RICE_VARIETY_CODES = ['IR64', 'PB1121', 'SWARNA', 'BPT5204', 'PHB71'];

module.exports = {
  async up(queryInterface) {
    // Resolve crop_id for RICE
    const [crops] = await queryInterface.sequelize.query(
      "SELECT crop_id, crop_code FROM crop_masters WHERE crop_code = 'RICE' LIMIT 1"
    );
    if (!crops || crops.length === 0) {
      // Crop not seeded — exit cleanly so this seeder is safe to skip and re-run later.
      return;
    }
    const riceCropId = crops[0].crop_id;

    // Resolve soil_type id for alluvial
    const [soils] = await queryInterface.sequelize.query(
      "SELECT id, soil_type_code FROM soil_types WHERE soil_type_code IN ('alluvial', 'ALLUVIAL') LIMIT 1"
    );
    if (!soils || soils.length === 0) {
      return;
    }
    const alluvialSoilId = soils[0].id;

    // Resolve all 5 rice varieties
    const [varietyRows] = await queryInterface.sequelize.query(
      "SELECT variety_id, variety_code, variety_name, duration_days_min, duration_days_max, is_hybrid FROM variety_masters WHERE variety_code IN (:codes)",
      { replacements: { codes: RICE_VARIETY_CODES } }
    );
    if (!varietyRows || varietyRows.length === 0) {
      return;
    }

    const now = new Date();

    for (const variety of varietyRows) {
      const popName = `Rice — ${variety.variety_name} on Alluvial Soil — Phase 2A`;

      // Idempotency: skip if PoP already exists
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
          crop_id: riceCropId,
          variety_id: variety.variety_id,
          soil_type_id: alluvialSoilId,
          climate_zone_id: null,
          state_id: null,
          pop_name: popName,
          pop_description: `Rice cultivation package of practice for ${variety.variety_name} on alluvial soil. Phase 2A — engine-readable stage triggers.`,
          recommended_by_org_id: null,
          version: '2026.04',
          is_certified: false,
          is_active: true,
          created_at: now,
          updated_at: now,
        }]);
      }

      // Skip workband seeding if any workband already exists for this PoP
      const [existingWb] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as n FROM pop_workbands WHERE pop_id = ?',
        { replacements: [popUuid] }
      );
      if (existingWb[0].n > 0) {
        continue; // already seeded
      }

      const stages = buildStages(
        variety.duration_days_min || 110,
        variety.duration_days_max || 125
      );

      // Insert workbands
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

      // Re-fetch the workbands to grab their auto-incremented ids
      const [insertedWbs] = await queryInterface.sequelize.query(
        'SELECT id, workband_name FROM pop_workbands WHERE pop_id = ? ORDER BY workband_order ASC',
        { replacements: [popUuid] }
      );

      // Build trigger rows
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

      // Build pest susceptibility rows
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
    // Find Phase 2A PoPs by name pattern, then cascade-delete via raw SQL.
    const [pops] = await queryInterface.sequelize.query(
      "SELECT id, pop_uuid FROM package_of_practices WHERE pop_name LIKE 'Rice — %%on Alluvial Soil — Phase 2A'"
    );
    if (!pops || pops.length === 0) return;
    const popUuids = pops.map((p) => p.pop_uuid);

    // Find workband ids
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
