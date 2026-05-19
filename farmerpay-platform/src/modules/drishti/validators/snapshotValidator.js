/**
 * Snapshot & Household CRUD Validators
 * Joi schemas for household income/expense endpoints and snapshot queries.
 */

const Joi = require('joi');

// ─── Household Income Source ────────────────────────────────────────

const createIncomeSourceSchema = Joi.object({
  source_type: Joi.string().valid('spouse_shg', 'wage_labor', 'mgnrega', 'pension',
    'remittance', 'petty_business', 'govt_transfer', 'rental', 'other').required(),
  source_label: Joi.string().trim().max(150).allow(null, ''),
  earning_member: Joi.string().valid('farmer', 'spouse', 'son', 'daughter',
    'parent', 'family', 'other').required(),
  earning_member_name: Joi.string().trim().max(100).allow(null, ''),

  amount: Joi.number().positive().precision(2).required(),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly',
    'seasonal', 'annual', 'irregular').required(),
  active_months: Joi.array().items(Joi.number().integer().min(1).max(12)).allow(null),
  reliability: Joi.string().valid('guaranteed', 'regular', 'irregular', 'one_time').default('regular'),

  // SHG-specific fields
  shg_name: Joi.string().trim().max(100).allow(null, ''),
  shg_monthly_saving: Joi.number().min(0).precision(2).allow(null),
  shg_loan_outstanding: Joi.number().min(0).precision(2).allow(null),
  shg_member_since: Joi.date().iso().allow(null),
});

// ─── Household Expense ──────────────────────────────────────────────

const createExpenseSchema = Joi.object({
  category: Joi.string().valid('food_groceries', 'education', 'healthcare', 'housing',
    'social_obligations', 'transportation', 'utilities',
    'non_farm_loan_emi', 'clothing', 'other').required(),
  category_label: Joi.string().trim().max(100).allow(null, ''),

  amount: Joi.number().positive().precision(2).required(),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly',
    'seasonal', 'annual').required(),
  peak_months: Joi.array().items(Joi.number().integer().min(1).max(12)).allow(null),
  peak_amount: Joi.number().min(0).precision(2).allow(null),
  notes: Joi.string().trim().max(500).allow(null, ''),
});

// ─── Household Query ────────────────────────────────────────────────

const getHouseholdQuerySchema = Joi.object({
  is_active: Joi.boolean().default(true),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

module.exports = {
  createIncomeSourceSchema,
  createExpenseSchema,
  getHouseholdQuerySchema,
};
