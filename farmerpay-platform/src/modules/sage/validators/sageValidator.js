/**
 * SAGE Validators
 * Joi schemas for advisory, alert, crop observation, and feedback endpoints.
 */

const Joi = require('joi');

const getAdvisoriesSchema = Joi.object({
  status: Joi.string().valid('delivered', 'pending').allow(null),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const acknowledgeAdvisorySchema = Joi.object({
  advisoryId: Joi.number().integer().positive().required(),
  actionTaken: Joi.boolean().allow(null),
  outcome: Joi.string().trim().max(2000).allow('', null),
});

const getAlertsSchema = Joi.object({
  type: Joi.string().valid('weather', 'pest_disease', 'input_availability', 'market_price', 'loan_due').allow(null),
  urgency: Joi.string().valid('low', 'medium', 'high', 'critical').allow(null),
});

const createCropObservationSchema = Joi.object({
  cycleId: Joi.string().trim().max(36).allow(null),
  observationDate: Joi.date().iso().allow(null),
  healthStatus: Joi.string().valid('excellent', 'good', 'average', 'poor').required(),
  pestObserved: Joi.boolean().allow(null),
  pestName: Joi.string().trim().max(100).allow('', null),
  affectedAreaPercent: Joi.number().precision(2).min(0).max(100).allow(null),
  diseaseObserved: Joi.boolean().allow(null),
  diseaseName: Joi.string().trim().max(100).allow('', null),
});

module.exports = {
  getAdvisoriesSchema,
  acknowledgeAdvisorySchema,
  getAlertsSchema,
  createCropObservationSchema,
};
