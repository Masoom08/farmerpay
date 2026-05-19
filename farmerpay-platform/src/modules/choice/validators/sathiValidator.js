/**
 * Sathi Validators
 * Joi schemas for assist endpoints, commission queries, issue flags, and nudges.
 */

const Joi = require('joi');

const assistLoanSchema = Joi.object({
  farmerId: Joi.number().integer().required(),
  amount: Joi.number().integer().min(1).required(),
  tenureMonths: Joi.number().integer().min(1).max(360).required(),
  purpose: Joi.string().max(500).optional(),
  productId: Joi.number().integer().optional(),
  status: Joi.string().valid('draft', 'submitted').default('draft'),
});

const assistInsuranceSchema = Joi.object({
  farmerId: Joi.number().integer().required(),
  productId: Joi.number().integer().required(),
  notes: Joi.string().max(500).optional(),
});

const assistDataEntrySchema = Joi.object({
  farmerId: Joi.number().integer().required(),
  fields: Joi.object({
    education_level: Joi.string().max(50).optional(),
    marital_status: Joi.string().max(30).optional(),
    preferred_language: Joi.string().max(10).optional(),
  }).min(1).required(),
});

const raiseIssueSchema = Joi.object({
  farmerId: Joi.number().integer().required(),
  loanApplicationId: Joi.number().integer().optional(),
  issueType: Joi.string()
    .valid(
      'loan_delinquent',
      'crop_failure',
      'fraud_suspicion',
      'document_dispute',
      'farmer_unreachable',
      'grievance',
      'other'
    )
    .required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  description: Joi.string().min(5).max(2000).required(),
});

const updateIssueSchema = Joi.object({
  status: Joi.string()
    .valid('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed')
    .required(),
  resolutionNotes: Joi.string().max(2000).optional(),
  bankerId: Joi.number().integer().optional(),
});

const scheduleNudgeSchema = Joi.object({
  farmerId: Joi.number().integer().required(),
  nudgeType: Joi.string()
    .valid('repayment_due', 'policy_renewal', 'kyc_refresh', 'subsidy_claim', 'document_upload', 'custom')
    .required(),
  channel: Joi.string().valid('sms', 'push', 'whatsapp', 'ivr', 'in_app').required(),
  payload: Joi.object().optional(),
  scheduledFor: Joi.date().iso().optional(),
});

const commissionQuerySchema = Joi.object({
  period: Joi.string()
    .pattern(/^\d{4}-\d{2}$/)
    .optional(),
});

module.exports = {
  assistLoanSchema,
  assistInsuranceSchema,
  assistDataEntrySchema,
  raiseIssueSchema,
  updateIssueSchema,
  scheduleNudgeSchema,
  commissionQuerySchema,
};
