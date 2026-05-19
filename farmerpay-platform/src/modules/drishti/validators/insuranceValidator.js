/**
 * Insurance Decision Engine Validator
 * Joi schemas for the Insurance engine.
 */

const Joi = require('joi');

const runInsuranceSchema = Joi.object({
  farmer_id: Joi.number().integer().positive().required(),

  insurance_type: Joi.string().valid('pmfby', 'livestock', 'aquaculture', 'weather_index').required(),
  sum_insured: Joi.number().positive().precision(2).required(),
  premium_amount: Joi.number().positive().precision(2).allow(null),

  activity: Joi.object({
    type: Joi.string().valid('crop', 'dairy', 'fishery', 'horticulture').required(),
    crop_id: Joi.string().max(36).allow(null),
    acreage_hectares: Joi.number().positive().precision(4).allow(null),
    season: Joi.string().valid('kharif', 'rabi', 'summer', 'annual').allow(null),
    animal_count: Joi.number().integer().positive().allow(null),
    pond_area_hectares: Joi.number().positive().precision(4).allow(null),
  }).required(),

  stress_scenarios: Joi.array().items(
    Joi.object({
      label: Joi.string().max(50).required(),
      rainfall_deviation_pct: Joi.number().min(-80).max(80).default(0),
      yield_factor: Joi.number().min(0).max(2.0).default(1.0),
    })
  ).min(1).max(5).allow(null),

  computation_mode: Joi.string().valid('deterministic', 'monte_carlo').default('deterministic'),
  monte_carlo_runs: Joi.number().integer().min(100).max(5000).default(1000),
});

module.exports = { runInsuranceSchema };
