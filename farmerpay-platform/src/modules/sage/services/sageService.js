/**
 * Sage Service
 * Business logic for AI advisories, alerts, crop observations, and feedback.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Retrieves advisories for a farmer with optional filtering.
 */
const getAdvisories = async (farmerId, filters = {}) => {
  const { SageAdvisory, SageAdvisoryType } = getDb();

  const where = { farmer_id: farmerId, is_active: true };
  if (filters.status === 'delivered') where.delivered_at = { [require('sequelize').Op.ne]: null };

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  const { count, rows } = await SageAdvisory.findAndCountAll({
    where,
    include: [{ model: SageAdvisoryType, as: 'advisoryType', attributes: ['advisory_type_code', 'advisory_type_name'] }],
    order: [['delivered_at', 'DESC']],
    limit,
    offset,
  });

  return {
    advisories: rows.map((a) => ({
      advisoryId: a.id,
      advisoryType: a.advisoryType ? a.advisoryType.advisory_type_name : null,
      content: a.advisory_content,
      urgency: a.advisory_urgency,
      language: a.advisory_language,
      channel: a.delivery_channel,
      deliveredAt: a.delivered_at,
      acknowledged: !!a.acknowledged_at,
    })),
    total: count,
  };
};

/**
 * Acknowledges an advisory and records action outcome.
 */
const acknowledgeAdvisory = async (farmerId, data) => {
  const { SageAdvisory, SageFarmerInteraction } = getDb();

  const advisory = await SageAdvisory.findOne({
    where: { id: data.advisoryId, farmer_id: farmerId, is_active: true },
  });
  if (!advisory) {
    const err = new Error('Advisory not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  await advisory.update({
    acknowledged_at: new Date(),
    action_taken_by_farmer: data.actionTaken || false,
    action_outcome: data.outcome || null,
  });

  // Log the interaction
  await SageFarmerInteraction.create({
    interaction_uuid: uuidv4(),
    farmer_id: farmerId,
    interaction_date: new Date(),
    interaction_type: 'advisory_acknowledged',
    interaction_query: null,
    interaction_response: `Advisory ${data.advisoryId} acknowledged`,
  });

  logger.info(`Advisory ${data.advisoryId} acknowledged by farmer ${farmerId}`);
  return advisory;
};

/**
 * Retrieves alerts for a farmer with optional type and urgency filtering.
 */
const getAlerts = async (farmerId, filters = {}) => {
  const { SageAlert } = getDb();

  const where = { farmer_id: farmerId, is_active: true };
  if (filters.type) where.alert_type = filters.type;
  if (filters.urgency) where.alert_urgency = filters.urgency;

  const alerts = await SageAlert.findAll({
    where,
    order: [['alert_triggered_at', 'DESC']],
  });

  return alerts.map((a) => ({
    alertId: a.id,
    alertType: a.alert_type,
    message: a.alert_message,
    urgency: a.alert_urgency,
    triggeredAt: a.alert_triggered_at,
    acknowledgedAt: a.alert_acknowledged_at,
    actionRecommended: a.action_recommended,
  }));
};

/**
 * Creates a crop health observation and optionally generates an advisory.
 */
const createCropObservation = async (farmerId, data) => {
  const { SageCropHealthObservation, SageAdvisory, SageAdvisoryType } = getDb();

  const observation = await SageCropHealthObservation.create({
    observation_uuid: uuidv4(),
    farmer_id: farmerId,
    cycle_id: data.cycleId || null,
    observation_date: data.observationDate || new Date(),
    health_status: data.healthStatus,
    pest_observed: data.pestObserved || false,
    pest_name: data.pestName || null,
    affected_area_percent: data.affectedAreaPercent || null,
    disease_observed: data.diseaseObserved || false,
    disease_name: data.diseaseName || null,
  });

  let advisoryGenerated = false;

  // Auto-generate advisory if pest or disease detected
  if (data.pestObserved || data.diseaseObserved) {
    const advisoryType = await SageAdvisoryType.findOne({
      where: { advisory_type_code: 'pest_disease_alert', is_active: true },
    });

    const issue = data.pestObserved ? `Pest: ${data.pestName || 'unknown'}` : `Disease: ${data.diseaseName || 'unknown'}`;
    const content = `${issue} detected. Affected area: ${data.affectedAreaPercent || 'unknown'}%. Please take immediate action.`;

    await SageAdvisory.create({
      advisory_uuid: uuidv4(),
      farmer_id: farmerId,
      advisory_type_id: advisoryType ? advisoryType.id : null,
      advisory_content: content,
      advisory_urgency: data.healthStatus === 'poor' ? 'critical' : 'high',
      delivery_channel: 'in_app',
      delivered_at: new Date(),
    });

    // Update observation with recommendation
    await observation.update({ recommended_action: content });
    advisoryGenerated = true;
  }

  logger.info(`Crop observation ${observation.id} created for farmer ${farmerId}`);
  return { observationId: observation.id, advisoryGenerated };
};

// ═══════════════════════════════════════════════════════════════════
// SOIL HEALTH CARD — Upload, Validate, Structure, Generate Advisory
// ═══════════════════════════════════════════════════════════════════

/**
 * Soil health parameter thresholds (ICAR/KVK norms for Indian soils).
 * Used for validation, grading, and advisory generation.
 */
const SOIL_NORMS = {
  ph: { low: 5.5, optimal_min: 6.0, optimal_max: 7.5, high: 8.5, unit: '' },
  organic_carbon: { low: 0.40, medium: 0.75, high: 999, unit: '%', label: 'Organic Carbon' },
  nitrogen: { low: 140, medium: 280, high: 999, unit: 'kg/ha', label: 'Nitrogen (N)' },
  phosphorus: { low: 11, medium: 25, high: 999, unit: 'kg/ha', label: 'Phosphorus (P)' },
  potassium: { low: 110, medium: 280, high: 999, unit: 'kg/ha', label: 'Potassium (K)' },
  sulphur: { low: 10, medium: 20, high: 999, unit: 'ppm', label: 'Sulphur (S)' },
  boron: { low: 0.5, medium: 1.0, high: 999, unit: 'ppm', label: 'Boron (B)' },
  iron: { low: 3.0, medium: 5.5, high: 999, unit: 'ppm', label: 'Iron (Fe)' },
};

/**
 * Classify a soil parameter as low/medium/high based on ICAR norms.
 */
function classifySoilParam(param, value) {
  const norm = SOIL_NORMS[param];
  if (!norm) return { status: 'unknown', color: 'gray' };
  if (param === 'ph') {
    if (value < norm.low) return { status: 'acidic', color: 'red', advice: 'Apply agricultural lime (2-4 tonnes/ha) to raise pH.' };
    if (value > norm.high) return { status: 'alkaline', color: 'red', advice: 'Apply gypsum (2-5 tonnes/ha) or sulphur to lower pH.' };
    if (value >= norm.optimal_min && value <= norm.optimal_max) return { status: 'optimal', color: 'green', advice: 'pH is ideal for most crops.' };
    return { status: 'marginal', color: 'amber', advice: 'pH is slightly outside optimal range. Monitor and adjust.' };
  }
  if (value <= norm.low) return { status: 'low', color: 'red', advice: `${norm.label} is deficient. Apply recommended fertilizers.` };
  if (value <= norm.medium) return { status: 'medium', color: 'amber', advice: `${norm.label} is moderate. Maintain with balanced fertilization.` };
  return { status: 'high', color: 'green', advice: `${norm.label} is sufficient. Reduce application if needed.` };
}

/**
 * Calculate overall soil health score (0-100) from NPK + micronutrients.
 */
function calculateSoilHealthScore(data) {
  let score = 0;
  let maxScore = 0;

  const params = [
    { key: 'ph', value: data.ph, weight: 20 },
    { key: 'organic_carbon', value: data.organicCarbon, weight: 15 },
    { key: 'nitrogen', value: data.nitrogen, weight: 15 },
    { key: 'phosphorus', value: data.phosphorus, weight: 15 },
    { key: 'potassium', value: data.potassium, weight: 15 },
    { key: 'sulphur', value: data.sulphur, weight: 7 },
    { key: 'boron', value: data.boron, weight: 6 },
    { key: 'iron', value: data.iron, weight: 7 },
  ];

  for (const p of params) {
    maxScore += p.weight;
    if (p.value == null) continue;
    const classification = classifySoilParam(p.key, p.value);
    if (classification.status === 'optimal' || classification.status === 'high') score += p.weight;
    else if (classification.status === 'medium' || classification.status === 'marginal') score += p.weight * 0.6;
    else if (classification.status === 'low' || classification.status === 'acidic' || classification.status === 'alkaline') score += p.weight * 0.2;
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

/**
 * Validate soil health card data — check for out-of-range values.
 */
function validateSoilData(data) {
  const errors = [];
  if (data.ph != null && (data.ph < 3 || data.ph > 11)) errors.push('pH must be between 3.0 and 11.0');
  if (data.organicCarbon != null && (data.organicCarbon < 0 || data.organicCarbon > 5)) errors.push('Organic Carbon must be 0-5%');
  if (data.nitrogen != null && (data.nitrogen < 0 || data.nitrogen > 1000)) errors.push('Nitrogen must be 0-1000 kg/ha');
  if (data.phosphorus != null && (data.phosphorus < 0 || data.phosphorus > 500)) errors.push('Phosphorus must be 0-500 kg/ha');
  if (data.potassium != null && (data.potassium < 0 || data.potassium > 1000)) errors.push('Potassium must be 0-1000 kg/ha');
  if (data.sulphur != null && (data.sulphur < 0 || data.sulphur > 100)) errors.push('Sulphur must be 0-100 ppm');
  if (data.boron != null && (data.boron < 0 || data.boron > 10)) errors.push('Boron must be 0-10 ppm');
  if (data.iron != null && (data.iron < 0 || data.iron > 50)) errors.push('Iron must be 0-50 ppm');
  return errors;
}

/**
 * Generate farmer-friendly advisory from soil health data.
 * Returns bilingual (English + Hindi) recommendations.
 */
function generateSoilAdvisories(data, healthScore) {
  const advisories = [];

  // pH advisory
  if (data.ph != null) {
    const cls = classifySoilParam('ph', data.ph);
    if (cls.status !== 'optimal') {
      advisories.push({
        parameter: 'pH',
        status: cls.status,
        severity: cls.status === 'acidic' || cls.status === 'alkaline' ? 'high' : 'medium',
        adviceEn: cls.advice,
        adviceHi: cls.status === 'acidic' ? 'मिट्टी अम्लीय है। चूना (2-4 टन/हेक्टेयर) डालें।' : cls.status === 'alkaline' ? 'मिट्टी क्षारीय है। जिप्सम (2-5 टन/हेक्टेयर) डालें।' : 'pH सामान्य सीमा के करीब है।',
      });
    }
  }

  // Macro nutrients
  for (const [key, label, hindi] of [
    ['nitrogen', 'Nitrogen (N)', 'नाइट्रोजन (N)'],
    ['phosphorus', 'Phosphorus (P)', 'फॉस्फोरस (P)'],
    ['potassium', 'Potassium (K)', 'पोटैशियम (K)'],
  ]) {
    const val = data[key];
    if (val == null) continue;
    const cls = classifySoilParam(key, val);
    if (cls.status === 'low') {
      advisories.push({
        parameter: label,
        status: 'low',
        severity: 'high',
        adviceEn: cls.advice,
        adviceHi: `${hindi} की कमी है। अनुशंसित उर्वरक डालें।`,
      });
    } else if (cls.status === 'medium') {
      advisories.push({
        parameter: label,
        status: 'medium',
        severity: 'medium',
        adviceEn: cls.advice,
        adviceHi: `${hindi} मध्यम है। संतुलित उर्वरक जारी रखें।`,
      });
    }
  }

  // Organic carbon
  if (data.organicCarbon != null) {
    const cls = classifySoilParam('organic_carbon', data.organicCarbon);
    if (cls.status === 'low') {
      advisories.push({
        parameter: 'Organic Carbon',
        status: 'low',
        severity: 'high',
        adviceEn: 'Organic matter is low. Apply FYM (5-10 tonnes/ha), green manure, or vermicompost.',
        adviceHi: 'जैविक कार्बन कम है। गोबर खाद (5-10 टन/हेक्टेयर), हरी खाद या वर्मीकम्पोस्ट डालें।',
      });
    }
  }

  // Overall health advisory
  if (healthScore < 40) {
    advisories.unshift({
      parameter: 'Overall Soil Health',
      status: 'poor',
      severity: 'critical',
      adviceEn: `Soil health score is ${healthScore}/100 (Poor). Multiple deficiencies detected. Consult your local KVK for a comprehensive soil management plan.`,
      adviceHi: `मिट्टी स्वास्थ्य स्कोर ${healthScore}/100 (खराब)। कई कमियाँ पाई गई हैं। व्यापक मृदा प्रबंधन योजना के लिए अपने स्थानीय कृषि विज्ञान केंद्र से संपर्क करें।`,
    });
  } else if (healthScore < 70) {
    advisories.unshift({
      parameter: 'Overall Soil Health',
      status: 'moderate',
      severity: 'medium',
      adviceEn: `Soil health score is ${healthScore}/100 (Moderate). Some parameters need attention. Follow the recommendations below.`,
      adviceHi: `मिट्टी स्वास्थ्य स्कोर ${healthScore}/100 (मध्यम)। कुछ मापदंडों पर ध्यान दें। नीचे दी गई सिफारिशों का पालन करें।`,
    });
  }

  return advisories;
}

/**
 * Save soil health card data for a farmer's field.
 * Validates, scores, generates advisories, and optionally creates SAGE advisory.
 *
 * @param {number} farmerId
 * @param {Object} data - Soil test values
 * @returns {Object} { soilHealthId, healthScore, classification, parameters, advisories }
 */
const saveSoilHealthCard = async (farmerId, data) => {
  const { SoilHealthRecord, FieldSoilDetail, SageAdvisory, SageAdvisoryType, sequelize: seq } = getDb();

  // Validate
  const errors = validateSoilData(data);
  if (errors.length > 0) {
    const err = new Error(`Validation failed: ${errors.join('; ')}`);
    err.statusCode = 400;
    err.errorCode = 'SAGE_VAL_001';
    throw err;
  }

  // Resolve field_id — find a field belonging to this farmer, or use NULL
  let fieldId = data.fieldId || null;
  if (!fieldId) {
    try {
      const [fields] = await seq.query(`SELECT f.id FROM fields f JOIN farm_registers fr ON f.farm_register_id = fr.id WHERE fr.farmer_id = ${farmerId} LIMIT 1`);
      fieldId = fields.length > 0 ? fields[0].id : null;
    } catch (e) { /* no fields registered */ }
  }

  // Save to soil_health_records (field_id may be null if farmer has no registered fields)
  let soilRecord;
  try {
    if (fieldId) {
      soilRecord = await SoilHealthRecord.create({
        field_id: fieldId,
        test_date: data.testDate || new Date(),
        organic_carbon_percent: data.organicCarbon || null,
        nitrogen_kg_per_hectare: data.nitrogen || null,
        phosphorus_kg_per_hectare: data.phosphorus || null,
        potassium_kg_per_hectare: data.potassium || null,
        sulphur_ppm: data.sulphur || null,
        boron_ppm: data.boron || null,
        iron_ppm: data.iron || null,
        test_lab_name: data.labName || 'Manual Entry',
        is_active: true,
      });
    } else {
      // No field registered — store directly via raw SQL without FK constraint
      const [result] = await seq.query(
        `INSERT INTO soil_health_records (field_id, test_date, organic_carbon_percent, nitrogen_kg_per_hectare, phosphorus_kg_per_hectare, potassium_kg_per_hectare, sulphur_ppm, boron_ppm, iron_ppm, test_lab_name, is_active, created_at, updated_at) VALUES (NULL, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        { replacements: [data.organicCarbon || null, data.nitrogen || null, data.phosphorus || null, data.potassium || null, data.sulphur || null, data.boron || null, data.iron || null, data.labName || 'Manual Entry'] }
      );
      soilRecord = { id: result };
    }
  } catch (e) {
    logger.warn('SoilHealthRecord create error:', e.message);
    soilRecord = { id: null };
  }

  // Update field_soil_details
  try {
    await FieldSoilDetail.upsert({
      field_id: data.fieldId || 1,
      soil_type_id: data.soilTypeId || 1,
      soil_test_date: data.testDate || new Date(),
      ph_value: data.ph || null,
      organic_matter_percent: data.organicCarbon || null,
      nitrogen_ppm: data.nitrogen || null,
      phosphorus_ppm: data.phosphorus || null,
      potassium_ppm: data.potassium || null,
      is_active: true,
    });
  } catch (e) { logger.warn('FieldSoilDetail upsert error:', e.message); }

  // Calculate health score
  const healthScore = calculateSoilHealthScore(data);
  const classification = healthScore >= 70 ? 'healthy' : healthScore >= 40 ? 'moderate' : 'poor';

  // Build parameter breakdown
  const parameters = [];
  for (const [key, param] of Object.entries(SOIL_NORMS)) {
    const val = key === 'ph' ? data.ph : key === 'organic_carbon' ? data.organicCarbon : data[key];
    if (val == null) continue;
    const cls = classifySoilParam(key, val);
    parameters.push({
      parameter: param.label || key,
      value: val,
      unit: param.unit,
      status: cls.status,
      color: cls.color,
    });
  }

  // Generate farmer-friendly advisories
  const advisories = generateSoilAdvisories(data, healthScore);

  // Auto-create SAGE advisory if soil is poor
  if (healthScore < 40) {
    try {
      const advisoryType = await SageAdvisoryType.findOne({
        where: { advisory_type_code: 'input_recommendation', is_active: true },
      });
      await SageAdvisory.create({
        advisory_uuid: uuidv4(),
        farmer_id: farmerId,
        advisory_type_id: advisoryType?.id || null,
        advisory_content: `Soil health score is ${healthScore}/100 (Poor). Key deficiencies: ${advisories.filter(a => a.severity === 'high').map(a => a.parameter).join(', ')}. Consult KVK for soil management plan.`,
        advisory_urgency: 'high',
        delivery_channel: 'in_app',
        delivered_at: new Date(),
      });
    } catch (e) { logger.warn('Advisory create error:', e.message); }
  }

  logger.info(`Soil health card saved for farmer ${farmerId}, score: ${healthScore}/100`);

  return {
    soilHealthId: soilRecord?.id || soilRecord,
    healthScore,
    classification,
    parameters,
    advisories,
  };
};

/**
 * Get farmer's latest soil health summary (for dashboard rendering).
 */
const getSoilHealthSummary = async (farmerId) => {
  const { sequelize: seq } = getDb();

  // Fetch latest soil health record via farm_registers → fields → soil_health_records
  try {
    const [records] = await seq.query(`
      SELECT shr.*, fsd.ph_value, fsd.soil_type_id
      FROM soil_health_records shr
      LEFT JOIN field_soil_details fsd ON fsd.field_id = shr.field_id
      WHERE shr.field_id IN (
        SELECT f.id FROM fields f
        JOIN farm_registers fr ON f.farm_register_id = fr.id
        WHERE fr.farmer_id = ${farmerId}
      )
      AND shr.is_active = 1
      ORDER BY shr.test_date DESC
      LIMIT 1
    `);

    if (!records || records.length === 0) {
      return { hasData: false, message: 'No soil health card found. Upload or enter your soil test results.' };
    }

    const r = records[0];
    const data = {
      ph: parseFloat(r.ph_value || 0),
      organicCarbon: parseFloat(r.organic_carbon_percent || 0),
      nitrogen: parseInt(r.nitrogen_kg_per_hectare || 0),
      phosphorus: parseInt(r.phosphorus_kg_per_hectare || 0),
      potassium: parseInt(r.potassium_kg_per_hectare || 0),
      sulphur: parseInt(r.sulphur_ppm || 0),
      boron: parseInt(r.boron_ppm || 0),
      iron: parseInt(r.iron_ppm || 0),
    };

    const healthScore = calculateSoilHealthScore(data);
    const advisories = generateSoilAdvisories(data, healthScore);

    return {
      hasData: true,
      testDate: r.test_date,
      labName: r.test_lab_name,
      healthScore,
      classification: healthScore >= 70 ? 'healthy' : healthScore >= 40 ? 'moderate' : 'poor',
      parameters: Object.entries(SOIL_NORMS).map(([key, norm]) => {
        const val = key === 'ph' ? data.ph : key === 'organic_carbon' ? data.organicCarbon : data[key];
        const cls = classifySoilParam(key, val);
        return { parameter: norm.label || key, value: val, unit: norm.unit, status: cls.status, color: cls.color };
      }).filter(p => p.value != null && p.value > 0),
      advisories,
    };
  } catch (e) {
    logger.warn('Soil health summary error:', e.message);
    return { hasData: false, message: 'Unable to load soil health data.' };
  }
};

/**
 * Submit feedback on an advisory.
 */
const submitFeedback = async (farmerId, data) => {
  const { SageFeedback } = getDb();

  const feedback = await SageFeedback.create({
    feedback_uuid: uuidv4(),
    advisory_id: data.advisoryId || null,
    farmer_id: farmerId,
    feedback_rating: data.rating,
    feedback_text: data.text || null,
    feedback_date: new Date(),
    was_advice_helpful: data.wasHelpful || null,
    did_action_succeed: data.didActionSucceed || null,
    is_active: true,
  });

  return { feedbackId: feedback.id };
};

/**
 * Phase 1 — ₹-framed advisory feed for the SAGE screen.
 *
 * Joins:
 *   - SageAdvisory.advisory_metadata (the structured Phase 1 mock payload)
 *   - FarmerSoilHealthCard           (so the UI can show "based on your SHC")
 *   - LoanRepaymentSchedule          (next pending EMI for the farmer's
 *                                     loans, used as the ₹ anchor)
 *
 * The seeded mocks already carry rupeeImpact + linkedEmiDueDate. This loader
 * also surfaces the farmer's *actual* next EMI so the screen can render a
 * generic "Next EMI ₹X due Y" header even when no advisories exist yet.
 */
const getAdvisoriesForFarmer = async (farmerId, filters = {}) => {
  const {
    SageAdvisory,
    SageAdvisoryType,
    FarmerSoilHealthCard,
    LoanApplication,
    LoanRepaymentSchedule,
    GoogleFieldObservation,
    sequelize: seq,
  } = getDb();

  const { Op } = require('sequelize');
  const where = { farmer_id: farmerId, is_active: true };
  // Bumped from 20 → 50 in Phase 2A so that newer-created cycles' MEDIUM
  // advisories don't get truncated below the older CRITICAL ones.
  const limit = parseInt(filters.limit, 10) || 50;
  const offset = parseInt(filters.offset, 10) || 0;

  // Persona phase — optional cycleId filter so the new cycle-detail screen
  // can show only the advisories the engine emitted for THIS cycle. The
  // engine stores cycleId inside advisory_metadata JSON. We use a raw
  // JSON_EXTRACT literal (MySQL-compatible); engine rows without metadata
  // naturally drop out.
  if (filters.cycleId) {
    const cid = parseInt(filters.cycleId, 10);
    if (!Number.isNaN(cid)) {
      where[Op.and] = [
        seq.literal(`JSON_EXTRACT(advisory_metadata, '$.cycleId') = ${cid}`),
      ];
    }
  }

  const [{ count, rows }, shc, nextEmi] = await Promise.all([
    SageAdvisory.findAndCountAll({
      where,
      include: [{
        model: SageAdvisoryType,
        as: 'advisoryType',
        attributes: ['advisory_type_code', 'advisory_type_name'],
      }],
      order: [
        [seq.literal("FIELD(advisory_urgency, 'critical','high','medium','low')"), 'ASC'],
        ['created_at', 'DESC'],
      ],
      limit,
      offset,
    }).catch(async () => {
      // Fallback ordering for non-MySQL dialects.
      return SageAdvisory.findAndCountAll({
        where,
        include: [{
          model: SageAdvisoryType,
          as: 'advisoryType',
          attributes: ['advisory_type_code', 'advisory_type_name'],
        }],
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });
    }),
    FarmerSoilHealthCard.findOne({ where: { farmer_id: farmerId } }).catch(() => null),
    LoanRepaymentSchedule
      ? LoanRepaymentSchedule.findOne({
          where: { status: 'pending' },
          include: [{
            model: LoanApplication,
            as: 'application',
            required: true,
            where: { farmer_id: farmerId },
            attributes: ['id', 'farmer_id'],
          }],
          order: [['due_date', 'ASC']],
        }).catch(() => null)
      : null,
  ]);

  const advisories = rows.map((a) => {
    const meta = a.advisory_metadata || {};
    return {
      advisoryId: a.id,
      advisoryType: a.advisoryType ? a.advisoryType.advisory_type_name : null,
      advisoryClass: meta.advisoryClass || null,
      title: meta.title || null,
      body: meta.body || a.advisory_content,
      icon: meta.icon || null,
      rupeeImpact: meta.rupeeImpact || null,
      linkedEmiDueDate: meta.linkedEmiDueDate || null,
      linkedLoanApplicationId: meta.linkedLoanApplicationId || null,
      ctaLabel: meta.ctaLabel || null,
      ctaUrl: meta.ctaUrl || null,
      urgency: a.advisory_urgency,
      source: a.source,
      acknowledged: !!a.acknowledged_at,
      createdAt: a.created_at,
      // Phase 2A: stage-aware advisory metadata for the SAGE feed sub-line
      varietyName: meta.varietyName || null,
      stageName: meta.stageName || null,
      parameterCode: meta.parameterCode || null,
      pestCode: meta.pestCode || null,
      observedValue: meta.observedValue != null ? meta.observedValue : null,
    };
  });

  // Phase 2A.1 — surface the latest satellite confirmation if any
  let googleConfirmation = null;
  if (GoogleFieldObservation) {
    const obs = await GoogleFieldObservation.findOne({
      where: { farmer_id: farmerId, is_active: true },
      order: [['last_observed_at', 'DESC']],
    }).catch(() => null);
    if (obs) {
      const sowing = obs.sowing_date ? new Date(obs.sowing_date) : null;
      const daysSince = sowing ? Math.floor((Date.now() - sowing.getTime()) / (24 * 60 * 60 * 1000)) : null;
      googleConfirmation = {
        detectedCropCode: obs.detected_crop_code,
        sowingDate: obs.sowing_date,
        harvestDate: obs.harvest_date,
        daysSinceSowing: daysSince,
        confidence: obs.confidence != null ? Number(obs.confidence) : null,
        latestNdvi: obs.latest_ndvi != null ? Number(obs.latest_ndvi) : null,
        areaHectares: obs.area_hectares != null ? Number(obs.area_hectares) : null,
        source: obs.source,
        observedAt: obs.last_observed_at,
      };
    }
  }

  return {
    advisories,
    total: count,
    shcStatus: shc ? 'captured' : null,
    nextEmi: nextEmi ? {
      dueDate: nextEmi.due_date,
      dueAmount: Number(nextEmi.due_amount),
      applicationId: nextEmi.application_id,
    } : null,
    googleConfirmation,
  };
};

module.exports = {
  getAdvisories,
  getAdvisoriesForFarmer,
  acknowledgeAdvisory,
  getAlerts,
  createCropObservation,
  saveSoilHealthCard,
  getSoilHealthSummary,
  submitFeedback,
  SOIL_NORMS,
};
