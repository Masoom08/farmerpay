/**
 * DICE Validators — Joi schemas for loan endpoints.
 */
const Joi = require('joi');

const applyLoanSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  loanAmount: Joi.number().positive().required(),
  tenureMonths: Joi.number().integer().min(1).max(360).required(),
  intendedUse: Joi.string().trim().max(200).allow('', null),
  documents: Joi.array().items(Joi.alternatives().try(
    Joi.number().integer(),
    Joi.object({ documentId: Joi.number().integer().required(), documentType: Joi.string().required() })
  )).allow(null),

  // Phase 2 wizard rebuild — sequenced loan journey passes the cost
  // calculation context through to the application row so the banker
  // can see how the amount was justified and which plot it's tied to.
  // All optional so the legacy thin-form path keeps working.
  sofId: Joi.number().integer().positive().allow(null),
  sofCostPerHectare: Joi.number().min(0).allow(null),
  nabardBenchmarkPerHectare: Joi.number().min(0).allow(null),
  calculatedRecommendedAmount: Joi.number().min(0).allow(null),
  inputCostBreakdown: Joi.object().unknown(true).allow(null),
  amountAboveSof: Joi.number().min(0).allow(null),
  // Enum is constrained by the LoanApplication model:
  //   manual           — farmer just typed an amount
  //   input_cost_based — heavy calculator path (PoP + InputItems)
  //   hybrid           — Phase-2 wizard: SoF norms + farmer override
  sizingMethod: Joi.string().valid('manual', 'input_cost_based', 'hybrid').allow(null),
  // Land context — survey number + hectares from the AgriStack plot the
  // farmer picked. Stored as JSON in input_cost_breakdown.land_context
  // since loan_applications doesn't have dedicated columns yet.
  landContext: Joi.object({
    surveyNumber: Joi.string().allow('', null),
    areaHectares: Joi.number().positive().allow(null),
    village: Joi.string().allow('', null),
    district: Joi.string().allow('', null),
    state: Joi.string().allow('', null),
  }).allow(null),
});

const bookmarkSchema = Joi.object({
  notes: Joi.string().trim().max(500).allow('', null),
});

// Tier-2 consent capture. `channel` is the UI surface that recorded the
// consent (app, web, paper). `ipAddress` and `userAgent` are derived by the
// controller from req.* and not trusted from the body.
const consentSchema = Joi.object({
  applicationId: Joi.number().integer().positive().required(),
  consentType: Joi.string().valid('loan', 'gold_pledge', 'insurance', 'aa_data', 'cibil').required(),
  consentText: Joi.string().trim().min(10).max(5000).required(),
  version: Joi.string().trim().max(20).required(),
  channel: Joi.string().valid('farmer_app', 'web', 'sathi_app', 'paper').required(),
});

const repaymentSchema = Joi.object({
  applicationId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().precision(2).max(10_00_00_000).required(), // ₹10 Cr hard cap
  scheduleId: Joi.number().integer().positive().allow(null),
  paymentMethod: Joi.string().valid('upi', 'neft', 'rtgs', 'imps', 'cash', 'cheque', 'account_debit').required(),
  paymentReference: Joi.string().trim().max(100).allow('', null),
});

module.exports = { applyLoanSchema, bookmarkSchema, consentSchema, repaymentSchema };
