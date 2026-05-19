/**
 * SAGE Crop Advisory Engine — Phase 2A
 *
 * Joins (variety + current PoP stage + latest weather observation +
 * active regional pest alerts) per active CultivationCycle, evaluates
 * stage-specific thresholds, and emits SageAdvisory rows tagged
 *   source = 'crop_advisory_engine'.
 *
 * Public API:
 *   runForCycle(cycleId)
 *   runForFarmer(farmerId)
 *   runForAllActiveCycles()
 *
 * Dedupe: an advisory is not re-emitted if a row with the same
 *   (farmer_id, source, advisory_metadata.cycleId, .workbandId, .parameterCode/.pestCode)
 * already exists in the last 24 hours.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const cycleStageService = require('../../roots/crop/services/cycleStageService');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const URGENCY_RANK = { low: 0, medium: 1, high: 2, critical: 3 };
const _severityAtLeast = (actual, threshold) =>
  URGENCY_RANK[(actual || 'low').toLowerCase()] >= URGENCY_RANK[(threshold || 'medium').toLowerCase()];

const PARAMETER_TO_OBS_COLUMN = {
  temp_celsius: 'temp_celsius',
  humidity_percent: 'humidity_percent',
  rainfall_mm_24h: 'rainfall_mm_24h',
  soil_moisture_percent: null, // not in weather_observations yet
  wind_speed_kmh: 'wind_speed_kmh',
};

const PARAMETER_LABEL = {
  temp_celsius: 'temperature',
  humidity_percent: 'humidity',
  rainfall_mm_24h: 'rainfall',
  soil_moisture_percent: 'soil moisture',
  wind_speed_kmh: 'wind',
};

const PARAMETER_UNIT = {
  temp_celsius: '°C',
  humidity_percent: '%',
  rainfall_mm_24h: 'mm',
  soil_moisture_percent: '%',
  wind_speed_kmh: 'km/h',
};

const PARAMETER_ICON = {
  temp_celsius: '🌡️',
  humidity_percent: '💧',
  rainfall_mm_24h: '🌧️',
  soil_moisture_percent: '🟫',
  wind_speed_kmh: '💨',
};

/**
 * Determine if an observed value breaches a trigger.
 * Returns one of: null, 'below_critical', 'above_critical',
 * 'below_optimal', 'above_optimal'.
 */
const _evaluateBreach = (value, trigger) => {
  if (value == null) return null;
  const v = Number(value);
  const cmin = trigger.critical_min != null ? Number(trigger.critical_min) : null;
  const cmax = trigger.critical_max != null ? Number(trigger.critical_max) : null;
  const omin = trigger.optimal_min != null ? Number(trigger.optimal_min) : null;
  const omax = trigger.optimal_max != null ? Number(trigger.optimal_max) : null;

  if (cmax != null && v > cmax) return 'above_critical';
  if (cmin != null && v < cmin) return 'below_critical';
  if (omax != null && v > omax) return 'above_optimal';
  if (omin != null && v < omin) return 'below_optimal';
  return null;
};

const _interpolate = (template, vars) => {
  if (!template) return null;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
};

/**
 * Resolve the lgd_district_id for a cycle. Walks Field → LgdVillage to
 * find the district. Returns null if no path exists.
 */
const _resolveCycleDistrict = async (cycle) => {
  const { Field, LgdVillage } = getDb();
  if (!cycle.field_id) return null;
  const field = await Field.findOne({ where: { id: cycle.field_id, is_active: true } });
  if (!field) return null;
  if (field.lgd_village_id && LgdVillage) {
    const village = await LgdVillage.findOne({ where: { id: field.lgd_village_id } });
    if (village && village.block_id) {
      // village → block → district. Use raw query to avoid pulling in optional models.
      const { sequelize } = getDb();
      const [rows] = await sequelize.query(
        'SELECT b.district_id FROM lgd_blocks b WHERE b.id = ?',
        { replacements: [village.block_id] }
      );
      if (rows && rows.length > 0) return rows[0].district_id;
    }
  }
  return null;
};

/**
 * Build the SageAdvisory payload for a weather/env breach.
 */
const _synthesizeWeatherAdvisory = (cycle, stage, trigger, observedValue, breach, varietyName, districtId) => {
  const stageName = stage.workband.workband_name;
  const param = trigger.parameter_code;
  const unit = PARAMETER_UNIT[param] || '';
  const label = PARAMETER_LABEL[param] || param;
  const icon = trigger.icon || PARAMETER_ICON[param] || '🌾';

  let threshold = null;
  let urgency = 'medium';
  let direction = null;
  if (breach === 'above_critical') {
    threshold = trigger.critical_max;
    urgency = trigger.urgency_above || 'high';
    direction = 'above';
  } else if (breach === 'below_critical') {
    threshold = trigger.critical_min;
    urgency = trigger.urgency_below || 'high';
    direction = 'below';
  } else if (breach === 'above_optimal') {
    threshold = trigger.optimal_max;
    urgency = 'medium';
    direction = 'above';
  } else if (breach === 'below_optimal') {
    threshold = trigger.optimal_min;
    urgency = 'medium';
    direction = 'below';
  }

  const interpVars = {
    varietyName: varietyName || 'your crop',
    stageName,
    observedValue: `${observedValue}${unit}`,
    threshold: `${threshold}${unit}`,
    parameter: label,
  };

  const title = _interpolate(
    trigger.advisory_template_en
      ? trigger.advisory_template_en.split('.')[0] // first sentence as title
      : `${stageName} stage: ${label} ${direction === 'above' ? 'too high' : 'too low'} for ${varietyName}`,
    interpVars
  );
  const body = _interpolate(
    trigger.advisory_template_en
      || `Your ${varietyName} is in ${stageName}. Observed ${label} is ${observedValue}${unit} which is ${direction} the ${threshold}${unit} threshold. ${trigger.recommended_action_en || ''}`,
    interpVars
  );

  return {
    title,
    body,
    icon,
    urgency,
    metadata: {
      title,
      body,
      icon,
      advisoryClass: 'stage_weather_breach',
      varietyName,
      stageName,
      stageOrder: stage.workband.workband_order,
      cycleId: cycle.id,
      workbandId: stage.workband.id,
      parameterCode: param,
      observedValue: Number(observedValue),
      threshold: {
        optimal_min: trigger.optimal_min != null ? Number(trigger.optimal_min) : null,
        optimal_max: trigger.optimal_max != null ? Number(trigger.optimal_max) : null,
        critical_min: trigger.critical_min != null ? Number(trigger.critical_min) : null,
        critical_max: trigger.critical_max != null ? Number(trigger.critical_max) : null,
      },
      breach,
      direction,
      districtId,
      ctaLabel: 'Mark as done',
    },
  };
};

/**
 * Build the SageAdvisory payload for a pest susceptibility match.
 */
const _synthesizePestAdvisory = (cycle, stage, susc, alert, varietyName, districtId) => {
  const stageName = stage.workband.workband_name;
  const interpVars = {
    varietyName: varietyName || 'your crop',
    stageName,
    pestName: susc.pest_name_en || susc.pest_code,
    severity: alert.severity,
  };

  const title = _interpolate(
    susc.advisory_template_en
      ? susc.advisory_template_en.split('.')[0]
      : `${susc.pest_name_en || susc.pest_code} risk in your area — ${stageName} stage`,
    interpVars
  );
  const body = _interpolate(
    susc.advisory_template_en
      || `Your ${varietyName} is in ${stageName} and ${susc.pest_name_en || susc.pest_code} pressure in your district is ${alert.severity}. ${susc.recommended_action_en || ''}`,
    interpVars
  );

  // Map susceptibility level → urgency
  const urgencyMap = { low: 'low', medium: 'medium', high: 'high', very_high: 'critical' };
  const urgency = urgencyMap[susc.susceptibility_level] || 'medium';

  return {
    title,
    body,
    icon: susc.icon || '🐛',
    urgency,
    metadata: {
      title,
      body,
      icon: susc.icon || '🐛',
      advisoryClass: 'stage_pest_breach',
      varietyName,
      stageName,
      stageOrder: stage.workband.workband_order,
      cycleId: cycle.id,
      workbandId: stage.workband.id,
      pestCode: susc.pest_code,
      pestName: susc.pest_name_en,
      regionalSeverity: alert.severity,
      pestAlertId: alert.id,
      districtId,
      ctaLabel: 'Mark as done',
    },
  };
};

/**
 * Build a 3-way fund-diversion advisory: farmer self-declared one crop,
 * Google's ALU + Sentinel pipeline detected a different one with high
 * confidence. This is the load-bearing signal for repayment-as-a-service.
 */
const _synthesizeSatelliteMismatchAdvisory = (cycle, stage, mismatch, varietyName, districtId) => {
  const stageName = stage.workband.workband_name;
  const title = `🛰️ Satellite shows ${mismatch.satelliteCropCode} in your plot, but your loan is for ${mismatch.declaredCropCode} — please confirm`;
  const body = `Google's satellite crop identification (confidence ${(mismatch.confidence * 100).toFixed(0)}%) detects ${mismatch.satelliteCropCode} growing in your field, but you registered ${mismatch.declaredCropCode} for this season. If your KCC was issued for ${mismatch.declaredCropCode} this could affect your repayment terms. Please confirm with your field agent.`;
  return {
    title,
    body,
    icon: '🛰️',
    urgency: 'high',
    metadata: {
      title,
      body,
      icon: '🛰️',
      advisoryClass: 'satellite_crop_mismatch',
      varietyName,
      stageName,
      stageOrder: stage.workband.workband_order,
      cycleId: cycle.id,
      workbandId: stage.workband.id,
      declaredCropCode: mismatch.declaredCropCode,
      satelliteCropCode: mismatch.satelliteCropCode,
      satelliteConfidence: mismatch.confidence,
      satelliteSource: 'google_alu',
      districtId,
      ctaLabel: 'I\'ll confirm',
    },
  };
};

/**
 * Look up the variety name. Returns 'your crop' if missing.
 */
const _resolveVarietyName = async (varietyId) => {
  if (!varietyId) return 'your crop';
  const { VarietyMaster } = getDb();
  const v = await VarietyMaster.findOne({ where: { variety_id: varietyId } });
  return v ? v.variety_name : 'your crop';
};

/**
 * Filter a list of synthesized advisories against the last 24h of
 * existing engine-emitted SageAdvisory rows for the same farmer / cycle /
 * workband / parameter or pest. Returns the subset that should be
 * inserted (i.e. NOT already emitted).
 */
const _dedupeAgainstLast24h = async (farmerId, advisories) => {
  if (advisories.length === 0) return [];
  const { SageAdvisory } = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const existing = await SageAdvisory.findAll({
    where: {
      farmer_id: farmerId,
      source: 'crop_advisory_engine',
      created_at: { [Op.gte]: since },
      is_active: true,
    },
    attributes: ['id', 'advisory_metadata'],
  });

  const seen = new Set();
  for (const e of existing) {
    const m = e.advisory_metadata || {};
    const key = [m.cycleId, m.workbandId, m.parameterCode || m.pestCode || '_'].join('::');
    seen.add(key);
  }

  return advisories.filter((a) => {
    const m = a.metadata;
    const key = [m.cycleId, m.workbandId, m.parameterCode || m.pestCode || '_'].join('::');
    return !seen.has(key);
  });
};

/**
 * Resolve the SageAdvisoryType id for a given engine advisory class.
 */
const _resolveAdvisoryTypeId = async (advisoryClass) => {
  const { SageAdvisoryType } = getDb();
  let code = 'weather_alert';
  if (advisoryClass === 'stage_pest_breach') code = 'pest_disease_alert';
  else if (advisoryClass === 'satellite_crop_mismatch') code = 'loan_reminder';
  const t = await SageAdvisoryType.findOne({ where: { advisory_type_code: code, is_active: true } });
  return t ? t.id : null;
};

/**
 * Run the engine for a single cycle. Returns
 *   { cycleId, emitted, skipped, reason? }
 */
const runForCycle = async (cycleId) => {
  const {
    SageAdvisory,
    PopWorkbandTrigger,
    PopWorkbandPestSusceptibility,
    WeatherObservation,
    RegionalPestAlert,
  } = getDb();

  const stage = await cycleStageService.getCycleCurrentStage(cycleId);
  if (!stage) {
    return { cycleId, emitted: 0, skipped: 0, reason: 'no_stage' };
  }

  const cycle = stage.cycle;
  // Phase 2A.1+ prefer the denormalized cultivation_cycles.farmer_id
  // (added in migration 20260408000008). Fall back to the field → farm
  // register walk for legacy rows.
  if (!cycle.farmer_id && cycle.field_id) {
    const { Field, FarmRegister } = getDb();
    const f = await Field.findOne({
      where: { id: cycle.field_id },
      include: [{ model: FarmRegister, as: 'farmRegister', required: true }],
    });
    cycle.farmer_id = f?.farmRegister?.farmer_id || null;
  }
  if (!cycle.farmer_id) {
    return { cycleId, emitted: 0, skipped: 0, reason: 'no_farmer' };
  }

  const varietyName = await _resolveVarietyName(cycle.variety_id);
  const districtId = await _resolveCycleDistrict(cycle);

  // Phase 2A.1 — pull the latest Google satellite observation for context
  const { GoogleFieldObservation, CropMaster } = getDb();
  let googleObs = null;
  let googleCropMismatch = null;
  if (GoogleFieldObservation) {
    googleObs = await GoogleFieldObservation.findOne({
      where: { cycle_id: cycleId, is_active: true },
      order: [['last_observed_at', 'DESC']],
    });
    if (googleObs && googleObs.detected_crop_code && cycle.crop_id) {
      const declaredCm = await CropMaster.findOne({ where: { crop_id: cycle.crop_id } });
      if (declaredCm && declaredCm.crop_code !== googleObs.detected_crop_code && Number(googleObs.confidence) >= 0.7) {
        googleCropMismatch = {
          declaredCropCode: declaredCm.crop_code,
          satelliteCropCode: googleObs.detected_crop_code,
          confidence: Number(googleObs.confidence),
        };
      }
    }
  }

  const [triggers, pestProfile] = await Promise.all([
    PopWorkbandTrigger.findAll({
      where: { pop_workband_id: stage.workband.id, is_active: true },
    }),
    PopWorkbandPestSusceptibility.findAll({
      where: { pop_workband_id: stage.workband.id, is_active: true },
    }),
  ]);

  // Latest weather observation for the field's district (last 24h).
  let observation = null;
  if (districtId) {
    observation = await WeatherObservation.findOne({
      where: {
        lgd_district_id: districtId,
        observed_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        is_active: true,
      },
      order: [['observed_at', 'DESC']],
    });
  }
  // Fallback: any latest observation in the last 24h, ignoring district.
  // Useful for demo / dev where district mapping isn't wired yet.
  if (!observation) {
    observation = await WeatherObservation.findOne({
      where: {
        observed_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        is_active: true,
      },
      order: [['observed_at', 'DESC']],
    });
  }

  // Active pest alerts for this district + crop.
  let pestAlerts = [];
  if (cycle.crop_id) {
    pestAlerts = await RegionalPestAlert.findAll({
      where: {
        ...(districtId ? { lgd_district_id: districtId } : {}),
        crop_id: cycle.crop_id,
        observed_until: { [Op.gte]: new Date() },
        is_active: true,
      },
    });
  }

  // 1. Weather/env breach evaluation
  const synthesized = [];
  for (const trigger of triggers) {
    const obsCol = PARAMETER_TO_OBS_COLUMN[trigger.parameter_code];
    if (!obsCol || !observation) continue;
    const value = observation[obsCol];
    if (value == null) continue;
    const breach = _evaluateBreach(value, trigger);
    if (!breach) continue;
    synthesized.push(_synthesizeWeatherAdvisory(cycle, stage, trigger, value, breach, varietyName, districtId));
  }

  // 1b. Phase 2A.1 — 3-way fund-diversion check (self-declared vs satellite)
  if (googleCropMismatch) {
    synthesized.push(_synthesizeSatelliteMismatchAdvisory(cycle, stage, googleCropMismatch, varietyName, districtId));
  }

  // 2. Pest susceptibility evaluation
  for (const susc of pestProfile) {
    const matchingAlert = pestAlerts.find((a) => a.pest_code === susc.pest_code);
    if (!matchingAlert) continue;
    if (!_severityAtLeast(matchingAlert.severity, susc.triggered_when_regional_severity_at_least)) continue;
    synthesized.push(_synthesizePestAdvisory(cycle, stage, susc, matchingAlert, varietyName, districtId));
  }

  // 2b. Decorate every synthesized advisory with satellite context if we
  // have a Google observation. Frontend can render `latestNdvi` and
  // `satelliteConfidence` next to the existing fields.
  if (googleObs) {
    for (const a of synthesized) {
      a.metadata.satellite = {
        source: googleObs.source,
        detectedCropCode: googleObs.detected_crop_code,
        sowingDate: googleObs.sowing_date,
        latestNdvi: googleObs.latest_ndvi != null ? Number(googleObs.latest_ndvi) : null,
        confidence: googleObs.confidence != null ? Number(googleObs.confidence) : null,
        observationId: googleObs.id,
      };
    }
  }

  // 3. Dedupe vs last 24h
  const fresh = await _dedupeAgainstLast24h(cycle.farmer_id, synthesized);

  if (fresh.length === 0) {
    return { cycleId, emitted: 0, skipped: synthesized.length };
  }

  // 4. Insert SageAdvisory rows
  const now = new Date();
  const rows = [];
  for (const a of fresh) {
    const advisoryTypeId = await _resolveAdvisoryTypeId(a.metadata.advisoryClass);
    rows.push({
      advisory_uuid: uuidv4(),
      farmer_id: cycle.farmer_id,
      advisory_type_id: advisoryTypeId,
      advisory_content: a.body,
      advisory_language: 'en',
      advisory_urgency: a.urgency,
      delivery_channel: 'in_app',
      delivered_at: now,
      action_taken_by_farmer: false,
      advisory_metadata: a.metadata,
      source: 'crop_advisory_engine',
      is_active: true,
    });
  }

  await SageAdvisory.bulkCreate(rows);
  logger.info(`cropAdvisoryEngine: cycle ${cycleId} emitted ${rows.length} advisories`);
  return { cycleId, emitted: rows.length, skipped: synthesized.length - fresh.length };
};

/**
 * Run the engine for every active CultivationCycle owned by a farmer.
 */
const runForFarmer = async (farmerId) => {
  const { CultivationCycle, Field, FarmRegister, Sequelize } = getDb();
  const { Op } = require('sequelize');
  // Pick up cycles owned directly via cultivation_cycles.farmer_id (the
  // crop card path) AND cycles linked through field → farm_register (the
  // legacy field-based path). UNION via two separate queries since
  // Sequelize OR over different join chains is awkward.
  const directCycles = await CultivationCycle.findAll({
    where: { is_active: true, farmer_id: farmerId },
  });
  const fieldLinkedCycles = await CultivationCycle.findAll({
    where: { is_active: true, farmer_id: { [Op.is]: null } },
    include: [{
      model: Field, as: 'field', required: true,
      include: [{ model: FarmRegister, as: 'farmRegister', where: { farmer_id: farmerId }, required: true }],
    }],
  });

  const reports = [];
  for (const c of [...directCycles, ...fieldLinkedCycles]) {
    if (!c.farmer_id) c.farmer_id = farmerId;
    const r = await runForCycle(c.id);
    reports.push(r);
  }
  return { farmerId, cycles: reports };
};

/**
 * Run the engine across every active CultivationCycle in the system.
 * Used by the crop advisory cron job.
 */
const runForAllActiveCycles = async () => {
  const { CultivationCycle, Field, FarmRegister } = getDb();
  const cycles = await CultivationCycle.findAll({
    where: { is_active: true },
    include: [{
      model: Field, as: 'field', required: true,
      include: [{ model: FarmRegister, as: 'farmRegister', required: true }],
    }],
  });
  const reports = [];
  for (const c of cycles) {
    // Resolve farmer_id from the join chain.
    const farmerId = c.field?.farmRegister?.farmer_id;
    if (!farmerId) continue;
    c.farmer_id = farmerId;
    const r = await runForCycle(c.id);
    reports.push(r);
  }
  return { totalCycles: reports.length, reports };
};

/* ====================================================================
 * ROOTS Variance-Based Advisory Generation (Phase 4.3)
 *
 * Transforms variance data (delays, deviations, soil deficiencies) into
 * actionable, farmer-friendly recommendations.
 * ==================================================================== */

const PRIORITY_MAP = {
  critical: { channel: 'push', urgency: 'critical' },
  high: { channel: 'push', urgency: 'high' },
  medium: { channel: 'in_app', urgency: 'medium' },
  low: { channel: 'in_app', urgency: 'low' },
};

/**
 * Generate personalized advisories from ROOTS variance data for a farmer.
 * Reads compliance snapshots, variance workband results, and soil health.
 */
const generateVarianceBasedAdvisories = async (farmerId) => {
  const {
    CultivationCycle, RootsComplianceSnapshot, SoilHealthRecord,
    SageAdvisory, SageAdvisoryType,
  } = getDb();

  const activeCycles = await CultivationCycle.findAll({
    where: {
      farmer_id: farmerId,
      is_active: true,
      cycle_status: { [Op.in]: ['sowing', 'growing', 'monitoring', 'harvesting'] },
    },
  });

  if (!activeCycles.length) return { emitted: 0, advisories: [] };

  // Resolve advisory type
  let typeId = null;
  try {
    const type = await SageAdvisoryType.findOne({ where: { advisory_type_code: 'variance_advisory', is_active: true } });
    typeId = type ? type.id : null;
  } catch {}

  // Count previous seasons for personalization depth
  const allSnapshots = await RootsComplianceSnapshot.findAll({
    where: { farmer_id: farmerId, is_active: true },
    attributes: ['season', 'activity_reference_id'],
  });
  const seasonCount = new Set(allSnapshots.map((s) => s.season).filter(Boolean)).size;

  const emitted = [];
  const now = new Date();
  const dedupeWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  for (const cycle of activeCycles) {
    const cropName = cycle.self_declared_crop || cycle.crop_id || 'your crop';

    // Get latest compliance snapshot
    const snapshot = await RootsComplianceSnapshot.findOne({
      where: { farmer_id: farmerId, activity_reference_id: cycle.id, is_active: true },
      order: [['snapshot_date', 'DESC']],
    });
    if (!snapshot || snapshot.data_completeness_pct < 30) continue;

    // Get soil data if available
    let soilRecord = null;
    if (cycle.field_id) {
      soilRecord = await SoilHealthRecord.findOne({
        where: { field_id: cycle.field_id, is_active: true },
        order: [['test_date', 'DESC']],
      });
    }

    const advisoryBatch = [];

    // a. Timing variance: delayed stages
    const timingScore = parseFloat(snapshot.timing_compliance_score || 100);
    if (timingScore < 60 && snapshot.delayed_stages > 0) {
      advisoryBatch.push({
        priority: 'high',
        content: `Your ${cropName} has ${snapshot.delayed_stages} delayed stage(s). Timing compliance is ${Math.round(timingScore)}%. Try to stay within the recommended schedule for better results.`,
        metadata: { type: 'timing_variance', cycleId: cycle.id, timingScore },
      });
    }

    // b. Practice adherence issues
    const practiceScore = parseFloat(snapshot.practice_compliance_score || 100);
    if (practiceScore < 50) {
      advisoryBatch.push({
        priority: 'medium',
        content: `Practice adherence for ${cropName} is ${Math.round(practiceScore)}%. Some recommended practices were skipped or substituted. Following the full Package of Practice improves yield and reduces risk.`,
        metadata: { type: 'practice_variance', cycleId: cycle.id, practiceScore },
      });
    }

    // c. Missed stages
    if (snapshot.missed_stages > 0) {
      advisoryBatch.push({
        priority: 'high',
        content: `You missed ${snapshot.missed_stages} stage(s) in your ${cropName} cycle. Missing critical stages (sowing, fertilization, harvest) directly impacts yield. Please update your records.`,
        metadata: { type: 'missed_stages', cycleId: cycle.id, missedStages: snapshot.missed_stages },
      });
    }

    // d. Quantity under-application + low soil nutrient
    if (soilRecord) {
      const qtyScore = parseFloat(snapshot.quantity_compliance_score || 100);
      const nitrogen = soilRecord.nitrogen_kg_per_hectare;
      const phosphorus = soilRecord.phosphorus_kg_per_hectare;

      if (qtyScore < 60 && nitrogen && nitrogen < 250) {
        advisoryBatch.push({
          priority: 'critical',
          content: `⚠️ Your soil is LOW in Nitrogen (${nitrogen} kg/ha) AND you applied less fertilizer than recommended. Apply supplemental urea at 20% above normal dose immediately.`,
          metadata: { type: 'soil_qty_critical', cycleId: cycle.id, nutrient: 'N', soilLevel: nitrogen },
        });
      }

      if (qtyScore < 60 && phosphorus && phosphorus < 11) {
        advisoryBatch.push({
          priority: 'high',
          content: `Your soil is LOW in Phosphorus (${phosphorus} kg/ha) and you under-applied P fertilizer. Apply supplemental SSP/DAP at 25% above recommended dose.`,
          metadata: { type: 'soil_qty_high', cycleId: cycle.id, nutrient: 'P', soilLevel: phosphorus },
        });
      }

      // e. Over-application + high soil nutrient
      const potassium = soilRecord.potassium_kg_per_hectare;
      if (qtyScore > 90 && potassium && potassium > 280) {
        advisoryBatch.push({
          priority: 'low',
          content: `Your soil already has HIGH Potassium (${potassium} kg/ha). The extra potash you applied is wasteful. Consider skipping K fertilizer next stage.`,
          metadata: { type: 'over_application', cycleId: cycle.id, nutrient: 'K', soilLevel: potassium },
        });
      }
    }

    // f. Cost anomaly
    const costScore = parseFloat(snapshot.cost_compliance_score || 100);
    const costVariance = parseFloat(snapshot.cost_variance_pct || 0);
    if (costScore < 40 && Math.abs(costVariance) > 50) {
      advisoryBatch.push({
        priority: 'medium',
        content: `Cost deviation of ${costVariance > 0 ? '+' : ''}${Math.round(costVariance)}% from expected. ${costVariance > 0 ? 'Consider cheaper alternatives or compare vendor prices.' : 'Ensure all inputs are being applied.'}`,
        metadata: { type: 'cost_variance', cycleId: cycle.id, costVariance },
      });
    }

    // Season 2+ personalization: comparative advisory
    if (seasonCount >= 2 && snapshot.overall_compliance_score) {
      const score = parseFloat(snapshot.overall_compliance_score);
      if (score >= 80) {
        advisoryBatch.push({
          priority: 'low',
          content: `Great progress! Your compliance score is ${Math.round(score)}/100, improving over ${seasonCount} seasons. Keep following the recommended practices.`,
          metadata: { type: 'season_improvement', cycleId: cycle.id, seasonCount },
        });
      }
    }

    // Season 3+ pattern advisory
    if (seasonCount >= 3 && snapshot.timing_compliance_score && parseFloat(snapshot.timing_compliance_score) >= 85) {
      advisoryBatch.push({
        priority: 'low',
        content: `Based on your ${seasonCount} seasons of data, you perform best when stages are completed on time. Your timing discipline is a strength — maintain it.`,
        metadata: { type: 'pattern_advisory', cycleId: cycle.id, seasonCount },
      });
    }

    // Deduplicate and persist
    for (const adv of advisoryBatch) {
      const dedupeKey = `${cycle.id}_${adv.metadata.type}`;

      // Check if same advisory type was emitted in last 24h
      const existing = await SageAdvisory.findOne({
        where: {
          farmer_id: farmerId,
          source: 'roots_variance_engine',
          is_active: true,
          created_at: { [Op.gte]: dedupeWindow },
        },
        order: [['created_at', 'DESC']],
      });

      // Simple dedup: skip if any recent variance advisory exists for this cycle+type
      if (existing) {
        try {
          const existingMeta = existing.advisory_metadata || {};
          if (existingMeta.type === adv.metadata.type && existingMeta.cycleId === cycle.id) continue;
        } catch {}
      }

      const config = PRIORITY_MAP[adv.priority] || PRIORITY_MAP.medium;

      const created = await SageAdvisory.create({
        advisory_uuid: uuidv4(),
        farmer_id: farmerId,
        advisory_type_id: typeId,
        advisory_content: adv.content,
        advisory_urgency: config.urgency,
        delivery_channel: config.channel,
        delivered_at: now,
        source: 'roots_variance_engine',
        advisory_metadata: adv.metadata,
      });

      emitted.push({
        advisoryId: created.id,
        priority: adv.priority,
        type: adv.metadata.type,
        channel: config.channel,
      });

      // Critical/high: also send push notification
      if (adv.priority === 'critical' || adv.priority === 'high') {
        try {
          const { getChannel } = require('../../../config/rabbitmq');
          const appConfig = require('../../../config');
          const channel = await getChannel();
          if (channel) {
            channel.publish(
              appConfig.rabbitmq.exchange,
              'notification.push.farmer',
              Buffer.from(JSON.stringify({
                farmerId,
                type: 'sage_variance_advisory',
                title: adv.priority === 'critical' ? '⚠️ Critical Advisory' : '🌾 Farm Advisory',
                body: adv.content.slice(0, 150),
                data: { screen: 'sage-advisories', cycleId: cycle.id },
                priority: adv.priority,
                deliveredAt: now,
              })),
              { persistent: true }
            );
          }
        } catch {}
      }
    }
  }

  logger.info(`Variance advisories for farmer ${farmerId}: ${emitted.length} emitted`);
  return { emitted: emitted.length, advisories: emitted };
};

module.exports = {
  runForCycle,
  runForFarmer,
  runForAllActiveCycles,
  generateVarianceBasedAdvisories,
  _evaluateBreach, // exposed for unit testing
};
