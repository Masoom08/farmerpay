/**
 * Pre-Loan Scenario Validator
 * Joi schemas for the Pre-Loan Scenario Modeling engine.
 */

const Joi = require('joi');

const runPreLoanSchema = Joi.object({
  farmer_id: Joi.number().integer().positive().required(),
  loan_product_id: Joi.number().integer().positive().required(),
  loan_amount: Joi.number().positive().precision(2).required(),
  loan_tenure_months: Joi.number().integer().min(1).max(120).required(),
  repayment_type: Joi.string().valid('emi', 'bullet', 'flexible').required(),

  activity: Joi.object({
    type: Joi.string().valid('crop', 'dairy', 'fishery', 'horticulture').required(),
    crop_id: Joi.string().max(36).when('type', { is: 'crop', then: Joi.required(), otherwise: Joi.allow(null) }),
    variety_id: Joi.string().max(36).allow(null),
    acreage_hectares: Joi.number().positive().precision(4).allow(null),
    season: Joi.string().valid('kharif', 'rabi', 'summer', 'annual').allow(null),
    irrigation_type: Joi.string().valid('rainfed', 'irrigated', 'mixed').allow(null),
    animal_count: Joi.number().integer().positive().allow(null),
    pond_area_hectares: Joi.number().positive().precision(4).allow(null),
  }).required(),

  overrides: Joi.object({
    input_cost_factor: Joi.number().min(0.5).max(2.0).default(1.0),
    yield_factor: Joi.number().min(0.3).max(2.0).default(1.0),
    selling_price_override: Joi.number().positive().precision(2).allow(null),
    household_monthly_expense: Joi.number().min(0).precision(2).allow(null),
  }).default({}),

  computation_mode: Joi.string().valid('deterministic', 'monte_carlo').default('deterministic'),
  monte_carlo_runs: Joi.number().integer().min(100).max(5000).default(1000),
  include_insurance_comparison: Joi.boolean().default(false),
});

module.exports = { runPreLoanSchema };
