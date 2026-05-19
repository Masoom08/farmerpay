/**
 * Soil Health Card — Joi validators for OCR endpoints.
 */
const Joi = require('joi');

const uploadSoilHealthSchema = Joi.object({
  fieldId: Joi.number().integer().positive().required(),
  ocrText: Joi.string().max(10000).required(),
  imageUrl: Joi.string().uri().allow(null, ''),
});

const verifySoilHealthSchema = Joi.object({
  corrections: Joi.object({
    nitrogen: Joi.number().min(0).max(1000).allow(null),
    phosphorus: Joi.number().min(0).max(500).allow(null),
    potassium: Joi.number().min(0).max(1500).allow(null),
    ph: Joi.number().min(0).max(14).allow(null),
    ec: Joi.number().min(0).max(20).allow(null),
    oc: Joi.number().min(0).max(10).allow(null),
    sulphur: Joi.number().min(0).max(500).allow(null),
    zinc: Joi.number().min(0).max(100).allow(null),
    iron: Joi.number().min(0).max(500).allow(null),
    manganese: Joi.number().min(0).max(200).allow(null),
    copper: Joi.number().min(0).max(100).allow(null),
    boron: Joi.number().min(0).max(50).allow(null),
  }).required(),
});

module.exports = {
  uploadSoilHealthSchema,
  verifySoilHealthSchema,
};
