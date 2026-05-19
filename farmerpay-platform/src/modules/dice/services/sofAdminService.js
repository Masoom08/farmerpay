/**
 * SoF Admin Service
 * CRUD operations for Scale of Finance records (admin-only).
 */

const { Op } = require('sequelize');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const logger = require('../../../shared/utils/logger');
const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Creates a new Scale of Finance entry.
 * Enforces district + crop + season + financial_year uniqueness.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
const createSofEntry = async (data) => {
  const { ScaleOfFinance } = getDb();

  // Validate uniqueness
  const existing = await ScaleOfFinance.findOne({
    where: {
      district_id: data.districtId,
      crop_id: data.cropId,
      season: data.season,
      financial_year: data.financialYear,
      is_active: true,
    },
  });

  if (existing) {
    const err = new Error('SoF entry already exists for this district + crop + season + financial year');
    err.statusCode = 409;
    err.errorCode = 'SOF_001';
    throw err;
  }

  const record = await ScaleOfFinance.create({
    sof_uuid: generateUUID(),
    district_id: data.districtId,
    crop_id: data.cropId,
    season: data.season,
    financial_year: data.financialYear,
    cost_per_hectare: data.costPerHectare,
    seed_cost: data.seedCost || null,
    fertilizer_cost: data.fertilizerCost || null,
    pesticide_cost: data.pesticideCost || null,
    labour_cost: data.labourCost || null,
    machinery_cost: data.machineryCost || null,
    irrigation_cost: data.irrigationCost || null,
    other_cost: data.otherCost || null,
    approved_by: data.approvedBy || null,
    approved_date: data.approvedDate || new Date(),
    source: data.source || 'DLTC',
  });

  logger.info(`SoF entry created: id=${record.id}, district=${data.districtId}, crop=${data.cropId}`);

  return {
    sofId: record.id,
    sofUuid: record.sof_uuid,
    districtId: record.district_id,
    cropId: record.crop_id,
    season: record.season,
    financialYear: record.financial_year,
    costPerHectare: record.cost_per_hectare,
  };
};

/**
 * Updates an existing SoF entry.
 * @param {number} sofId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
const updateSofEntry = async (sofId, data) => {
  const { ScaleOfFinance } = getDb();

  const record = await ScaleOfFinance.findOne({
    where: { id: sofId, is_active: true },
  });

  if (!record) {
    const err = new Error('Scale of Finance entry not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const updateFields = {};
  if (data.costPerHectare !== undefined) updateFields.cost_per_hectare = data.costPerHectare;
  if (data.seedCost !== undefined) updateFields.seed_cost = data.seedCost;
  if (data.fertilizerCost !== undefined) updateFields.fertilizer_cost = data.fertilizerCost;
  if (data.pesticideCost !== undefined) updateFields.pesticide_cost = data.pesticideCost;
  if (data.labourCost !== undefined) updateFields.labour_cost = data.labourCost;
  if (data.machineryCost !== undefined) updateFields.machinery_cost = data.machineryCost;
  if (data.irrigationCost !== undefined) updateFields.irrigation_cost = data.irrigationCost;
  if (data.otherCost !== undefined) updateFields.other_cost = data.otherCost;
  if (data.approvedBy !== undefined) updateFields.approved_by = data.approvedBy;
  if (data.approvedDate !== undefined) updateFields.approved_date = data.approvedDate;
  if (data.source !== undefined) updateFields.source = data.source;

  await record.update(updateFields);

  logger.info(`SoF entry updated: id=${sofId}`);

  return {
    sofId: record.id,
    sofUuid: record.sof_uuid,
    districtId: record.district_id,
    cropId: record.crop_id,
    season: record.season,
    financialYear: record.financial_year,
    costPerHectare: record.cost_per_hectare,
  };
};

/**
 * Lists SoF entries with filters and pagination.
 * @param {Object} filters - { districtId, cropId, season, financialYear }
 * @param {Object} pagination - { page, limit }
 * @returns {Promise<Object>}
 */
const listSofEntries = async (filters = {}, pagination = {}) => {
  const { ScaleOfFinance } = getDb();

  const where = { is_active: true };
  if (filters.districtId) where.district_id = filters.districtId;
  if (filters.cropId) where.crop_id = filters.cropId;
  if (filters.season) where.season = filters.season;
  if (filters.financialYear) where.financial_year = filters.financialYear;

  const { page, limit, offset } = parsePagination(pagination);

  const { count, rows } = await ScaleOfFinance.findAndCountAll({
    where,
    order: [['financial_year', 'DESC'], ['district_id', 'ASC'], ['crop_id', 'ASC']],
    limit,
    offset,
  });

  const data = rows.map((r) => ({
    sofId: r.id,
    sofUuid: r.sof_uuid,
    districtId: r.district_id,
    cropId: r.crop_id,
    season: r.season,
    financialYear: r.financial_year,
    costPerHectare: r.cost_per_hectare,
    seedCost: r.seed_cost,
    fertilizerCost: r.fertilizer_cost,
    pesticideCost: r.pesticide_cost,
    labourCost: r.labour_cost,
    machineryCost: r.machinery_cost,
    irrigationCost: r.irrigation_cost,
    otherCost: r.other_cost,
    source: r.source,
    approvedDate: r.approved_date,
  }));

  return {
    entries: data,
    meta: buildMeta(page, limit, count),
  };
};

/**
 * Returns year-over-year SoF comparison for a given district + crop.
 * @param {number} districtId
 * @param {number} cropId
 * @returns {Promise<Object>}
 */
const getSofHistory = async (districtId, cropId) => {
  const { ScaleOfFinance } = getDb();

  const records = await ScaleOfFinance.findAll({
    where: {
      district_id: districtId,
      crop_id: cropId,
      is_active: true,
    },
    order: [['financial_year', 'ASC']],
  });

  const history = records.map((r) => ({
    financialYear: r.financial_year,
    season: r.season,
    costPerHectare: r.cost_per_hectare,
    seedCost: r.seed_cost,
    fertilizerCost: r.fertilizer_cost,
    pesticideCost: r.pesticide_cost,
    labourCost: r.labour_cost,
    machineryCost: r.machinery_cost,
    irrigationCost: r.irrigation_cost,
    otherCost: r.other_cost,
    source: r.source,
  }));

  // Calculate YoY change percentages
  const comparison = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    const change = prev.costPerHectare > 0
      ? parseFloat((((curr.costPerHectare - prev.costPerHectare) / prev.costPerHectare) * 100).toFixed(2))
      : null;

    comparison.push({
      fromYear: prev.financialYear,
      toYear: curr.financialYear,
      previousCost: prev.costPerHectare,
      currentCost: curr.costPerHectare,
      changePercent: change,
    });
  }

  return {
    districtId,
    cropId,
    history,
    yoyComparison: comparison,
  };
};

module.exports = {
  createSofEntry,
  updateSofEntry,
  listSofEntries,
  getSofHistory,
};
