/**
 * Vyapar Validators — Joi schemas for vendor marketplace endpoints.
 */
const Joi = require('joi');

const registerVendorSchema = Joi.object({
  vendorName: Joi.string().trim().max(150).required(),
  vendorType: Joi.string().valid('seeds_distributor', 'fertilizer_supplier', 'pesticide_dealer', 'equipment_supplier', 'multipurpose_dealer').required(),
  businessPan: Joi.string().trim().length(10).allow(null),
  shopName: Joi.string().trim().max(150).required(),
  stateId: Joi.number().integer().positive().required(),
  districtId: Joi.number().integer().positive().required(),
  blockId: Joi.number().integer().positive().allow(null),
});

const vendorKycSchema = Joi.object({
  gstNumber: Joi.string().trim().max(15).allow(null),
  gstCertificateDocId: Joi.number().integer().allow(null),
  bankDocumentId: Joi.number().integer().allow(null),
});

const updateProfileSchema = Joi.object({
  vendorName: Joi.string().trim().max(150),
  businessRegistration: Joi.string().trim().max(50),
  shopName: Joi.string().trim().max(150),
}).min(1);

const catalogItemSchema = Joi.object({
  itemId: Joi.string().trim().max(36).required(),
  packId: Joi.string().trim().max(36).required(),
  mrp: Joi.number().positive().required(),
  sellingPrice: Joi.number().positive().required(),
  stock: Joi.number().integer().min(0).required(),
});

const updateCatalogSchema = Joi.object({
  mrp: Joi.number().positive(),
  sellingPrice: Joi.number().positive(),
  stock: Joi.number().integer().min(0),
}).min(1);

const createTransactionSchema = Joi.object({
  farmerId: Joi.number().integer().positive().required(),
  items: Joi.array().items(Joi.object({
    category: Joi.string().required(),
    unitPrice: Joi.number().positive().required(),
    // itemId: Joi.string().required(),
    // packId: Joi.string().required(),
    //quantity: Joi.number().integer().positive().required(),
  })).min(1).required(),
  transactionType: Joi.string().valid('cash_sale', 'credit_sale', 'return', 'exchange').required(),
  loanApplicationId: Joi.number().integer().positive().allow(null),
});

const creditPaymentSchema = Joi.object({
  paymentAmount: Joi.number().positive().required(),
  paymentDate: Joi.date().iso().required(),
});

const loanUtilizationSchema = Joi.object({
  utilisationDate: Joi.date().iso().required(),
  utilisationAmount: Joi.number().positive().required(),
  description: Joi.string().trim().max(255).allow('', null),
});

module.exports = { registerVendorSchema, vendorKycSchema, updateProfileSchema, catalogItemSchema, updateCatalogSchema, createTransactionSchema, creditPaymentSchema, loanUtilizationSchema };
