/**
 * Household & Activity Portfolio Optimizer Validator
 * Joi schemas for the Household Portfolio engine.
 */

const Joi = require('joi');

const cropActivitySchema = Joi.object({
  crop_id: Joi.string().max(36).required(),
  acreage_hectares: Joi.number().positive().precision(4).required(),
  season: Joi.string().valid('kharif', 'rabi', 'summer', 'annual').required(),
  irrigation: Joi.string().valid('rainfed', 'irrigated', 'mixed').default('rainfed'),
});

const dairyActivitySchema = Joi.object({
  animal_count: Joi.number().integer().positive().required(),
  breed: Joi.string().max(50).allow(null),
  avg_daily_milk_liters: Joi.number().positive().precision(1).allow(null),
  feed_quality: Joi.string().valid('basic', 'standard', 'premium').default('standard'),
});

const fisheryActivitySchema = Joi.object({
  pond_area_hectares: Joi.number().positive().precision(4).required(),
  species: Joi.string().max(50).allow(null),
  stocking_density: Joi.string().valid('low', 'standard', 'high').default('standard'),
  cycle_months: Joi.number().integer().min(3).max(18).default(8),
});

const incomeOverrideSchema = Joi.object({
  source_type: Joi.string().valid('spouse_shg', 'wage_labor', 'mgnrega', 'pension',
    'remittance', 'petty_business', 'govt_transfer', 'rental', 'other').required(),
  amount_monthly: Joi.number().min(0).precision(2).allow(null),
  amount_annual: Joi.number().min(0).precision(2).allow(null),
  active_months: Joi.array().items(Joi.number().integer().min(1).max(12)).allow(null),
  earning_member: Joi.string().valid('farmer', 'spouse', 'son', 'daughter', 'parent', 'family', 'other').allow(null),
  note: Joi.string().max(200).allow(null, ''),
});

const expenseOverrideSchema = Joi.object({
  category: Joi.string().valid('food_groceries', 'education', 'healthcare', 'housing',
    'social_obligations', 'transportation', 'utilities', 'non_farm_loan_emi', 'clothing', 'other').required(),
  amount_monthly: Joi.number().min(0).precision(2).allow(null),
  amount_annual: Joi.number().min(0).precision(2).allow(null),
  note: Joi.string().max(200).allow(null, ''),
});

const runHouseholdPortfolioSchema = Joi.object({
  farmer_id: Joi.number().integer().positive().required(),

  proposed_farm_activities: Joi.object({
    crops: Joi.array().items(cropActivitySchema).allow(null),
    dairy: dairyActivitySchema.allow(null),
    fishery: fisheryActivitySchema.allow(null),
  }).default({}),

  household_income: Joi.object({
    use_saved_profile: Joi.boolean().default(true),
    overrides: Joi.array().items(incomeOverrideSchema).allow(null),
    additional_sources: Joi.array().items(incomeOverrideSchema).allow(null),
  }).default({}),

  household_expenses: Joi.object({
    use_saved_profile: Joi.boolean().default(true),
    overrides: Joi.array().items(expenseOverrideSchema).allow(null),
  }).default({}),

  active_loan_ids: Joi.array().items(Joi.number().integer().positive()).allow(null),
  time_horizon_months: Joi.number().integer().min(3).max(36).default(12),
  include_stress_scenarios: Joi.boolean().default(true),
  computation_mode: Joi.string().valid('deterministic', 'monte_carlo').default('deterministic'),
  monte_carlo_runs: Joi.number().integer().min(100).max(5000).default(1000),
});

module.exports = { runHouseholdPortfolioSchema };
