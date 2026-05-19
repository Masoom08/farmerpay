/**
 * SATHI Validators
 * Joi schemas for task, evidence, consent, sync, verification, and choice endpoints.
 */

const Joi = require('joi');

// ─── Task Schemas ───────────────────────────────────────────────────

const getAgentTasksSchema = Joi.object({
  status: Joi.string().valid('assigned', 'in_progress', 'completed', 'rejected', 'on_hold').allow(null),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').allow(null),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

const startTaskSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().integer().min(0).allow(null),
});

const updateTaskSchema = Joi.object({
  notes: Joi.string().trim().max(2000).allow('', null),
  photosUploaded: Joi.number().integer().min(0).allow(null),
});

const evidenceItemSchema = Joi.object({
  evidenceType: Joi.string().valid('document', 'photo', 'video', 'gps_location', 'signature', 'biometric').required(),
  documentId: Joi.number().integer().positive().allow(null),
  mediaAssetId: Joi.number().integer().positive().allow(null),
  gpsLatitude: Joi.number().min(-90).max(90).allow(null),
  gpsLongitude: Joi.number().min(-180).max(180).allow(null),
  signatureUrl: Joi.string().uri().max(255).allow('', null),
});

const completeTaskSchema = Joi.object({
  endLatitude: Joi.number().min(-90).max(90).required(),
  endLongitude: Joi.number().min(-180).max(180).required(),
  evidenceBundle: Joi.object({
    type: Joi.string().valid(
      'aadhaar_verification', 'address_verification', 'farm_field_verification',
      'transaction_evidence', 'soil_sample', 'weather_observation'
    ).required(),
    items: Joi.array().items(evidenceItemSchema).min(1).required(),
  }).required(),
  notes: Joi.string().trim().max(2000).allow('', null),
});

// ─── Consent Schemas ────────────────────────────────────────────────

const createConsentSchema = Joi.object({
  consentType: Joi.string().valid('data_sharing', 'location_tracking', 'photo_video', 'biometric_capture').required(),
});

// ─── Sync Schemas ───────────────────────────────────────────────────

const syncItemSchema = Joi.object({
  entityType: Joi.string().trim().max(100).required(),
  entityId: Joi.number().integer().positive().allow(null),
  action: Joi.string().valid('create', 'update', 'delete').required(),
  data: Joi.object().allow(null),
});

const syncSchema = Joi.object({
  syncQueue: Joi.array().items(syncItemSchema).min(1).required(),
});

const resolveConflictSchema = Joi.object({
  resolution: Joi.string().valid('use_server', 'use_client', 'merge').required(),
  selectedValue: Joi.object().allow(null),
});

// ─── Field Verification Schemas ─────────────────────────────────────

const checklistItemSchema = Joi.object({
  text: Joi.string().trim().max(255).required(),
  isRequired: Joi.boolean().default(false),
  isChecked: Joi.boolean().default(false),
});

const createFieldVerificationSchema = Joi.object({
  farmerId: Joi.number().integer().positive().required(),
  type: Joi.string().valid('address', 'farm_boundary', 'field_size', 'crop_variety', 'ownership_status').required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  checklist: Joi.array().items(checklistItemSchema).min(1).allow(null),
  photos: Joi.array().items(Joi.number().integer().positive()).allow(null),
});

// ─── Choice / Intermediary Schemas ──────────────────────────────────

const createInteractionSchema = Joi.object({
  farmerId: Joi.number().integer().positive().required(),
  interactionType: Joi.string().valid('phone_call', 'sms', 'in_person_visit', 'whatsapp', 'video_call').required(),
  duration: Joi.number().integer().min(0).allow(null),
  purpose: Joi.string().trim().max(100).allow('', null),
  outcome: Joi.string().trim().max(2000).allow('', null),
});

const getPerformanceSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2020).max(2100).required(),
});

const getAssignedFarmersSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

// ─── ROOTS Verification Schemas ──────────────────────────────────

const createRootsVerificationSchema = Joi.object({
  farmerId: Joi.number().integer().positive().required(),
  triggerReason: Joi.string().max(50).required(),
  concerns: Joi.array().items(Joi.string().max(50)).default([]),
});

const completeRootsVerificationSchema = Joi.object({
  fieldPhotoUrl: Joi.string().uri().allow(null, ''),
  gps: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().positive().allow(null),
  }).allow(null),
  cropStanding: Joi.boolean().allow(null),
  estimatedStage: Joi.string().max(50).allow(null, ''),
  farmerInterview: Joi.string().max(2000).allow(null, ''),
  discrepancies: Joi.array().items(Joi.object({
    description: Joi.string().max(500).required(),
    detail: Joi.string().max(1000).allow(null, ''),
    severity: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
    activityType: Joi.string().valid('CROP', 'DAIRY', 'FISHERY', 'HORTI', 'POULTRY', 'GOATERY').default('CROP'),
    activityRefId: Joi.number().integer().allow(null),
  })).default([]),
  assistedEntries: Joi.array().items(Joi.object({
    workbandName: Joi.string().max(100),
    done: Joi.boolean(),
    inputQty: Joi.number().allow(null),
    cost: Joi.number().allow(null),
    notes: Joi.string().max(500).allow(null, ''),
  })).default([]),
  startedAt: Joi.date().iso().allow(null),
});

module.exports = {
  getAgentTasksSchema,
  startTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  createConsentSchema,
  syncSchema,
  resolveConflictSchema,
  createFieldVerificationSchema,
  createInteractionSchema,
  getPerformanceSchema,
  getAssignedFarmersSchema,
  createRootsVerificationSchema,
  completeRootsVerificationSchema,
};
