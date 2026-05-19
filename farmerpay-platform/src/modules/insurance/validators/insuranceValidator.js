/**
 * Insurance Phase 2 POS — Joi validators.
 */

const Joi = require('joi');

const productListQuerySchema = Joi.object({
  subsidyType: Joi.string().valid('government', 'non_subsidized').optional(),
  category: Joi.string()
    .valid('crop', 'horticulture', 'livestock', 'fisheries', 'multi')
    .optional(),
});

const quoteBodySchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  sumInsured: Joi.number().min(1000).max(100000000).required(),
  season: Joi.string().valid('kharif', 'rabi').optional().allow(null, ''),
  areaHectares: Joi.number().positive().max(10000).optional().allow(null),
  crop: Joi.string().max(50).optional().allow(null, ''),
});

const referralBodySchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  action: Joi.string().valid('viewed', 'quoted', 'referred').required(),
  // Optional quote snapshot — populated when action is 'quoted' or 'referred'
  sumInsured: Joi.number().min(0).max(100000000).optional().allow(null),
  farmerPremium: Joi.number().min(0).max(100000000).optional().allow(null),
  subsidyAmount: Joi.number().min(0).max(100000000).optional().allow(null),
  areaHectares: Joi.number().positive().max(10000).optional().allow(null),
  crop: Joi.string().max(50).optional().allow(null, ''),
  season: Joi.string().valid('kharif', 'rabi').optional().allow(null, ''),
  cycleId: Joi.string().max(36).optional().allow(null, ''),
});

module.exports = {
  productListQuerySchema,
  quoteBodySchema,
  referralBodySchema,
};
