/**
 * Execution Validators — Joi schemas for crop execution endpoints.
 */
const Joi = require('joi');

const registerFarmSchema = Joi.object({
  farmName: Joi.string().trim().max(100).required(),
  totalHectares: Joi.number().positive().precision(4).required(),
  totalCultivableHectares: Joi.number().positive().precision(4).required(),
});

const addFieldSchema = Joi.object({
  fieldName: Joi.string().trim().max(100).required(),
  fieldSize: Joi.number().positive().precision(4).required(),
  villageId: Joi.number().integer().positive().allow(null),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
});

const createCycleSchema = Joi.object({
  // fieldId is optional in v1 — the farmer-app crop card lets the farmer
  // create a cycle without first registering a farm + field. The SAGE
  // engine gracefully degrades when field_id is null.
  fieldId: Joi.number().integer().positive().allow(null),
  cropId: Joi.string().trim().max(36).required(),
  varietyId: Joi.string().trim().max(36).allow(null),
  popId: Joi.string().trim().max(36).allow(null),
  season: Joi.string().valid('kharif', 'rabi', 'summer').required(),
  sowingDate: Joi.date().iso().required(),
  expectedHarvestDate: Joi.date().iso().allow(null),
  // Phase 1 self-declared fields — accept from the crop card screen
  selfDeclaredCrop: Joi.string().trim().max(80).allow(null, ''),
  selfDeclaredInsuranceStatus: Joi.string().valid('insured', 'not_insured', 'unknown').allow(null),
  selfDeclaredPolicyNo: Joi.string().trim().max(64).allow(null, ''),
});

const executeWorkbandSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().allow(null),
  notes: Joi.string().trim().max(1000).allow('', null),
});

const executeTaskSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  completionPercentage: Joi.number().integer().min(0).max(100).default(0),
  notes: Joi.string().trim().max(1000).allow('', null),
  photos: Joi.array().items(Joi.number().integer()).allow(null),
  inputs: Joi.array().items(Joi.object({
    inputItemId: Joi.string().required(),
    quantityUsed: Joi.number().positive().required(),
    unitId: Joi.number().integer().positive().required(),
    cost: Joi.number().min(0).allow(null),
  })).allow(null),
  labor: Joi.array().items(Joi.object({
    laborType: Joi.string().valid('family', 'hired_male', 'hired_female', 'machine').required(),
    laborCount: Joi.number().integer().min(1).required(),
    laborHours: Joi.number().positive().required(),
    wagePerDay: Joi.number().min(0).allow(null),
  })).allow(null),
  machinery: Joi.array().items(Joi.object({
    machineryType: Joi.string().required(),
    hoursUsed: Joi.number().positive().required(),
    hireCost: Joi.number().min(0).allow(null),
  })).allow(null),
});

const completeTaskSchema = Joi.object({
  endDate: Joi.date().iso().required(),
  completionPercentage: Joi.number().integer().valid(100).required(),
  finalNotes: Joi.string().trim().max(1000).allow('', null),
});

const harvestSchema = Joi.object({
  harvestStartDate: Joi.date().iso().required(),
  harvestEndDate: Joi.date().iso().allow(null),
  totalQuantityKg: Joi.number().integer().positive().required(),
  qualityGrade: Joi.string().trim().max(50).allow(null),
  notes: Joi.string().trim().max(1000).allow('', null),
});

const saleSchema = Joi.object({
  saleDate: Joi.date().iso().required(),
  quantitySold: Joi.number().integer().positive().required(),
  pricePerKg: Joi.number().positive().required(),
  buyerName: Joi.string().trim().max(100).allow(null),
  buyerType: Joi.string().valid('local_trader', 'mandi', 'fpo', 'company', 'broker').allow(null),
});

module.exports = { registerFarmSchema, addFieldSchema, createCycleSchema, executeWorkbandSchema, executeTaskSchema, completeTaskSchema, harvestSchema, saleSchema };
