/**
 * Fishery Validators
 * Joi schemas for pond register, pond, stocking, and water quality endpoints.
 */

const Joi = require('joi');

const createPondRegisterSchema = Joi.object({
  registerName: Joi.string().trim().min(2).max(100).required(),
  totalPondArea: Joi.number().precision(4).min(0).allow(null),
});

const addPondSchema = Joi.object({
  pondName: Joi.string().trim().max(100).required(),
  pondArea: Joi.number().precision(4).min(0).allow(null),
  pondDepth: Joi.number().precision(2).min(0).allow(null),
  waterSource: Joi.string().valid('well', 'canal', 'river', 'rainwater', 'groundwater').allow(null),
});

const addStockingSchema = Joi.object({
  speciesName: Joi.string().trim().max(100).required(),
  speciesType: Joi.string().valid('carp', 'catfish', 'tilapia', 'shrimp', 'other').allow(null),
  fingerlings: Joi.number().integer().min(0).allow(null),
  fingerlingCostPerUnit: Joi.number().precision(2).min(0).allow(null),
  fingerlingSurvivalRate: Joi.number().precision(2).min(0).max(100).allow(null),
});

const getWaterQualitySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2020).max(2100).required(),
});

module.exports = {
  createPondRegisterSchema,
  addPondSchema,
  addStockingSchema,
  getWaterQualitySchema,
};
