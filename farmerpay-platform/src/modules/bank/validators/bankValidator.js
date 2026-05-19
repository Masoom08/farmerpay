/**
 * Bank Validators
 * Joi schemas for portfolio import, loan account, data entry, and linkage.
 */

const Joi = require('joi');

const importMetadataSchema = Joi.object({
  bankName: Joi.string().trim().max(100).allow('', null),
  branchCode: Joi.string().trim().max(20).allow('', null),
});

const getLoanAccountsSchema = Joi.object({
  smaClassification: Joi.string().valid('standard', 'sma_0', 'sma_1', 'sma_2', 'npa').allow(null),
  loanType: Joi.string().valid('agri_gold', 'consumption_gold', 'kcc_gold', 'allied_gold').allow(null),
  linkageStatus: Joi.string().valid('unlinked', 'auto_matched', 'manually_linked', 'confirmed').allow(null),
  branchCode: Joi.string().trim().max(20).allow('', null),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const linkFarmerSchema = Joi.object({
  farmerId: Joi.number().integer().positive().required(),
});

const addDataEntrySchema = Joi.object({
  entryType: Joi.string().valid(
    'repayment_update', 'sma_update', 'collateral_update',
    'disbursement_event', 'closure_event', 'topup_event', 'general_note'
  ).required(),
  entryData: Joi.object().required(),
  notes: Joi.string().trim().max(2000).allow('', null),
});

const manualLoanEntrySchema = Joi.object({
  finacleAccountNumber: Joi.string().trim().max(20).required(),
  borrowerName: Joi.string().trim().max(150).required(),
  borrowerMobile: Joi.string().trim().max(13).allow('', null),
  borrowerPan: Joi.string().trim().length(10).allow('', null),
  loanType: Joi.string().valid('agri_gold', 'consumption_gold', 'kcc_gold', 'allied_gold').required(),
  sanctionAmount: Joi.number().precision(2).positive().required(),
  sanctionDate: Joi.date().iso().allow(null),
  interestRate: Joi.number().precision(3).min(0).allow(null),
  maturityDate: Joi.date().iso().allow(null),
  repaymentType: Joi.string().valid('emi', 'bullet').required(),
  outstandingAmount: Joi.number().precision(2).min(0).required(),
  daysPassDue: Joi.number().integer().min(0).default(0),
  goldWeightGrams: Joi.number().precision(3).min(0).allow(null),
  goldPurityCarat: Joi.number().precision(1).min(0).max(24).allow(null),
  goldValuationAmount: Joi.number().precision(2).min(0).allow(null),
  smaClassification: Joi.string().valid('standard', 'sma_0', 'sma_1', 'sma_2', 'npa').default('standard'),
  pslCategory: Joi.string().trim().max(50).allow('', null),
  disbursementMode: Joi.string().valid('bank_transfer', 'upi', 'cheque', 'cash').allow(null),
});

module.exports = {
  importMetadataSchema, getLoanAccountsSchema, linkFarmerSchema,
  addDataEntrySchema, manualLoanEntrySchema,
};
