/**
 * Crop Validators — Joi schemas for ROOTS crop knowledge base endpoints.
 */
const Joi = require('joi');

const cropSearchSchema = Joi.object({
  category: Joi.string().trim().max(50),
  season: Joi.string().valid('kharif', 'rabi', 'summer', 'year_round', 'multiple'),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

const popSearchSchema = Joi.object({
  cropId: Joi.string().trim().max(36),
  varietyId: Joi.string().trim().max(36),
  soilTypeId: Joi.number().integer().positive(),
  stateId: Joi.number().integer().positive(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

const inputSearchSchema = Joi.object({
  category: Joi.string().trim().max(50),
  search: Joi.string().trim().max(100),
  isOrganic: Joi.boolean(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

module.exports = { cropSearchSchema, popSearchSchema, inputSearchSchema };
