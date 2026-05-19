/**
 * Input Calculator Validators — Joi schemas for loan sizing endpoints.
 */
const Joi = require('joi');

const calculateLoanSchema = Joi.object({
  cropId: Joi.number().integer().positive().required(),
  fieldId: Joi.number().integer().positive().required(),
  popId: Joi.string().trim().max(36).required(),
  selectedInputs: Joi.array().items(Joi.object({
    inputItemId: Joi.string().trim().max(36).required(),
    quantity: Joi.number().positive().required(),
  })).min(1).required(),
  extraInputs: Joi.array().items(Joi.object({
    inputItemId: Joi.string().trim().max(36).required(),
    quantity: Joi.number().positive().required(),
  })).default([]),
});

const inputDropdownSchema = Joi.object({
  cropId: Joi.number().integer().positive(),
  popId: Joi.string().trim().max(36).required(),
  stateId: Joi.number().integer().positive(),
});

const extraInputsSchema = Joi.object({
  categoryId: Joi.number().integer().positive(),
  stateId: Joi.number().integer().positive(),
  search: Joi.string().trim().max(100),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(50),
});

const sofLookupSchema = Joi.object({
  districtId: Joi.number().integer().positive(),
  cropId: Joi.number().integer().positive(),
  season: Joi.string().valid('kharif', 'rabi', 'summer', 'perennial'),
});

module.exports = { calculateLoanSchema, inputDropdownSchema, extraInputsSchema, sofLookupSchema };
