/**
 * Readiness Validator — Joi schemas for readiness endpoints.
 */

const Joi = require('joi');

const farmerUuidParamSchema = Joi.object({
  farmerUuid: Joi.string().uuid().required()
    .messages({
      'string.guid': 'farmerUuid must be a valid UUID',
      'any.required': 'farmerUuid is required',
    }),
});

const readinessQuerySchema = Joi.object({
  showNumericScores: Joi.boolean().default(false),
});

// ─── Bank Product Config schemas ─────────────────────────────────

const updateThresholdsSchema = Joi.object({
  bankId: Joi.number().integer().positive().required()
    .messages({ 'any.required': 'bankId is required' }),
  productId: Joi.number().integer().positive().allow(null).default(null)
    .messages({}),
  trustCutoff: Joi.number().min(0).max(100).precision(2),
  fhsCutoff: Joi.number().min(0).max(100).precision(2),
  reason: Joi.string().max(500).allow('', null),
}).or('trustCutoff', 'fhsCutoff')
  .messages({ 'object.missing': 'At least one of trustCutoff or fhsCutoff must be provided' });

const getConfigQuerySchema = Joi.object({
  bankId: Joi.number().integer().positive().required(),
  productId: Joi.number().integer().positive().allow(null).default(null),
});

module.exports = {
  farmerUuidParamSchema,
  readinessQuerySchema,
  updateThresholdsSchema,
  getConfigQuerySchema,
};
