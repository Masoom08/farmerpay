/**
 * Climate Stress Testing Validator
 * Joi schemas for the Climate Stress engine.
 */

const Joi = require('joi');

const runClimateStressSchema = Joi.object({
  farmer_id: Joi.number().integer().positive().required(),

  climate_scenario: Joi.object({
    rainfall_deviation_pct: Joi.number().min(-80).max(80).required(),
    temperature_deviation_celsius: Joi.number().min(-5).max(10).default(0),
    delayed_monsoon_weeks: Joi.number().integer().min(0).max(12).default(0),
  }).required(),

  include_household_impact: Joi.boolean().default(true),
  active_loan_ids: Joi.array().items(Joi.number().integer().positive()).allow(null),
  computation_mode: Joi.string().valid('deterministic', 'monte_carlo').default('deterministic'),
  monte_carlo_runs: Joi.number().integer().min(100).max(5000).default(1000),
});

module.exports = { runClimateStressSchema };
