/**
 * Trust Validators — Joi schemas for TRUST engine endpoints.
 */
const Joi = require('joi');

const saveResponsesSchema = Joi.object({
  sectionId: Joi.number().integer().positive().required(),
  responses: Joi.array().items(Joi.object({
    questionId: Joi.number().integer().positive().required(),
    response: Joi.alternatives().try(
      Joi.number(),
      Joi.string().max(500),
      Joi.array().items(Joi.number().integer()),
    ).required(),
  })).min(1).required(),
});

const submitAppealSchema = Joi.object({
  appealReason: Joi.string().trim().min(10).max(2000).required()
    .messages({ 'string.min': 'Appeal reason must be at least 10 characters' }),
  additionalContext: Joi.string().trim().max(2000).allow('', null),
});

const ACTIVITY_TYPES = ['CROP', 'DAIRY', 'FISHERY', 'HORTI', 'LABOUR', 'OFF_FARM', 'AGRI_BIZ'];

const upsertActivitiesSchema = Joi.object({
  activities: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(...ACTIVITY_TYPES).required(),
      isPrimary: Joi.boolean().optional(),
      startedYear: Joi.number().integer().min(1950).max(2100).optional(),
      source: Joi.string().valid('FARMER_DECLARED', 'BACKFILL', 'AGENT_VERIFIED').optional(),
    })
  ).min(1).required(),
  mix: Joi.object({
    referenceYear: Joi.number().integer().min(1950).max(2100).optional(),
    items: Joi.array().items(
      Joi.object({
        type: Joi.string().valid(...ACTIVITY_TYPES).required(),
        sharePercent: Joi.number().min(0).max(100).required(),
        estimatedAnnualIncomeInr: Joi.number().min(0).optional(),
        confidence: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').optional(),
      })
    ).min(1).required(),
  }).optional(),
});

// ─── Loan Liabilities & Repayments ────────────────────────────────

const LENDER_TYPES = ['BANK', 'NBFC', 'MFI', 'COOP', 'SHG', 'MONEYLENDER', 'RELATIVE', 'FPO', 'GOVT_SCHEME', 'OTHER'];
const LOAN_PURPOSES = ['KCC', 'CROP', 'DAIRY', 'FISHERY', 'GOLD', 'PERSONAL', 'HOUSING', 'EDUCATION', 'CONSUMER', 'BUSINESS', 'OTHER'];
const EMI_FREQ = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'BULLET'];
const LOAN_STATUS = ['ACTIVE', 'CLOSED', 'DEFAULTED', 'RESTRUCTURED', 'WRITTEN_OFF'];
const LIABILITY_SOURCE = ['FARMER_DECLARED', 'AGENT_VERIFIED', 'BUREAU', 'INTERNAL', 'BACKFILL'];
const REPAY_STATUS = ['UPCOMING', 'PAID_ONTIME', 'PAID_LATE', 'PARTIAL', 'MISSED'];
const PAYMENT_CHANNEL = ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER'];

const createLiabilitySchema = Joi.object({
  lenderType: Joi.string().valid(...LENDER_TYPES).required(),
  lenderName: Joi.string().trim().max(120).allow('', null),
  loanPurpose: Joi.string().valid(...LOAN_PURPOSES).required(),
  principalInr: Joi.number().min(0).required(),
  outstandingInr: Joi.number().min(0).optional(),
  interestRatePct: Joi.number().min(0).max(100).optional(),
  tenureMonths: Joi.number().integer().min(0).max(600).optional(),
  emiInr: Joi.number().min(0).optional(),
  emiFrequency: Joi.string().valid(...EMI_FREQ).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  status: Joi.string().valid(...LOAN_STATUS).optional(),
  isSecured: Joi.boolean().optional(),
  collateralDescription: Joi.string().trim().max(500).allow('', null),
  source: Joi.string().valid(...LIABILITY_SOURCE).optional(),
  notes: Joi.string().trim().max(1000).allow('', null),
});

const updateLiabilitySchema = Joi.object({
  lenderType: Joi.string().valid(...LENDER_TYPES).optional(),
  lenderName: Joi.string().trim().max(120).allow('', null),
  loanPurpose: Joi.string().valid(...LOAN_PURPOSES).optional(),
  principalInr: Joi.number().min(0).optional(),
  outstandingInr: Joi.number().min(0).optional(),
  interestRatePct: Joi.number().min(0).max(100).optional(),
  tenureMonths: Joi.number().integer().min(0).max(600).optional(),
  emiInr: Joi.number().min(0).optional(),
  emiFrequency: Joi.string().valid(...EMI_FREQ).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  status: Joi.string().valid(...LOAN_STATUS).optional(),
  isSecured: Joi.boolean().optional(),
  collateralDescription: Joi.string().trim().max(500).allow('', null),
  notes: Joi.string().trim().max(1000).allow('', null),
}).min(1);

const logRepaymentSchema = Joi.object({
  installmentNumber: Joi.number().integer().min(1).optional(),
  dueDate: Joi.date().iso().required(),
  dueAmountInr: Joi.number().min(0).required(),
  paidDate: Joi.date().iso().optional(),
  paidAmountInr: Joi.number().min(0).optional(),
  status: Joi.string().valid(...REPAY_STATUS).optional(),
  paymentChannel: Joi.string().valid(...PAYMENT_CHANNEL).optional(),
  referenceNumber: Joi.string().trim().max(120).allow('', null),
  notes: Joi.string().trim().max(1000).allow('', null),
});

// ─── Household Expenses ───────────────────────────────────────────

const upsertExpenseSchema = Joi.object({
  referenceYear: Joi.number().integer().min(1950).max(2100).optional(),
  referenceMonth: Joi.number().integer().min(1).max(12).optional(),
  foodInr: Joi.number().min(0).optional(),
  educationInr: Joi.number().min(0).optional(),
  healthInr: Joi.number().min(0).optional(),
  utilitiesInr: Joi.number().min(0).optional(),
  transportInr: Joi.number().min(0).optional(),
  rentInr: Joi.number().min(0).optional(),
  farmInputsInr: Joi.number().min(0).optional(),
  loanEmiInr: Joi.number().min(0).optional(),
  savingsInr: Joi.number().min(0).optional(),
  otherInr: Joi.number().min(0).optional(),
  confidence: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').optional(),
  source: Joi.string().valid('FARMER_DECLARED', 'AGENT_VERIFIED', 'BACKFILL').optional(),
  notes: Joi.string().trim().max(1000).allow('', null),
}).min(1);

// ─── TRUST v2 Schemas ────────────────────────────────────────────

const PILLAR_CODES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
const DECISIONS = ['SANCTION', 'RECONSIDER', 'REJECT'];
const REASON_CODES = ['BELOW_THRESHOLD', 'ADVERSE_CIBIL', 'FIELD_PENDING', 'POLICY_EXCEPTION', 'OTHER'];
const SCORE_BANDS = ['SANCTION', 'RECONSIDER', 'REJECT', 'ALL'];
const TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
const TASK_TYPES = ['COLLECT_HOUSEHOLD', 'VERIFY_LAND', 'UPLOAD_INSURANCE', 'PHOTO_GEOTAG', 'FARMER_REQUESTED'];

/** 1. GET /trust/farmer/:farmerId/snapshot */
const getSnapshotParams = Joi.object({
  farmerId: Joi.number().integer().positive().required(),
});

/** 2. POST /trust/farmer/:farmerId/recompute */
const recomputeParams = Joi.object({
  farmerId: Joi.number().integer().positive().required(),
});
const recomputeBody = Joi.object({
  reason: Joi.string().trim().max(200).optional(),
});

/** 3. POST /trust/decisions */
const createDecisionBody = Joi.object({
  snapshotUuid: Joi.string().uuid().required()
    .messages({ 'string.guid': 'snapshotUuid must be a valid UUID' }),
  decision: Joi.string().valid(...DECISIONS).required(),
  reasonCode: Joi.string().valid(...REASON_CODES)
    .when('decision', { is: 'REJECT', then: Joi.required(), otherwise: Joi.optional() }),
  reasonText: Joi.string().trim().min(40).max(2000)
    .when('decision', { is: 'REJECT', then: Joi.required(), otherwise: Joi.optional() })
    .messages({ 'string.min': 'Reject reason must be at least 40 characters' }),
  cibilAcknowledged: Joi.boolean().default(false),
});

/** 4. GET /trust/portfolio */
const portfolioQuery = Joi.object({
  productId: Joi.number().integer().positive().optional(),
  village: Joi.string().trim().max(200).optional(),
  scoreBand: Joi.string().valid(...SCORE_BANDS).optional(),
  decision: Joi.string().valid(...DECISIONS).optional(),
  crop: Joi.string().trim().max(200).optional(),
  maxDataAgeDays: Joi.number().integer().min(1).max(365).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

/** 5. POST /trust/export/pdf */
const exportPdfBody = Joi.object({
  snapshotUuid: Joi.string().uuid().required()
    .messages({ 'string.guid': 'snapshotUuid must be a valid UUID' }),
});

/** 6. GET /sathi/tasks */
const sathiTasksQuery = Joi.object({
  status: Joi.string().valid(...TASK_STATUSES).optional(),
  village: Joi.string().trim().max(200).optional(),
  taskType: Joi.string().valid(...TASK_TYPES).optional(),
  dueBefore: Joi.date().iso().optional(),
});

/** 7. POST /sathi/tasks/:taskId/submit */
const submitTaskParams = Joi.object({
  taskId: Joi.number().integer().positive().required(),
});
const submitTaskBody = Joi.object({
  answers: Joi.object().required(),
  photoRef: Joi.string().trim().max(500).optional(),
  geotag: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }).optional(),
});

/** 8. POST /trust/farmer/:farmerId/request-data */
const requestDataParams = Joi.object({
  farmerId: Joi.number().integer().positive().required(),
});
const requestDataBody = Joi.object({
  missingPillars: Joi.array()
    .items(Joi.string().valid(...PILLAR_CODES))
    .min(1)
    .required(),
});

module.exports = {
  saveResponsesSchema,
  submitAppealSchema,
  upsertActivitiesSchema,
  createLiabilitySchema,
  updateLiabilitySchema,
  logRepaymentSchema,
  upsertExpenseSchema,
  // TRUST v2
  getSnapshotParams,
  recomputeParams,
  recomputeBody,
  createDecisionBody,
  portfolioQuery,
  exportPdfBody,
  sathiTasksQuery,
  submitTaskParams,
  submitTaskBody,
  requestDataParams,
  requestDataBody,
};
