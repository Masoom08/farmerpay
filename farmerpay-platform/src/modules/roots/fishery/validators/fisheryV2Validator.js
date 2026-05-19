/**
 * Fishery v2 Validators (financial logbook)
 * Joi schemas for the v2 fishery endpoints: profile, ponds, vessels, cost,
 * revenue, stocking, harvest, trips, treatment, recurring, weekly, P&L.
 */

const Joi = require('joi');

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'];
const SCOPES = ['FARM', 'POND', 'VESSEL', 'TRIP'];

const COST_CATEGORIES = [
  'LABOR', 'LICENSE', 'INSURANCE', 'EQUIPMENT', 'TRANSPORT', 'OTHER',
  'FINGERLINGS', 'FEED', 'POND_PREP', 'AERATION_ELECTRICITY',
  'WATER_MGMT', 'HARVEST_LABOR', 'HEALTH_TREATMENT',
  'FUEL', 'ICE', 'NETS_GEAR', 'BAIT', 'CREW_WAGES',
  'BOAT_MAINTENANCE', 'AUCTION_COMMISSION', 'LANDING_FEES',
  'POND_CONSTRUCTION', 'VESSEL_PURCHASE',
];

const REVENUE_CATEGORIES = [
  'FISH_SALE_WHOLESALE', 'FISH_SALE_AUCTION', 'FISH_SALE_DIRECT',
  'FISH_SALE_EXPORT', 'FISH_SALE_COOPERATIVE',
  'BYPRODUCT_SALE', 'POND_LEASE_INCOME', 'VESSEL_SALE',
  'INSURANCE_PAYOUT', 'SUBSIDY', 'OTHER',
];

const SPECIES_TYPES = ['CARP', 'CATFISH', 'TILAPIA', 'SHRIMP', 'PRAWN', 'ROHU', 'KATLA', 'PANGASIUS', 'OTHER'];

// ---------- Profile ----------
// All fields optional so the farm.tsx inline tier micro-prompt can upsert
// with just `{ tier }`. On first-ever profile create, the service defaults
// operationType to 'INLAND'. On updates, the service preserves the existing
// operation_type unless a new value is explicitly provided.
const upsertProfileSchema = Joi.object({
  operationType: Joi.string().valid('INLAND', 'SEA', 'BOTH').optional(),
  tier: Joi.string().valid('SMALL', 'MEDIUM', 'LARGE').optional(),
  entryMode: Joi.string().valid('TRANSACTIONAL', 'WEEKLY_BULK', 'MONTHLY_BULK').optional(),
  cooperativeName: Joi.string().max(120).allow('', null),
  cooperativeMemberId: Joi.string().max(50).allow('', null),
  primaryMarket: Joi.string().max(120).allow('', null),
  defaultPaymentMode: Joi.string().valid(...PAYMENT_MODES).optional(),
  currency: Joi.string().length(3).optional(),
});

// ---------- Ponds ----------
const addPondSchema = Joi.object({
  pondName: Joi.string().max(100).allow('', null),
  pondAreaHectares: Joi.number().precision(4).min(0).allow(null),
  pondDepthMeters: Joi.number().precision(2).min(0).allow(null),
  waterSource: Joi.string().valid('well', 'canal', 'river', 'rainwater', 'groundwater').allow(null),
  licenseType: Joi.string().max(50).allow('', null),
  licenseNumber: Joi.string().max(50).allow('', null),
  licenseIssuingAuthority: Joi.string().max(100).allow('', null),
  licenseExpiryDate: Joi.date().iso().allow(null),
  constructionDate: Joi.date().iso().allow(null),
  constructionCost: Joi.number().precision(2).min(0).allow(null),
  constructionCostFormal: Joi.number().precision(2).min(0).allow(null),
  constructionCostInformal: Joi.number().precision(2).min(0).allow(null),
  paymentMode: Joi.string().valid(...PAYMENT_MODES).allow(null),
  currentCycleStartDate: Joi.date().iso().allow(null),
  currentSpecies: Joi.string().max(80).allow('', null),
  expectedHarvestDate: Joi.date().iso().allow(null),
  notes: Joi.string().allow('', null),
});

const updatePondSchema = Joi.object({
  pondName: Joi.string().max(100).allow('', null),
  pondAreaHectares: Joi.number().precision(4).min(0).allow(null),
  pondDepthMeters: Joi.number().precision(2).min(0).allow(null),
  waterSource: Joi.string().valid('well', 'canal', 'river', 'rainwater', 'groundwater').allow(null),
  currentCycleStartDate: Joi.date().iso().allow(null),
  currentSpecies: Joi.string().max(80).allow('', null),
  expectedHarvestDate: Joi.date().iso().allow(null),
  notes: Joi.string().allow('', null),
}).min(1);

const exitPondSchema = Joi.object({
  exitDate: Joi.date().iso().required(),
  exitReason: Joi.string().max(50).allow('', null),
});

// ---------- Vessels ----------
const addVesselSchema = Joi.object({
  vesselName: Joi.string().max(100).allow('', null),
  registrationNumber: Joi.string().max(50).allow('', null),
  vesselType: Joi.string().valid('CATAMARAN', 'MECHANIZED_BOAT', 'TRAWLER', 'CANOE', 'OTHER').default('MECHANIZED_BOAT'),
  lengthMeters: Joi.number().precision(2).min(0).allow(null),
  engineHp: Joi.number().integer().min(0).allow(null),
  fuelType: Joi.string().valid('DIESEL', 'PETROL', 'KEROSENE', 'NONE').allow(null),
  crewSize: Joi.number().integer().min(0).allow(null),
  licenseType: Joi.string().max(50).allow('', null),
  licenseNumber: Joi.string().max(50).allow('', null),
  licenseExpiry: Joi.date().iso().allow(null),
  homePort: Joi.string().max(120).allow('', null),
  purchaseDate: Joi.date().iso().allow(null),
  purchaseCost: Joi.number().precision(2).min(0).allow(null),
  purchaseCostFormal: Joi.number().precision(2).min(0).allow(null),
  purchaseCostInformal: Joi.number().precision(2).min(0).allow(null),
  paymentMode: Joi.string().valid(...PAYMENT_MODES).allow(null),
  acquisitionMode: Joi.string().valid('PURCHASED', 'INHERITED', 'GIFTED', 'LEASED').allow(null),
  primaryPhotoUrl: Joi.string().max(500).allow('', null),
  notes: Joi.string().allow('', null),
});

const updateVesselSchema = Joi.object({
  vesselName: Joi.string().max(100).allow('', null),
  registrationNumber: Joi.string().max(50).allow('', null),
  vesselType: Joi.string().valid('CATAMARAN', 'MECHANIZED_BOAT', 'TRAWLER', 'CANOE', 'OTHER'),
  lengthMeters: Joi.number().precision(2).min(0).allow(null),
  engineHp: Joi.number().integer().min(0).allow(null),
  fuelType: Joi.string().valid('DIESEL', 'PETROL', 'KEROSENE', 'NONE').allow(null),
  crewSize: Joi.number().integer().min(0).allow(null),
  homePort: Joi.string().max(120).allow('', null),
  licenseType: Joi.string().max(50).allow('', null),
  licenseNumber: Joi.string().max(50).allow('', null),
  licenseExpiry: Joi.date().iso().allow(null),
  primaryPhotoUrl: Joi.string().max(500).allow('', null),
  notes: Joi.string().allow('', null),
}).min(1);

const exitVesselSchema = Joi.object({
  exitReason: Joi.string().valid('SOLD', 'LOST', 'SCRAPPED').required(),
  exitDate: Joi.date().iso().required(),
  exitValue: Joi.number().precision(2).min(0).allow(null),
  buyerName: Joi.string().max(120).allow('', null),
});

// ---------- Cost Events ----------
const createCostEventSchema = Joi.object({
  eventDate: Joi.date().iso().required(),
  scope: Joi.string().valid(...SCOPES).default('FARM'),
  pondId: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
  vesselId: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
  tripId: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
  category: Joi.string().valid(...COST_CATEGORIES).required(),
  subcategory: Joi.string().max(50).allow('', null),
  quantity: Joi.number().precision(2).min(0).allow(null),
  unit: Joi.string().max(20).allow('', null),
  unitPrice: Joi.number().precision(2).min(0).allow(null),
  amount: Joi.number().precision(2).min(0).allow(null),
  amountFormal: Joi.number().precision(2).min(0).default(0),
  amountInformal: Joi.number().precision(2).min(0).default(0),
  paymentMode: Joi.string().valid(...PAYMENT_MODES).allow(null),
  vendorName: Joi.string().max(120).allow('', null),
  notes: Joi.string().allow('', null),
});

const confirmPendingEventSchema = Joi.object({
  amount: Joi.number().precision(2).min(0).optional(),
  amountFormal: Joi.number().precision(2).min(0).optional(),
  amountInformal: Joi.number().precision(2).min(0).optional(),
  notes: Joi.string().allow('', null),
});

// ---------- Revenue Events ----------
const createRevenueEventSchema = Joi.object({
  eventDate: Joi.date().iso().required(),
  scope: Joi.string().valid(...SCOPES).default('FARM'),
  pondId: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
  vesselId: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
  tripId: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
  category: Joi.string().valid(...REVENUE_CATEGORIES).required(),
  species: Joi.string().max(50).allow('', null),
  quantityKg: Joi.number().precision(2).min(0).allow(null),
  avgWeightGrams: Joi.number().precision(2).min(0).allow(null),
  ratePerKg: Joi.number().precision(2).min(0).allow(null),
  amount: Joi.number().precision(2).min(0).allow(null),
  amountFormal: Joi.number().precision(2).min(0).default(0),
  amountInformal: Joi.number().precision(2).min(0).default(0),
  buyerName: Joi.string().max(120).allow('', null),
  buyerType: Joi.string().valid('WHOLESALER', 'AUCTION', 'DIRECT', 'EXPORTER', 'COOPERATIVE', 'RESTAURANT', 'OTHER').allow(null),
  paymentMode: Joi.string().valid(...PAYMENT_MODES).allow(null),
  landingPort: Joi.string().max(120).allow('', null),
  notes: Joi.string().allow('', null),
});

// ---------- Stocking ----------
const createStockingSchema = Joi.object({
  pondId: Joi.string().uuid({ version: 'uuidv4' }).required(),
  stockingDate: Joi.date().iso().required(),
  speciesName: Joi.string().max(80).required(),
  speciesType: Joi.string().valid(...SPECIES_TYPES).default('OTHER'),
  fingerlingsCount: Joi.number().integer().min(1).required(),
  costPerFingerling: Joi.number().precision(2).min(0).allow(null),
  totalCost: Joi.number().precision(2).min(0).allow(null),
  costFormal: Joi.number().precision(2).min(0).default(0),
  costInformal: Joi.number().precision(2).min(0).default(0),
  paymentMode: Joi.string().valid(...PAYMENT_MODES).allow(null),
  supplierName: Joi.string().max(120).allow('', null),
  expectedSurvivalRate: Joi.number().precision(2).min(0).max(100).allow(null),
  expectedHarvestDate: Joi.date().iso().allow(null),
  notes: Joi.string().allow('', null),
});

// ---------- Harvest ----------
const createHarvestSchema = Joi.object({
  pondId: Joi.string().uuid({ version: 'uuidv4' }).required(),
  stockingEventUuid: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
  harvestDate: Joi.date().iso().required(),
  totalKg: Joi.number().precision(2).min(0).required(),
  avgWeightGrams: Joi.number().precision(2).min(0).allow(null),
  survivalPct: Joi.number().precision(2).min(0).max(100).allow(null),
  lossPct: Joi.number().precision(2).min(0).max(100).allow(null),
  lossReason: Joi.string().max(100).allow('', null),
  harvestMethod: Joi.string().valid('FULL_HARVEST', 'PARTIAL_HARVEST', 'THINNING').default('FULL_HARVEST'),
  laborCost: Joi.number().precision(2).min(0).allow(null),
  species: Joi.string().max(50).allow('', null),
  saleAmount: Joi.number().precision(2).min(0).allow(null),
  saleCategory: Joi.string().valid(...REVENUE_CATEGORIES).allow(null),
  ratePerKg: Joi.number().precision(2).min(0).allow(null),
  buyerName: Joi.string().max(120).allow('', null),
  buyerType: Joi.string().valid('WHOLESALER', 'AUCTION', 'DIRECT', 'EXPORTER', 'COOPERATIVE', 'RESTAURANT', 'OTHER').allow(null),
  paymentMode: Joi.string().valid(...PAYMENT_MODES).allow(null),
  notes: Joi.string().allow('', null),
});

// ---------- Trip ----------
const createTripSchema = Joi.object({
  vesselId: Joi.string().uuid({ version: 'uuidv4' }).required(),
  departDate: Joi.date().iso().required(),
  departTime: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).allow(null),
  returnDate: Joi.date().iso().allow(null),
  returnTime: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).allow(null),
  tripHours: Joi.number().precision(2).min(0).allow(null),
  fuelLiters: Joi.number().precision(2).min(0).allow(null),
  fuelCost: Joi.number().precision(2).min(0).default(0),
  iceKg: Joi.number().precision(2).min(0).allow(null),
  iceCost: Joi.number().precision(2).min(0).default(0),
  baitCost: Joi.number().precision(2).min(0).default(0),
  crewCount: Joi.number().integer().min(0).allow(null),
  crewWagesTotal: Joi.number().precision(2).min(0).default(0),
  otherCost: Joi.number().precision(2).min(0).default(0),
  catchTotalKg: Joi.number().precision(2).min(0).allow(null),
  catchSpeciesMix: Joi.array().items(Joi.object({
    species: Joi.string().max(50).required(),
    kg: Joi.number().precision(2).min(0).required(),
  })).allow(null),
  landingPort: Joi.string().max(120).allow('', null),
  saleAmount: Joi.number().precision(2).min(0).allow(null),
  saleBuyer: Joi.string().max(120).allow('', null),
  saleBuyerType: Joi.string().valid('WHOLESALER', 'AUCTION', 'DIRECT', 'EXPORTER', 'COOPERATIVE', 'RESTAURANT', 'OTHER').allow(null),
  auctionCommission: Joi.number().precision(2).min(0).default(0),
  costFormal: Joi.number().precision(2).min(0).default(0),
  costInformal: Joi.number().precision(2).min(0).default(0),
  paymentMode: Joi.string().valid(...PAYMENT_MODES).allow(null),
  status: Joi.string().valid('IN_PROGRESS', 'COMPLETED', 'ABORTED').default('COMPLETED'),
  notes: Joi.string().allow('', null),
});

// ---------- Treatment ----------
const createTreatmentSchema = Joi.object({
  pondId: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
  treatmentDate: Joi.date().iso().required(),
  condition: Joi.string().max(200).allow('', null),
  treatmentType: Joi.string().valid(
    'DISEASE_TREATMENT', 'PROPHYLACTIC', 'WATER_TREATMENT',
    'PROBIOTIC', 'ANTIBIOTIC', 'PARASITE', 'NUTRITIONAL', 'OTHER',
  ).default('OTHER'),
  affectedSpecies: Joi.string().max(80).allow('', null),
  mortalityBeforePct: Joi.number().precision(2).min(0).max(100).allow(null),
  mortalityAfterPct: Joi.number().precision(2).min(0).max(100).allow(null),
  vetName: Joi.string().max(120).allow('', null),
  vetType: Joi.string().valid('GOVT', 'PRIVATE', 'PARAVET', 'SELF').allow(null),
  medicineCost: Joi.number().precision(2).min(0).default(0),
  vetFee: Joi.number().precision(2).min(0).default(0),
  otherCost: Joi.number().precision(2).min(0).default(0),
  costFormal: Joi.number().precision(2).min(0).default(0),
  costInformal: Joi.number().precision(2).min(0).default(0),
  paymentMode: Joi.string().valid(...PAYMENT_MODES).allow(null),
  outcome: Joi.string().valid('RECOVERED', 'IMPROVING', 'NO_CHANGE', 'WORSENED', 'TOTAL_LOSS').allow(null),
  notes: Joi.string().allow('', null),
});

// ---------- Recurring ----------
const createTemplateSchema = Joi.object({
  templateName: Joi.string().max(120).required(),
  scope: Joi.string().valid('FARM', 'POND', 'VESSEL').default('FARM'),
  pondId: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
  vesselId: Joi.string().uuid({ version: 'uuidv4' }).allow(null),
  category: Joi.string().valid(...COST_CATEGORIES).required(),
  defaultAmount: Joi.number().precision(2).min(0).required(),
  defaultQuantity: Joi.number().precision(2).min(0).allow(null),
  defaultUnit: Joi.string().max(20).allow('', null),
  defaultVendor: Joi.string().max(120).allow('', null),
  defaultPaymentMode: Joi.string().valid(...PAYMENT_MODES).allow(null),
  frequency: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY').required(),
  dayOfPeriod: Joi.number().integer().min(1).max(31).allow(null),
  nextDueDate: Joi.date().iso().required(),
});

// ---------- Weekly summary ----------
const upsertWeeklySummarySchema = Joi.object({
  weekStartDate: Joi.date().iso().required(),
  weekEndDate: Joi.date().iso().required(),
  totalFeedCost: Joi.number().precision(2).min(0).default(0),
  totalFingerlingCost: Joi.number().precision(2).min(0).default(0),
  totalPondLaborCost: Joi.number().precision(2).min(0).default(0),
  totalAerationCost: Joi.number().precision(2).min(0).default(0),
  totalHealthCost: Joi.number().precision(2).min(0).default(0),
  totalFuelCost: Joi.number().precision(2).min(0).default(0),
  totalIceCost: Joi.number().precision(2).min(0).default(0),
  totalCrewWages: Joi.number().precision(2).min(0).default(0),
  totalGearCost: Joi.number().precision(2).min(0).default(0),
  totalMaintenanceCost: Joi.number().precision(2).min(0).default(0),
  totalOtherCost: Joi.number().precision(2).min(0).default(0),
  totalFishKg: Joi.number().precision(2).min(0).default(0),
  totalFishRevenue: Joi.number().precision(2).min(0).default(0),
  totalOtherRevenue: Joi.number().precision(2).min(0).default(0),
  notes: Joi.string().allow('', null),
});

// ---------- P&L query ----------
const pnlQuerySchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
});

module.exports = {
  upsertProfileSchema,
  addPondSchema, updatePondSchema, exitPondSchema,
  addVesselSchema, updateVesselSchema, exitVesselSchema,
  createCostEventSchema, confirmPendingEventSchema,
  createRevenueEventSchema,
  createStockingSchema, createHarvestSchema, createTripSchema,
  createTreatmentSchema,
  createTemplateSchema,
  upsertWeeklySummarySchema,
  pnlQuerySchema,
};
