/**
 * AA Validators — Joi schemas for Account Aggregator endpoints.
 */
const Joi = require('joi');

const initiateConsentSchema = Joi.object({
  provider: Joi.string().valid('setu', 'finvu', 'onemoney').optional()
    .messages({ 'any.only': 'Provider must be one of: setu, finvu, onemoney' }),
  purposeText: Joi.string().trim().max(500).optional(),
  monthsBack: Joi.number().integer().min(6).max(24).optional()
    .messages({ 'number.min': 'Minimum data window is 6 months', 'number.max': 'Maximum data window is 24 months' }),
});

const webhookSchema = Joi.object({
  type: Joi.string().optional(),
  event: Joi.string().optional(),
  consentHandle: Joi.string().optional(),
  consentId: Joi.string().optional(),
  sessionId: Joi.string().optional(),
  status: Joi.string().optional(),
  data: Joi.object().optional(),
  timestamp: Joi.string().optional(),
}).unknown(true); // Allow extra fields from AA providers

const consentUuidParam = Joi.object({
  consentUuid: Joi.string().uuid().required()
    .messages({ 'string.guid': 'Invalid consent UUID format' }),
});

const moduleQuerySchema = Joi.object({
  module: Joi.string().valid('trust', 'drishti', 'sentinel', 'dice', 'sathi').required()
    .messages({ 'any.only': 'Module must be one of: trust, drishti, sentinel, dice, sathi' }),
});

const refreshAnalysisSchema = Joi.object({
  force: Joi.boolean().default(false),
});

const transactionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  category: Joi.string().trim().max(30).optional(),
  type: Joi.string().valid('credit', 'debit').optional()
    .messages({ 'any.only': 'Type must be credit or debit' }),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional(),
});

const bulkAnalysisSchema = Joi.object({
  farmerIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required()
    .messages({
      'array.min': 'At least one farmer ID required',
      'array.max': 'Maximum 100 farmer IDs per batch',
    }),
});

const farmerIdParam = Joi.object({
  farmerId: Joi.number().integer().positive().required()
    .messages({ 'number.base': 'farmerId must be a valid integer' }),
});

module.exports = {
  initiateConsentSchema,
  webhookSchema,
  consentUuidParam,
  moduleQuerySchema,
  refreshAnalysisSchema,
  transactionsQuerySchema,
  bulkAnalysisSchema,
  farmerIdParam,
};
