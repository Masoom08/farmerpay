/**
 * Banker Portfolio Simulation Validator
 * Joi schemas for the Banker Portfolio engine (async via RabbitMQ).
 */

const Joi = require('joi');

const runBankerPortfolioSchema = Joi.object({
  scope: Joi.object({
    district_id: Joi.number().integer().positive().allow(null),
    block_id: Joi.number().integer().positive().allow(null),
    loan_product_id: Joi.number().integer().positive().allow(null),
    farmer_ids: Joi.array().items(Joi.number().integer().positive()).max(1000).allow(null),
  }).required()
    .custom((value, helpers) => {
      if (!value.district_id && !value.loan_product_id && !value.farmer_ids) {
        return helpers.error('any.custom', { message: 'At least one of district_id, loan_product_id, or farmer_ids is required' });
      }
      return value;
    }),

  shock_variables: Joi.object({
    rainfall_deviation_pct: Joi.number().min(-80).max(80).default(0),
    price_change_pct: Joi.number().min(-50).max(50).default(0),
    temperature_deviation_celsius: Joi.number().min(-5).max(10).default(0),
  }).required(),

  computation_mode: Joi.string().valid('deterministic', 'monte_carlo').default('monte_carlo'),
  monte_carlo_runs: Joi.number().integer().min(100).max(5000).default(500),
});

module.exports = { runBankerPortfolioSchema };
