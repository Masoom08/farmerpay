/**
 * Soil Health Card OCR Service
 *
 * Parses OCR text from soil health cards, validates and classifies
 * extracted parameters, and persists structured records for the
 * Variance Engine's soil-based input adjustments.
 */

const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

/* ──────────────────── OCR Regex Patterns ──────────────────── */

// Patterns match common label formats on Indian Soil Health Cards
// e.g., "Nitrogen (N) : 245 kg/ha", "OC : 0.52 %", "pH : 7.2"
const PATTERNS = {
  nitrogen: /(?:nitrogen(?:\s*\(N\))?|\bN\b)\s*[:\-=]\s*([\d.]+)\s*(?:kg\s*\/?\s*ha)?/i,
  phosphorus: /(?:phosphorus(?:\s*\(P\))?|phosph(?:orous)?|P2O5|\bP\b)\s*[:\-=]\s*([\d.]+)\s*(?:kg\s*\/?\s*ha)?/i,
  potassium: /(?:potassium(?:\s*\(K\))?|potash|K2O|\bK\b)\s*[:\-=]\s*([\d.]+)\s*(?:kg\s*\/?\s*ha)?/i,
  ph: /(?:pH|p\.H)\s*[:\-=]\s*([\d.]+)/i,
  ec: /(?:EC|E\.?C\.?|electrical\s*conductivity)\s*[:\-=]\s*([\d.]+)\s*(?:dS\s*\/?\s*m)?/i,
  oc: /(?:OC|O\.?C\.?|organic\s*carbon)\s*[:\-=]\s*([\d.]+)\s*%?/i,
  sulphur: /(?:sulphur(?:\s*\(S\))?|sulfur|\bS\b)\s*[:\-=]\s*([\d.]+)\s*(?:ppm)?/i,
  zinc: /(?:zinc(?:\s*\(Zn\))?|Zn)\s*[:\-=]\s*([\d.]+)\s*(?:ppm)?/i,
  iron: /(?:iron(?:\s*\(Fe\))?|Fe)\s*[:\-=]\s*([\d.]+)\s*(?:ppm)?/i,
  manganese: /(?:manganese(?:\s*\(Mn\))?|Mn)\s*[:\-=]\s*([\d.]+)\s*(?:ppm)?/i,
  copper: /(?:copper(?:\s*\(Cu\))?|Cu)\s*[:\-=]\s*([\d.]+)\s*(?:ppm)?/i,
  boron: /(?:boron(?:\s*\(B\))?|\bB\b)\s*[:\-=]\s*([\d.]+)\s*(?:ppm)?/i,
  soilType: /(?:soil\s*type|texture)\s*[:\-=]\s*([A-Za-z\s]+?)(?:\n|,|$)/i,
  cardId: /(?:sample\s*(?:no|number|id)|card\s*(?:no|number|id)|SHC\s*(?:no|number))\s*[:\-=]\s*([\w\-/]+)/i,
  testDate: /(?:date\s*of\s*(?:testing|test|analysis|collection)|test\s*date)\s*[:\-=]\s*([\d/\-.]+)/i,
};

/* ──────────────────── Range Definitions ──────────────────── */

const PLAUSIBLE_RANGES = {
  nitrogen: { min: 50, max: 600 },
  phosphorus: { min: 1, max: 100 },
  potassium: { min: 50, max: 800 },
  ph: { min: 3.5, max: 10.5 },
  ec: { min: 0.01, max: 10.0 },
  oc: { min: 0.05, max: 5.0 },
  sulphur: { min: 0, max: 200 },
  zinc: { min: 0, max: 50 },
  iron: { min: 0, max: 200 },
  manganese: { min: 0, max: 100 },
  copper: { min: 0, max: 50 },
  boron: { min: 0, max: 20 },
};

const CLASSIFICATION_THRESHOLDS = {
  nitrogen: { low: 250, high: 500, unit: 'kg/ha' },
  phosphorus: { low: 11, high: 25, unit: 'kg/ha' },
  potassium: { low: 110, high: 280, unit: 'kg/ha' },
  ph: { acidic: 6.5, alkaline: 7.5, unit: '' },
  oc: { low: 0.5, high: 0.75, unit: '%' },
};

/* ====================================================================
 * 1. processOcrResult
 * ==================================================================== */

const processOcrResult = (farmerId, fieldId, ocrText, imageUrl) => {
  if (!ocrText || typeof ocrText !== 'string') {
    return { extractedValues: {}, confidenceScores: {} };
  }

  const extractedValues = {};
  const confidenceScores = {};

  // Extract numeric parameters
  for (const [key, regex] of Object.entries(PATTERNS)) {
    const match = ocrText.match(regex);
    if (match && match[1]) {
      const raw = match[1].trim();
      if (key === 'soilType') {
        extractedValues[key] = raw;
        confidenceScores[key] = 0.7;
      } else if (key === 'cardId') {
        extractedValues[key] = raw;
        confidenceScores[key] = 0.8;
      } else if (key === 'testDate') {
        extractedValues[key] = parseTestDate(raw);
        confidenceScores[key] = extractedValues[key] ? 0.75 : 0;
      } else {
        const num = parseFloat(raw);
        if (!isNaN(num) && num >= 0) {
          extractedValues[key] = num;
          // Confidence based on whether value is in plausible range
          const range = PLAUSIBLE_RANGES[key];
          if (range && num >= range.min && num <= range.max) {
            confidenceScores[key] = 0.9;
          } else if (range) {
            confidenceScores[key] = 0.4; // out of range but parseable
          } else {
            confidenceScores[key] = 0.7;
          }
        }
      }
    }
  }

  logger.info(`OCR processed for farmer ${farmerId}, field ${fieldId}: ${Object.keys(extractedValues).length} values extracted`);
  return { extractedValues, confidenceScores };
};

const parseTestDate = (raw) => {
  if (!raw) return null;
  // Try DD/MM/YYYY, DD-MM-YYYY
  const ddmmyyyy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    if (parseInt(mm, 10) >= 1 && parseInt(mm, 10) <= 12 && parseInt(dd, 10) >= 1 && parseInt(dd, 10) <= 31) {
      return `${y}-${mm}-${dd}`;
    }
  }
  // Try YYYY-MM-DD
  const iso = raw.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  return null;
};

/* ====================================================================
 * 2. validateExtractedValues
 * ==================================================================== */

const validateExtractedValues = (extractedValues) => {
  const errors = [];
  const warnings = [];

  if (!extractedValues || typeof extractedValues !== 'object') {
    return { isValid: false, errors: [{ field: 'extractedValues', message: 'No values provided' }], warnings: [] };
  }

  // Range checks
  for (const [key, range] of Object.entries(PLAUSIBLE_RANGES)) {
    const val = extractedValues[key];
    if (val === undefined || val === null) continue;

    if (typeof val !== 'number' || isNaN(val)) {
      errors.push({ field: key, message: `${key} must be a number, got ${val}` });
      continue;
    }
    if (val < range.min || val > range.max) {
      errors.push({ field: key, message: `${key} value ${val} outside plausible range ${range.min}-${range.max}` });
    }
  }

  // Cross-field consistency checks
  const { ph, oc, nitrogen } = extractedValues;

  // Acidic soil with very high calcium (unlikely)
  if (ph !== undefined && ph < 4.5 && extractedValues.potassium > 600) {
    warnings.push({ fields: ['ph', 'potassium'], message: 'Very acidic pH with very high potassium is unusual — please verify' });
  }

  // Very low OC but very high N (unlikely in natural conditions)
  if (oc !== undefined && oc < 0.2 && nitrogen > 450) {
    warnings.push({ fields: ['oc', 'nitrogen'], message: 'Very low organic carbon with very high nitrogen is unusual' });
  }

  // High EC with neutral/alkaline pH is expected, but high EC with very acidic pH is unusual
  if (extractedValues.ec > 4 && ph !== undefined && ph < 5) {
    warnings.push({ fields: ['ec', 'ph'], message: 'High EC with very acidic pH is unusual — may indicate measurement error' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/* ====================================================================
 * 3. classifyParameters
 * ==================================================================== */

const classifyParameters = (extractedValues) => {
  if (!extractedValues) return { classifications: {} };

  const classifications = {};

  // Nitrogen
  if (extractedValues.nitrogen !== undefined) {
    const n = extractedValues.nitrogen;
    const t = CLASSIFICATION_THRESHOLDS.nitrogen;
    classifications.n_status = n < t.low ? 'LOW' : n > t.high ? 'HIGH' : 'MEDIUM';
    classifications.n_value = n;
  }

  // Phosphorus
  if (extractedValues.phosphorus !== undefined) {
    const p = extractedValues.phosphorus;
    const t = CLASSIFICATION_THRESHOLDS.phosphorus;
    classifications.p_status = p < t.low ? 'LOW' : p > t.high ? 'HIGH' : 'MEDIUM';
    classifications.p_value = p;
  }

  // Potassium
  if (extractedValues.potassium !== undefined) {
    const k = extractedValues.potassium;
    const t = CLASSIFICATION_THRESHOLDS.potassium;
    classifications.k_status = k < t.low ? 'LOW' : k > t.high ? 'HIGH' : 'MEDIUM';
    classifications.k_value = k;
  }

  // pH
  if (extractedValues.ph !== undefined) {
    const p = extractedValues.ph;
    const t = CLASSIFICATION_THRESHOLDS.ph;
    classifications.ph_status = p < t.acidic ? 'ACIDIC' : p > t.alkaline ? 'ALKALINE' : 'NEUTRAL';
    classifications.ph_value = p;
  }

  // Organic Carbon
  if (extractedValues.oc !== undefined) {
    const o = extractedValues.oc;
    const t = CLASSIFICATION_THRESHOLDS.oc;
    classifications.oc_status = o < t.low ? 'LOW' : o > t.high ? 'HIGH' : 'MEDIUM';
    classifications.oc_value = o;
  }

  return { classifications };
};

/* ====================================================================
 * 4. saveSoilHealthRecord
 * ==================================================================== */

const saveSoilHealthRecord = async (farmerId, fieldId, extractedValues, classifications, imageUrl, confidenceScores) => {
  const { SoilHealthRecord, Field, FarmRegister, sequelize } = getDb();

  // Verify field belongs to farmer
  const field = await Field.findOne({
    where: { id: fieldId, is_active: true },
    include: [{
      model: FarmRegister, as: 'farmRegister',
      where: { farmer_id: farmerId },
      required: true,
    }],
  });
  if (!field) {
    const err = new Error('Field not found or not owned by farmer');
    err.statusCode = 404; err.errorCode = 'FIELD_NOT_FOUND';
    throw err;
  }

  const testDate = extractedValues.testDate || new Date().toISOString().slice(0, 10);
  const validUntil = computeValidUntil(testDate);

  const data = {
    field_id: fieldId,
    test_date: testDate,
    organic_carbon_percent: extractedValues.oc ?? null,
    nitrogen_kg_per_hectare: extractedValues.nitrogen ? Math.round(extractedValues.nitrogen) : null,
    phosphorus_kg_per_hectare: extractedValues.phosphorus ? Math.round(extractedValues.phosphorus) : null,
    potassium_kg_per_hectare: extractedValues.potassium ? Math.round(extractedValues.potassium) : null,
    sulphur_ppm: extractedValues.sulphur ? Math.round(extractedValues.sulphur) : null,
    boron_ppm: extractedValues.boron ? Math.round(extractedValues.boron) : null,
    iron_ppm: extractedValues.iron ? Math.round(extractedValues.iron) : null,
    ph: extractedValues.ph ?? null,
    ec_ds_per_m: extractedValues.ec ?? null,
    zinc_ppm: extractedValues.zinc ?? null,
    manganese_ppm: extractedValues.manganese ?? null,
    copper_ppm: extractedValues.copper ?? null,
    card_id: extractedValues.cardId || null,
    valid_until: validUntil,
    image_url: imageUrl || null,
    confidence_scores: confidenceScores || null,
    source: imageUrl ? 'photo_ocr' : 'manual_entry',
    soil_type: extractedValues.soilType || null,
    test_lab_name: extractedValues.testLabName || null,
    is_active: true,
  };

  // Upsert: deactivate previous record for this field, create new one
  const t = await sequelize.transaction();
  try {
    await SoilHealthRecord.update(
      { is_active: false },
      { where: { field_id: fieldId, is_active: true }, transaction: t }
    );

    const record = await SoilHealthRecord.create(data, { transaction: t });
    await t.commit();

    logger.info(`Soil health record saved: ${record.id} for field ${fieldId}`);
    return mapToDto(record, classifications);
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const computeValidUntil = (testDate) => {
  if (!testDate) return null;
  const d = new Date(testDate);
  d.setFullYear(d.getFullYear() + 3);
  return d.toISOString().slice(0, 10);
};

const mapToDto = (record, classifications) => ({
  recordId: record.id,
  fieldId: record.field_id,
  testDate: record.test_date,
  validUntil: record.valid_until,
  cardId: record.card_id,
  imageUrl: record.image_url,
  source: record.source,
  soilType: record.soil_type,
  nitrogen: record.nitrogen_kg_per_hectare,
  phosphorus: record.phosphorus_kg_per_hectare,
  potassium: record.potassium_kg_per_hectare,
  ph: record.ph ? parseFloat(record.ph) : null,
  ec: record.ec_ds_per_m ? parseFloat(record.ec_ds_per_m) : null,
  organicCarbon: record.organic_carbon_percent ? parseFloat(record.organic_carbon_percent) : null,
  sulphur: record.sulphur_ppm,
  zinc: record.zinc_ppm ? parseFloat(record.zinc_ppm) : null,
  iron: record.iron_ppm,
  manganese: record.manganese_ppm ? parseFloat(record.manganese_ppm) : null,
  copper: record.copper_ppm ? parseFloat(record.copper_ppm) : null,
  boron: record.boron_ppm,
  testLabName: record.test_lab_name,
  confidenceScores: record.confidence_scores,
  classifications: classifications?.classifications || null,
  createdAt: record.created_at,
});

/* ====================================================================
 * 5. getSoilAdjustedRecommendations
 * ==================================================================== */

const getSoilAdjustedRecommendations = async (fieldId, popTaskInputs) => {
  const { SoilHealthRecord } = getDb();

  const soilRecord = await SoilHealthRecord.findOne({
    where: { field_id: fieldId, is_active: true },
    order: [['test_date', 'DESC']],
  });

  if (!soilRecord) {
    return { adjusted: false, adjustments: [], adjustedInputs: popTaskInputs || [] };
  }

  const { applySoilAdjustment } = require('./varianceService');
  const adjustedInputs = applySoilAdjustment(popTaskInputs || [], soilRecord);

  const adjustments = adjustedInputs
    .filter((inp) => inp._soil_adjusted)
    .map((inp) => ({
      inputItemId: inp.input_item_id,
      inputName: inp.inputItem?.item_name || inp.input_item_id,
      originalQty: parseFloat(popTaskInputs.find((p) => p.input_item_id === inp.input_item_id)?.input_quantity || 0),
      adjustedQty: inp.input_quantity,
      multiplier: inp._soil_multiplier,
    }));

  return { adjusted: adjustments.length > 0, adjustments, adjustedInputs };
};

/* ====================================================================
 * 6. getSoilHealthForField
 * ==================================================================== */

const getSoilHealthForField = async (farmerId, fieldId) => {
  const { SoilHealthRecord, Field, FarmRegister } = getDb();

  const field = await Field.findOne({
    where: { id: fieldId, is_active: true },
    include: [{ model: FarmRegister, as: 'farmRegister', where: { farmer_id: farmerId }, required: true }],
  });
  if (!field) {
    const err = new Error('Field not found'); err.statusCode = 404; throw err;
  }

  const record = await SoilHealthRecord.findOne({
    where: { field_id: fieldId, is_active: true },
    order: [['test_date', 'DESC']],
  });

  if (!record) return null;

  const { classifications } = classifyParameters({
    nitrogen: record.nitrogen_kg_per_hectare,
    phosphorus: record.phosphorus_kg_per_hectare,
    potassium: record.potassium_kg_per_hectare,
    ph: record.ph ? parseFloat(record.ph) : undefined,
    oc: record.organic_carbon_percent ? parseFloat(record.organic_carbon_percent) : undefined,
  });

  return mapToDto(record, { classifications });
};

/* ====================================================================
 * 7. verifyAndUpdate
 * ==================================================================== */

const verifyAndUpdate = async (farmerId, recordId, corrections) => {
  const { SoilHealthRecord } = getDb();

  const record = await SoilHealthRecord.findByPk(recordId);
  if (!record || !record.is_active) {
    const err = new Error('Record not found'); err.statusCode = 404; throw err;
  }

  const updates = {};
  if (corrections.nitrogen !== undefined) updates.nitrogen_kg_per_hectare = corrections.nitrogen;
  if (corrections.phosphorus !== undefined) updates.phosphorus_kg_per_hectare = corrections.phosphorus;
  if (corrections.potassium !== undefined) updates.potassium_kg_per_hectare = corrections.potassium;
  if (corrections.ph !== undefined) updates.ph = corrections.ph;
  if (corrections.ec !== undefined) updates.ec_ds_per_m = corrections.ec;
  if (corrections.oc !== undefined) updates.organic_carbon_percent = corrections.oc;
  if (corrections.sulphur !== undefined) updates.sulphur_ppm = corrections.sulphur;
  if (corrections.zinc !== undefined) updates.zinc_ppm = corrections.zinc;
  if (corrections.iron !== undefined) updates.iron_ppm = corrections.iron;
  if (corrections.manganese !== undefined) updates.manganese_ppm = corrections.manganese;
  if (corrections.copper !== undefined) updates.copper_ppm = corrections.copper;
  if (corrections.boron !== undefined) updates.boron_ppm = corrections.boron;

  if (record.source === 'photo_ocr') updates.source = 'photo_plus_manual';

  await record.update(updates);

  const { classifications } = classifyParameters({
    nitrogen: record.nitrogen_kg_per_hectare,
    phosphorus: record.phosphorus_kg_per_hectare,
    potassium: record.potassium_kg_per_hectare,
    ph: record.ph ? parseFloat(record.ph) : undefined,
    oc: record.organic_carbon_percent ? parseFloat(record.organic_carbon_percent) : undefined,
  });

  logger.info(`Soil health record ${recordId} verified/updated by farmer ${farmerId}`);
  return mapToDto(record, { classifications });
};

module.exports = {
  processOcrResult,
  validateExtractedValues,
  classifyParameters,
  saveSoilHealthRecord,
  getSoilAdjustedRecommendations,
  getSoilHealthForField,
  verifyAndUpdate,
};
