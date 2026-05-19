/**
 * Soil Health Card Controller — HTTP handlers for OCR endpoints.
 */

const soilHealthCardService = require('../services/soilHealthCardService');
const { success } = require('../../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../../shared/constants/statusCodes');
const { User } = require('../../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

/**
 * POST /api/v1/roots/soil-health
 * Process OCR text, validate, classify, and save.
 */
const uploadSoilHealth = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const { fieldId, ocrText, imageUrl } = req.body;

    // 1. Process OCR
    const { extractedValues, confidenceScores } = soilHealthCardService.processOcrResult(
      farmerId, fieldId, ocrText, imageUrl
    );

    // 2. Validate
    const validation = soilHealthCardService.validateExtractedValues(extractedValues);

    // 3. Classify
    const { classifications } = soilHealthCardService.classifyParameters(extractedValues);

    // 4. Save (even if validation has warnings — farmer can correct later)
    let record = null;
    if (validation.isValid || validation.errors.length === 0) {
      record = await soilHealthCardService.saveSoilHealthRecord(
        farmerId, fieldId, extractedValues, { classifications }, imageUrl, confidenceScores
      );
    }

    return success(res, {
      message: 'Soil health card processed',
      data: {
        extractedValues,
        confidenceScores,
        classifications,
        validation,
        record,
      },
      statusCode: STATUS_CODES.CREATED,
    });
  } catch (e) { next(e); }
};

/**
 * GET /api/v1/roots/fields/:fieldId/soil-health
 */
const getFieldSoilHealth = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const fieldId = parseInt(req.params.fieldId, 10);

    const record = await soilHealthCardService.getSoilHealthForField(farmerId, fieldId);

    return success(res, {
      message: record ? 'Soil health record found' : 'No soil health record for this field',
      data: record,
    });
  } catch (e) { next(e); }
};

/**
 * PUT /api/v1/roots/soil-health/:recordId/verify
 */
const verifySoilHealth = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const recordId = parseInt(req.params.recordId, 10);

    const record = await soilHealthCardService.verifyAndUpdate(
      farmerId, recordId, req.body.corrections
    );

    return success(res, {
      message: 'Soil health record updated',
      data: record,
    });
  } catch (e) { next(e); }
};

module.exports = { uploadSoilHealth, getFieldSoilHealth, verifySoilHealth };
