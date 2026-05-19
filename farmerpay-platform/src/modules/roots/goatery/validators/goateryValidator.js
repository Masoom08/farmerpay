/**
 * Goatery Validators — Joi schemas for all goatery endpoints.
 */
const Joi = require('joi');

const createHerdSchema = Joi.object({
  herdName: Joi.string().trim().max(100).required(),
  herdType: Joi.string().valid('STALL_FED', 'GRAZING', 'MIXED').required(),
  primaryBreed: Joi.string().max(100).allow(null, ''),
  locationVillage: Joi.string().max(200).allow(null, ''),
  farmRegisterId: Joi.number().integer().positive().allow(null),
});

const registerAnimalSchema = Joi.object({
  tagId: Joi.string().trim().max(50).required(),
  name: Joi.string().max(100).allow(null, ''),
  breed: Joi.string().max(100).allow(null, ''),
  sex: Joi.string().valid('MALE', 'FEMALE').required(),
  dob: Joi.date().iso().allow(null),
  approximateAgeMonths: Joi.number().integer().min(0).max(240).allow(null),
  weightKg: Joi.number().min(0.5).max(120).allow(null),
  damId: Joi.number().integer().positive().allow(null),
  sireId: Joi.number().integer().positive().allow(null),
  purchaseDate: Joi.date().iso().allow(null),
  purchaseCost: Joi.number().min(0).allow(null),
  source: Joi.string().max(200).allow(null, ''),
  photoUrl: Joi.string().uri().max(500).allow(null, ''),
  notes: Joi.string().max(2000).allow(null, ''),
});

const growthLogSchema = Joi.object({
  logDate: Joi.date().iso().required(),
  weightKg: Joi.number().min(0.5).max(120).required(),
  bodyConditionScore: Joi.number().integer().min(1).max(5).allow(null),
  notes: Joi.string().max(1000).allow(null, ''),
  photoUrl: Joi.string().uri().max(500).allow(null, ''),
});

const healthEventSchema = Joi.object({
  animalId: Joi.number().integer().positive().allow(null),
  eventDate: Joi.date().iso().required(),
  eventType: Joi.string().valid('VACCINATION', 'DEWORMING', 'DISEASE', 'TREATMENT', 'INJURY').required(),
  vaccineName: Joi.string().max(100).allow(null, ''),
  diseaseName: Joi.string().max(100).allow(null, ''),
  medicineName: Joi.string().max(100).allow(null, ''),
  vetName: Joi.string().max(200).allow(null, ''),
  cost: Joi.number().min(0).allow(null),
  animalsAffected: Joi.number().integer().min(0).allow(null),
  notes: Joi.string().max(2000).allow(null, ''),
});

const breedingServiceSchema = Joi.object({
  serviceDate: Joi.date().iso().required(),
  serviceType: Joi.string().valid('NATURAL', 'AI').required(),
  buckId: Joi.number().integer().positive().allow(null),
  cost: Joi.number().min(0).allow(null),
});

const kiddingSchema = Joi.object({
  kiddingDate: Joi.date().iso().required(),
  kidCount: Joi.number().integer().min(1).max(5).required(),
  kidDetails: Joi.array().items(Joi.object({
    tagId: Joi.string().max(50).allow(null, ''),
    name: Joi.string().max(100).allow(null, ''),
    sex: Joi.string().valid('MALE', 'FEMALE'),
    birthWeightKg: Joi.number().min(0.3).max(5).allow(null),
  })).allow(null),
  complications: Joi.string().max(1000).allow(null, ''),
});

const feedLogSchema = Joi.object({
  logDate: Joi.date().iso().required(),
  feedType: Joi.string().valid('GRAZING', 'DRY_FODDER', 'GREEN_FODDER', 'CONCENTRATE', 'MINERAL_MIX', 'OTHER').required(),
  quantityKg: Joi.number().positive().allow(null),
  grazingHours: Joi.number().min(0).max(24).allow(null),
  cost: Joi.number().min(0).allow(null),
  notes: Joi.string().max(1000).allow(null, ''),
});

const costEventSchema = Joi.object({
  eventDate: Joi.date().iso().required(),
  category: Joi.string().valid('FEED', 'MEDICINE', 'LABOR', 'TRANSPORT', 'SHELTER', 'EQUIPMENT', 'BREEDING', 'OTHER').required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().max(255).allow(null, ''),
});

const revenueEventSchema = Joi.object({
  eventDate: Joi.date().iso().required(),
  category: Joi.string().valid('LIVE_SALE', 'MEAT_SALE', 'MANURE_SALE', 'MILK_SALE', 'OTHER').required(),
  quantity: Joi.number().positive().allow(null),
  unit: Joi.string().max(20).allow(null, ''),
  ratePerUnit: Joi.number().positive().allow(null),
  totalAmount: Joi.number().positive().required(),
  buyerName: Joi.string().max(200).allow(null, ''),
  animalId: Joi.number().integer().positive().allow(null),
  saleWeightKg: Joi.number().min(0).allow(null),
});

module.exports = {
  createHerdSchema, registerAnimalSchema, growthLogSchema,
  healthEventSchema, breedingServiceSchema, kiddingSchema,
  feedLogSchema, costEventSchema, revenueEventSchema,
};
