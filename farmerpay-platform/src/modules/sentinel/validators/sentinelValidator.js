/**
 * SENTINEL Validators
 * Joi schemas for loan health, alerts, portfolio, recovery, and risk endpoints.
 */

const Joi = require('joi');

// ─── Loan Health & Risk ─────────────────────────────────────────────

const getPortfolioSchema = Joi.object({
  bankUserId: Joi.number().integer().positive().allow(null),
  date: Joi.date().iso().allow(null),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

// ─── Alerts ─────────────────────────────────────────────────────────

const getAlertsSchema = Joi.object({
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').allow(null),
  status: Joi.string().valid('pending', 'in_progress', 'completed').allow(null),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const acknowledgeAlertSchema = Joi.object({
  acknowledgedAt: Joi.date().iso().allow(null),
});

const alertActionSchema = Joi.object({
  actionTaken: Joi.string().trim().max(2000).required(),
  actionStatus: Joi.string().valid('pending', 'in_progress', 'completed').required(),
});

// ─── Recovery ───────────────────────────────────────────────────────

const getRecoveryCasesSchema = Joi.object({
  bankUserId: Joi.number().integer().positive().allow(null),
  caseStage: Joi.string().valid('early_recovery', 'intensive_recovery', 'legal_recovery', 'writeoff').allow(null),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const createRecoveryActionSchema = Joi.object({
  actionType: Joi.string().valid(
    'phone_call', 'field_visit', 'settlement_offer',
    'legal_notice', 'auction_notice', 'asset_seizure'
  ).required(),
  actionDate: Joi.date().iso().allow(null),
  notes: Joi.string().trim().max(2000).allow('', null),
  amountPursued: Joi.number().precision(2).min(0).allow(null),
});

module.exports = {
  getPortfolioSchema,
  getAlertsSchema,
  acknowledgeAlertSchema,
  alertActionSchema,
  getRecoveryCasesSchema,
  createRecoveryActionSchema,
};
