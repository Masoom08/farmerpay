/**
 * PULSE Validators
 * Joi schemas for mandi, price, forecast, MSP, and alert endpoints.
 */

const Joi = require('joi');

const getMandisSchema = Joi.object({
  stateId: Joi.number().integer().positive().allow(null),
  districtId: Joi.number().integer().positive().allow(null),
});

const getLatestPricesSchema = Joi.object({
  commodityId: Joi.string().trim().max(36).required(),
  mandiId: Joi.number().integer().positive().allow(null),
  days: Joi.number().integer().min(1).max(90).default(7),
});

const getPriceChartSchema = Joi.object({
  commodityId: Joi.string().trim().max(36).required(),
  mandiId: Joi.number().integer().positive().allow(null),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
});

const getMspSchema = Joi.object({
  season: Joi.string().valid('kharif', 'rabi', 'summer').allow(null),
  year: Joi.number().integer().min(2000).max(2100).allow(null),
});

const createFarmerPriceAlertSchema = Joi.object({
  commodityId: Joi.string().trim().max(36).required(),
  targetPrice: Joi.number().precision(2).positive().required(),
  alertType: Joi.string().valid('price_reached', 'price_exceeded', 'price_below').required(),
});

const getSellRecommendationsSchema = Joi.object({
  cycleId: Joi.string().trim().max(36).allow(null),
});

module.exports = {
  getMandisSchema,
  getLatestPricesSchema,
  getPriceChartSchema,
  getMspSchema,
  createFarmerPriceAlertSchema,
  getSellRecommendationsSchema,
};
