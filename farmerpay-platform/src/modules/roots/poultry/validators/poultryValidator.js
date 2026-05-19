/**
 * Poultry Validators — Joi schemas for all poultry endpoints.
 */
const Joi = require('joi');

const createFlockSchema = Joi.object({
  batchName: Joi.string().trim().max(100).required(),
  birdType: Joi.string().valid('BROILER', 'LAYER', 'COUNTRY', 'DUCK', 'QUAIL').required(),
  breed: Joi.string().max(100).allow(null, ''),
  placementDate: Joi.date().iso().required(),
  initialCount: Joi.number().integer().positive().required(),
  avgInitialWeightG: Joi.number().integer().positive().allow(null),
  shedType: Joi.string().max(50).allow(null, ''),
  farmRegisterId: Joi.number().integer().positive().allow(null),
  notes: Joi.string().max(2000).allow(null, ''),
});

const updateFlockSchema = Joi.object({
  batchName: Joi.string().trim().max(100),
  breed: Joi.string().max(100).allow(null, ''),
  shedType: Joi.string().max(50).allow(null, ''),
  notes: Joi.string().max(2000).allow(null, ''),
});

const dailyLogSchema = Joi.object({
  logDate: Joi.date().iso().required(),
  mortalityCount: Joi.number().integer().min(0).default(0),
  feedConsumedKg: Joi.number().positive().allow(null),
  waterConsumedLiters: Joi.number().positive().allow(null),
  eggCount: Joi.number().integer().min(0).allow(null),
  sampleWeightG: Joi.number().integer().positive().allow(null),
  temperatureHigh: Joi.number().min(-10).max(60).allow(null),
  temperatureLow: Joi.number().min(-10).max(60).allow(null),
  humidityPct: Joi.number().integer().min(0).max(100).allow(null),
  diseaseObserved: Joi.boolean().default(false),
  diseaseNotes: Joi.string().max(1000).allow(null, ''),
  photoUrl: Joi.string().uri().max(500).allow(null, ''),
});

const healthEventSchema = Joi.object({
  eventDate: Joi.date().iso().required(),
  eventType: Joi.string().valid('VACCINATION', 'DISEASE', 'MEDICATION', 'DEWORMING', 'CULLING').required(),
  vaccineName: Joi.string().max(100).allow(null, ''),
  diseaseName: Joi.string().max(100).allow(null, ''),
  medicineName: Joi.string().max(100).allow(null, ''),
  dosage: Joi.string().max(100).allow(null, ''),
  birdsAffected: Joi.number().integer().min(0).allow(null),
  cost: Joi.number().min(0).allow(null),
  administeredBy: Joi.string().max(100).allow(null, ''),
  notes: Joi.string().max(2000).allow(null, ''),
});

const costEventSchema = Joi.object({
  eventDate: Joi.date().iso().required(),
  category: Joi.string().valid('FEED', 'MEDICINE', 'LABOR', 'ENERGY', 'CHICK_PURCHASE', 'EQUIPMENT', 'LITTER', 'TRANSPORT', 'OTHER').required(),
  description: Joi.string().max(255).allow(null, ''),
  amount: Joi.number().positive().required(),
  quantity: Joi.number().positive().allow(null),
  unit: Joi.string().max(20).allow(null, ''),
  isRecurring: Joi.boolean().default(false),
  recurringFrequency: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').allow(null),
});

const revenueEventSchema = Joi.object({
  eventDate: Joi.date().iso().required(),
  category: Joi.string().valid('EGG_SALE', 'BIRD_SALE', 'MANURE_SALE', 'OTHER').required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().max(20).allow(null, ''),
  ratePerUnit: Joi.number().positive().allow(null),
  totalAmount: Joi.number().positive().required(),
  buyerName: Joi.string().max(200).allow(null, ''),
  buyerType: Joi.string().valid('TRADER', 'RETAIL', 'HOTEL', 'MARKET', 'OTHER').allow(null),
});

module.exports = {
  createFlockSchema, updateFlockSchema, dailyLogSchema,
  healthEventSchema, costEventSchema, revenueEventSchema,
};
