/**
 * Banker Validator — Joi schemas for banker dashboard query params.
 */

const Joi = require('joi');

const farmerRiskListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('compliance_score', 'trust_score', 'risk_level', 'loan_outstanding', 'farmer_name').default('compliance_score'),
  complianceStatus: Joi.string().valid('on_track', 'at_risk', 'off_track').optional(),
  search: Joi.string().max(200).allow('').optional(),
});

const portfolioTrendsSchema = Joi.object({
  period: Joi.string().valid('7d', '30d', '90d', '180d').default('30d'),
});

const rootsComplianceSchema = Joi.object({
  season: Joi.string().max(30).allow('').optional(),
  crop: Joi.string().max(100).allow('').optional(),
  branch: Joi.string().max(100).allow('').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

const rootsRedFlagsSchema = Joi.object({
  severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  status: Joi.string().valid('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

module.exports = {
  farmerRiskListSchema,
  portfolioTrendsSchema,
  rootsComplianceSchema,
  rootsRedFlagsSchema,
};
