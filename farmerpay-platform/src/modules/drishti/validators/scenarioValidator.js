/**
 * Scenario Validator
 * Joi schemas for generic scenario queries, comparisons, and listing.
 */

const Joi = require('joi');

const getScenarioRunsSchema = Joi.object({
  engine_type: Joi.string().valid('pre_loan', 'household_portfolio', 'climate_stress',
    'insurance', 'market_timing', 'banker_portfolio').allow(null),
  status: Joi.string().valid('pending', 'computing', 'completed', 'failed').allow(null),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const compareSchema = Joi.object({
  run_uuids: Joi.array().items(Joi.string().max(36)).min(2).max(3).required(),
  comparison_label: Joi.string().trim().max(150).allow(null, ''),
});

const getTemplatesSchema = Joi.object({
  activity_type: Joi.string().valid('crop', 'dairy', 'fishery', 'horticulture').allow(null),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = { getScenarioRunsSchema, compareSchema, getTemplatesSchema };
