/**
 * Choice Validators
 * Joi schemas for intermediary registration, assignment, field visits, and listing.
 */

const Joi = require('joi');

const INTERMEDIARY_TYPES = ['bc', 'fpo_agent', 'agri_entrepreneur', 'bank_mitra'];
const VISIT_TYPES = ['onboarding', 'monitoring', 'collection', 'advisory', 'verification'];

const registerIntermediarySchema = Joi.object({
  name: Joi.string().max(100).required(),
  mobile: Joi.string().pattern(/^\+?[0-9]{10,13}$/).required(),
  type: Joi.string().valid(...INTERMEDIARY_TYPES).required(),
  districtId: Joi.number().integer().optional(),
  stateId: Joi.number().integer().optional(),
  skills: Joi.array().items(Joi.string()).optional(),
});

const assignFarmerSchema = Joi.object({
  intermediaryId: Joi.number().integer().required(),
  farmerId: Joi.number().integer().required(),
});

const logFieldVisitSchema = Joi.object({
  farmerId: Joi.number().integer().required(),
  visitType: Joi.string().valid(...VISIT_TYPES).required(),
  notes: Joi.string().optional().allow('', null),
  gpsLatitude: Joi.number().min(-90).max(90).optional(),
  gpsLongitude: Joi.number().min(-180).max(180).optional(),
  photoCount: Joi.number().integer().min(0).optional(),
  visitDuration: Joi.number().integer().min(0).optional(),
});

const listIntermediariesSchema = Joi.object({
  type: Joi.string().valid(...INTERMEDIARY_TYPES).optional(),
  districtId: Joi.number().integer().optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

module.exports = {
  registerIntermediarySchema,
  assignFarmerSchema,
  logFieldVisitSchema,
  listIntermediariesSchema,
};
