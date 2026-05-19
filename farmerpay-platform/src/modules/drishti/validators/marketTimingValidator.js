/**
 * Post-Harvest Market Timing Validator
 * Joi schemas for the Market Timing engine.
 */

const Joi = require('joi');

const runMarketTimingSchema = Joi.object({
  farmer_id: Joi.number().integer().positive().required(),

  commodity_id: Joi.string().max(36).required(),
  quantity_quintals: Joi.number().positive().precision(2).required(),
  current_price_per_quintal: Joi.number().positive().precision(2).allow(null),

  storage_options: Joi.object({
    warehousing_cost_per_quintal_month: Joi.number().min(0).precision(2).allow(null),
    storage_duration_months: Joi.array().items(
      Joi.number().integer().min(1).max(12)
    ).default([1, 2, 3]),
    quality_degradation_pct_per_month: Joi.number().min(0).max(10).default(1),
  }).default({}),

  active_loan_id: Joi.number().integer().positive().allow(null),
  include_topup_loan_simulation: Joi.boolean().default(false),
  computation_mode: Joi.string().valid('deterministic', 'monte_carlo').default('deterministic'),
  monte_carlo_runs: Joi.number().integer().min(100).max(5000).default(1000),
});

module.exports = { runMarketTimingSchema };
