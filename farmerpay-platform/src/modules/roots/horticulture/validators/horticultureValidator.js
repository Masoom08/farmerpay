/**
 * Horticulture Validators
 * Joi schemas for orchard, planting, harvest, input, health, and irrigation endpoints.
 */

const Joi = require('joi');

const createOrchardSchema = Joi.object({
  orchardName: Joi.string().trim().min(2).max(100).required(),
  cropName: Joi.string().trim().max(100).allow('', null),
  variety: Joi.string().trim().max(100).allow('', null),
  areaHectares: Joi.number().precision(4).min(0).allow(null),
  plantingDate: Joi.date().iso().allow(null),
  plantCount: Joi.number().integer().min(0).allow(null),
  plantSpacingMeters: Joi.number().precision(2).min(0).allow(null),
  infrastructureType: Joi.string().valid('open_field', 'polyhouse', 'shade_net', 'low_tunnel', 'greenhouse').allow(null),
  infrastructureAreaSqm: Joi.number().precision(2).min(0).allow(null),
  subsidyScheme: Joi.string().trim().max(100).allow('', null),
  subsidyAmount: Joi.number().precision(2).min(0).allow(null),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
});

const addPlantingSchema = Joi.object({
  saplingSource: Joi.string().trim().max(100).allow('', null),
  saplingVariety: Joi.string().trim().max(100).allow('', null),
  saplingCount: Joi.number().integer().min(0).allow(null),
  saplingCostPerUnit: Joi.number().precision(2).min(0).allow(null),
  plantingDate: Joi.date().iso().allow(null),
  survivalRatePercent: Joi.number().precision(2).min(0).max(100).allow(null),
});

const addHarvestSchema = Joi.object({
  harvestDate: Joi.date().iso().required(),
  totalYieldKg: Joi.number().integer().min(0).allow(null),
  gradeAKg: Joi.number().integer().min(0).allow(null),
  gradeBKg: Joi.number().integer().min(0).allow(null),
  gradeCKg: Joi.number().integer().min(0).allow(null),
  rejectionKg: Joi.number().integer().min(0).allow(null),
  rejectionReason: Joi.string().trim().max(200).allow('', null),
  saleQuantityKg: Joi.number().integer().min(0).allow(null),
  salePricePerKg: Joi.number().precision(2).min(0).allow(null),
  buyerName: Joi.string().trim().max(100).allow('', null),
  buyerType: Joi.string().valid('mandi', 'processor', 'exporter', 'retail', 'fpo').allow(null),
});

const addHealthRecordSchema = Joi.object({
  observationDate: Joi.date().iso().required(),
  healthStatus: Joi.string().valid('excellent', 'good', 'average', 'poor').allow(null),
  pestDetected: Joi.boolean().allow(null),
  pestName: Joi.string().trim().max(100).allow('', null),
  diseaseDetected: Joi.boolean().allow(null),
  diseaseName: Joi.string().trim().max(100).allow('', null),
  affectedPlantCount: Joi.number().integer().min(0).allow(null),
  treatmentGiven: Joi.string().trim().max(2000).allow('', null),
});

const addInputLogSchema = Joi.object({
  inputDate: Joi.date().iso().required(),
  inputType: Joi.string().trim().max(50).allow('', null),
  inputName: Joi.string().trim().max(100).allow('', null),
  quantity: Joi.number().precision(2).min(0).allow(null),
  unit: Joi.string().trim().max(20).allow('', null),
  cost: Joi.number().precision(2).min(0).allow(null),
});

const addIrrigationLogSchema = Joi.object({
  irrigationDate: Joi.date().iso().required(),
  irrigationMethod: Joi.string().valid('drip', 'sprinkler', 'flood', 'furrow', 'manual').allow(null),
  durationHours: Joi.number().precision(2).min(0).allow(null),
  waterSource: Joi.string().trim().max(50).allow('', null),
  cost: Joi.number().precision(2).min(0).allow(null),
});

const getProductionSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2020).max(2100).required(),
});

module.exports = {
  createOrchardSchema,
  addPlantingSchema,
  addHarvestSchema,
  addHealthRecordSchema,
  addInputLogSchema,
  addIrrigationLogSchema,
  getProductionSchema,
};
