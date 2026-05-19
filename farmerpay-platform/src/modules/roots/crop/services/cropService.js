/**
 * Crop Service
 * Business logic for crop knowledge base: crops, varieties, practices, inputs.
 * Uses Redis caching (7-day TTL) for static knowledge data.
 */

const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');
const { setWithTTL, getKey } = require('../../../../config/redis');
const { parsePagination, buildMeta } = require('../../../../shared/utils/paginationHelper');

const CACHE_TTL = 604800; // 7 days

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

/**
 * Gets crops with optional filters, translation, and caching.
 * @param {Object} filters - { category, season }
 * @param {Object} query - { page, limit }
 * @param {string} language - Language code
 * @returns {Promise<Object>}
 */
const getCrops = async (filters = {}, query = {}, language = 'en') => {
  const { CropMaster, CropTranslation } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const where = { is_active: true };
  if (filters.category) where.crop_group = { [Op.like]: `%${filters.category}%` };
  if (filters.season) where.ideal_season = filters.season;

  const include = language !== 'en' ? [{
    model: CropTranslation, as: 'translations',
    where: { language_code: language }, required: false,
  }] : [];

  const { count, rows } = await CropMaster.findAndCountAll({
    where, include, limit, offset, order: [['crop_name', 'ASC']],
  });

  const crops = rows.map((c) => ({
    // numeric primary key — needed by callers like the loan-journey
    // wizard which has to look up scale_of_finances rows by integer
    // crop_id (the SoF FK is INTEGER, not UUID).
    cropPk: c.id,
    cropId: c.crop_id, cropCode: c.crop_code,
    cropName: (c.translations?.[0]?.crop_name_translated) || c.crop_name,
    cropGroup: c.crop_group, botanicalName: c.botanical_name,
    durationMin: c.crop_duration_days_min, durationMax: c.crop_duration_days_max,
    season: c.ideal_season, waterRequirement: c.water_requirement_mm,
    isAnnual: c.is_annual, isPerennial: c.is_perennial,
  }));

  return { crops, meta: buildMeta(page, limit, count) };
};

/**
 * Gets varieties for a crop.
 * @param {string} cropId - Crop UUID
 * @param {Object} query - Pagination
 * @returns {Promise<Object>}
 */
const getVarieties = async (cropId, query = {}) => {
  const { VarietyMaster } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const { count, rows } = await VarietyMaster.findAndCountAll({
    where: { crop_id: cropId, is_active: true },
    limit, offset, order: [['variety_name', 'ASC']],
  });

  const varieties = rows.map((v) => ({
    varietyId: v.variety_id, varietyName: v.variety_name, varietyCode: v.variety_code,
    description: v.variety_description, durationMin: v.duration_days_min, durationMax: v.duration_days_max,
    expectedYield: v.expected_yield_kg_per_hectare, seedCompany: v.seed_company,
    isHybrid: v.is_hybrid, seedTreatment: v.seed_treatment_recommended,
  }));

  return { varieties, meta: buildMeta(page, limit, count) };
};

/**
 * Gets regional suitability for a variety.
 * @param {string} varietyId
 * @param {number} [stateId] - Optional state filter
 * @returns {Promise<Array>}
 */
const getVarietySuitability = async (varietyId, stateId) => {
  const { VarietyRegionalSuitability } = getDb();
  const where = { variety_id: varietyId, is_active: true };
  if (stateId) where.state_id = stateId;

  return VarietyRegionalSuitability.findAll({ where, order: [['suitability', 'ASC']] });
};

/**
 * Gets trait assignments for a variety.
 * @param {string} varietyId
 * @returns {Promise<Array>}
 */
const getVarietyTraits = async (varietyId) => {
  const { VarietyTraitAssignment, Trait } = getDb();
  const assignments = await VarietyTraitAssignment.findAll({
    where: { variety_id: varietyId, is_active: true },
    include: [{ model: Trait, as: 'trait', attributes: ['trait_name', 'trait_category', 'measurement_unit'] }],
  });

  return assignments.map((a) => ({
    traitName: a.trait?.trait_name, traitCategory: a.trait?.trait_category,
    traitValue: a.trait_value, traitRating: a.trait_rating, unit: a.trait?.measurement_unit,
  }));
};

/**
 * Searches Package of Practices with filters.
 * @param {Object} filters - { cropId, varietyId, soilTypeId, stateId }
 * @param {Object} query - Pagination
 * @returns {Promise<Object>}
 */
const searchPractices = async (filters = {}, query = {}) => {
  const { PackageOfPractice, PopCostBenchmark } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const where = { is_active: true };
  if (filters.cropId) where.crop_id = filters.cropId;
  if (filters.varietyId) where.variety_id = filters.varietyId;
  if (filters.soilTypeId) where.soil_type_id = filters.soilTypeId;
  if (filters.stateId) where.state_id = filters.stateId;

  const { count, rows } = await PackageOfPractice.findAndCountAll({
    where, limit, offset,
    include: [{ model: PopCostBenchmark, as: 'costBenchmarks', where: { is_active: true }, required: false }],
    order: [['pop_name', 'ASC']],
  });

  const practices = rows.map((p) => ({
    popId: p.pop_uuid, popName: p.pop_name, description: p.pop_description,
    version: p.version, isCertified: p.is_certified,
    totalCost: p.costBenchmarks?.reduce((sum, cb) => sum + parseFloat(cb.estimated_cost_per_hectare || 0), 0),
  }));

  return { practices, meta: buildMeta(page, limit, count) };
};

/**
 * Gets full Package of Practice details with workbands, tasks, and inputs.
 * @param {string} popUuid
 * @returns {Promise<Object>}
 */
const getPracticeDetail = async (popUuid) => {
  const { PackageOfPractice, PopWorkband, PopTask, PopTaskInput, PopCostBenchmark, Organization } = getDb();

  const pop = await PackageOfPractice.findOne({
    where: { pop_uuid: popUuid, is_active: true },
    include: [
      { model: Organization, as: 'recommendedBy', attributes: ['org_name', 'org_type'], required: false },
      {
        model: PopWorkband, as: 'workbands', where: { is_active: true }, required: false,
        order: [['workband_order', 'ASC']],
        include: [{
          model: PopTask, as: 'tasks', where: { is_active: true }, required: false,
          order: [['task_order', 'ASC']],
          include: [{ model: PopTaskInput, as: 'inputs', where: { is_active: true }, required: false }],
        }],
      },
      { model: PopCostBenchmark, as: 'costBenchmarks', where: { is_active: true }, required: false },
    ],
  });

  if (!pop) {
    const err = new Error('Package of Practice not found');
    err.statusCode = 404; err.errorCode = 'RES_001';
    throw err;
  }

  return pop;
};

/**
 * Gets input items with optional filters.
 * @param {Object} filters - { category, search, isOrganic }
 * @param {Object} query - Pagination
 * @param {string} language - Language code
 * @returns {Promise<Object>}
 */
const getInputs = async (filters = {}, query = {}, language = 'en') => {
  const { InputItem, InputCategory, InputUnit, InputTranslation } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const where = { is_active: true };
  if (filters.search) where.item_name = { [Op.like]: `%${filters.search}%` };
  if (filters.isOrganic !== undefined) where.is_organic = filters.isOrganic === 'true';

  const include = [
    { model: InputCategory, as: 'category', attributes: ['category_name', 'category_code'], ...(filters.category ? { where: { category_code: filters.category } } : {}) },
    { model: InputUnit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] },
  ];

  if (language !== 'en') {
    include.push({ model: InputTranslation, as: 'translations', where: { language_code: language }, required: false });
  }

  const { count, rows } = await InputItem.findAndCountAll({
    where, include, limit, offset, order: [['item_name', 'ASC']],
  });

  const items = rows.map((i) => ({
    itemId: i.item_uuid, itemCode: i.item_code,
    itemName: (i.translations?.[0]?.item_name_translated) || i.item_name,
    category: i.category?.category_name, manufacturer: i.manufacturer,
    activeIngredient: i.active_ingredient, unit: i.unit?.unit_name,
    isOrganic: i.is_organic,
  }));

  return { items, meta: buildMeta(page, limit, count) };
};

/**
 * Gets packs and prices for an input item.
 * @param {string} itemUuid
 * @param {number} [stateId] - Optional state filter for prices
 * @returns {Promise<Array>}
 */
const getInputPacks = async (itemUuid, stateId) => {
  const { InputPack, InputPackPrice, InputUnit } = getDb();

  const packs = await InputPack.findAll({
    where: { item_id: itemUuid, is_active: true },
    include: [
      { model: InputUnit, as: 'sizeUnit', attributes: ['unit_name', 'unit_symbol'] },
      {
        model: InputPackPrice, as: 'prices',
        where: { is_active: true, ...(stateId ? { state_id: stateId } : {}) },
        required: false,
      },
    ],
  });

  return packs.map((p) => ({
    packId: p.pack_uuid, packSize: `${p.pack_size_value} ${p.sizeUnit?.unit_name || ''}`.trim(),
    quantity: p.pack_quantity, price: p.pack_price_rupees, isRetail: p.is_retail_pack,
    distributor: p.distributor_name,
    statePrices: p.prices?.map((pr) => ({
      stateId: pr.state_id, marketPrice: pr.market_price_rupees,
      wholesalePrice: pr.wholesale_price_rupees, recordedDate: pr.price_recorded_date,
    })),
  }));
};

module.exports = { getCrops, getVarieties, getVarietySuitability, getVarietyTraits, searchPractices, getPracticeDetail, getInputs, getInputPacks };
