/**
 * Post-Harvest Validators — Joi schemas for DICE post-harvest top-up endpoints.
 */
const Joi = require('joi');

const applyTopupSchema = Joi.object({
  parentLoanApplicationId: Joi.number().integer().positive().required(),
  commodityId: Joi.string().trim().max(36).required(),
  produceQuantityQuintals: Joi.number().positive().required(),
  produceGrade: Joi.string().valid('A', 'B', 'C').default('B'),
  warehouseId: Joi.number().integer().positive().required(),
  warehouseReceiptNumber: Joi.string().trim().max(100).required(),
  requestedLoanAmount: Joi.number().positive().required(),
  requestedTenureDays: Joi.number().integer().min(30).max(180).default(90),
});

const releaseTopupSchema = Joi.object({
  releaseType: Joi.string().valid('partial', 'full').required(),
  quantityQuintals: Joi.number().positive().required(),
  salePrice: Joi.number().positive().required(),
  mandiId: Joi.number().integer().positive().required(),
});

module.exports = { applyTopupSchema, releaseTopupSchema };
