/**
 * DRISHTI Household Service
 *
 * Full CRUD for household income sources and expenses, plus rich aggregation
 * that powers the Household Portfolio engine.
 *
 * Aggregates the complete household economy:
 *  Income: spouse SHG, wage labor, MGNREGA, pension, remittances, petty business,
 *          govt transfers (PM-KISAN/DBT), rental, other
 *  Expenses: food, education, healthcare, housing, social obligations,
 *            transportation, utilities, non-farm loan EMIs, clothing, other
 *
 * All amounts are normalized to monthly equivalents for consistent comparison.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { setWithTTL, getKey, deleteKeys } = require('../../../config/redis');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const SUMMARY_CACHE_TTL = 1800; // 30 minutes

// ─── Income Source CRUD ─────────────────────────────────────────────

const getIncomeSources = async (farmerId, query = {}) => {
  const { DrishtiHouseholdIncomeSource } = getDb();
  const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');
  const { page, limit, offset } = parsePagination(query);

  const where = { farmer_id: farmerId };
  if (query.is_active !== undefined) where.is_active = query.is_active;
  else where.is_active = true;

  const { count, rows } = await DrishtiHouseholdIncomeSource.findAndCountAll({
    where, limit, offset,
    order: [['source_type', 'ASC'], ['amount_monthly_equivalent', 'DESC']],
  });

  const items = rows.map(mapIncomeSourceToDto);
  return { items, meta: buildMeta(page, limit, count) };
};

const upsertIncomeSource = async (farmerId, data, userId) => {
  const { DrishtiHouseholdIncomeSource, sequelize: seq } = getDb();
  const transaction = await seq.transaction();

  try {
    const monthlyEquivalent = normalizeToMonthly(data.amount, data.frequency);

    // Check if an active source of this type + earning_member exists → update it
    const existing = await DrishtiHouseholdIncomeSource.findOne({
      where: {
        farmer_id: farmerId,
        source_type: data.source_type,
        earning_member: data.earning_member,
        is_active: true,
      },
      transaction,
    });

    let record;
    if (existing) {
      await existing.update({
        ...data,
        amount_monthly_equivalent: monthlyEquivalent,
      }, { transaction });
      record = existing;
      logger.info(`DRISHTI: updated income source ${existing.source_uuid} for farmer ${farmerId}`);
    } else {
      record = await DrishtiHouseholdIncomeSource.create({
        source_uuid: generateUUID(),
        farmer_id: farmerId,
        ...data,
        amount_monthly_equivalent: monthlyEquivalent,
      }, { transaction });
      logger.info(`DRISHTI: created income source ${record.source_uuid} for farmer ${farmerId}`);
    }

    await transaction.commit();
    await invalidateSummaryCache(farmerId);
    return mapIncomeSourceToDto(record);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

// ─── Expense CRUD ───────────────────────────────────────────────────

const getExpenses = async (farmerId, query = {}) => {
  const { DrishtiHouseholdExpense } = getDb();
  const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');
  const { page, limit, offset } = parsePagination(query);

  const where = { farmer_id: farmerId };
  if (query.is_active !== undefined) where.is_active = query.is_active;
  else where.is_active = true;

  const { count, rows } = await DrishtiHouseholdExpense.findAndCountAll({
    where, limit, offset,
    order: [['category', 'ASC']],
  });

  const items = rows.map(mapExpenseToDto);
  return { items, meta: buildMeta(page, limit, count) };
};

const upsertExpense = async (farmerId, data, userId) => {
  const { DrishtiHouseholdExpense, sequelize: seq } = getDb();
  const transaction = await seq.transaction();

  try {
    const monthlyEquivalent = normalizeToMonthly(data.amount, data.frequency);

    // Check if an active expense of this category exists → update it
    const existing = await DrishtiHouseholdExpense.findOne({
      where: { farmer_id: farmerId, category: data.category, is_active: true },
      transaction,
    });

    let record;
    if (existing) {
      await existing.update({
        ...data,
        amount_monthly_equivalent: monthlyEquivalent,
      }, { transaction });
      record = existing;
      logger.info(`DRISHTI: updated expense ${existing.expense_uuid} for farmer ${farmerId}`);
    } else {
      record = await DrishtiHouseholdExpense.create({
        expense_uuid: generateUUID(),
        farmer_id: farmerId,
        ...data,
        amount_monthly_equivalent: monthlyEquivalent,
      }, { transaction });
      logger.info(`DRISHTI: created expense ${record.expense_uuid} for farmer ${farmerId}`);
    }

    await transaction.commit();
    await invalidateSummaryCache(farmerId);
    return mapExpenseToDto(record);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

// ─── Household Summary (Full Aggregation) ───────────────────────────

/**
 * Returns the complete household financial profile:
 *  - All income sources with per-type aggregation
 *  - All expense categories with per-category aggregation
 *  - Totals, surplus/deficit, earning member breakdown
 *  - Data for the householdIncomeProjector / householdExpenseProjector
 */
const getHouseholdSummary = async (farmerId) => {
  const cacheKey = `drishti:household_summary:${farmerId}`;

  try {
    const cached = await getKey(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (_) { /* cache miss */ }

  const { DrishtiHouseholdIncomeSource, DrishtiHouseholdExpense } = getDb();

  const [incomeSources, expenses] = await Promise.all([
    DrishtiHouseholdIncomeSource.findAll({ where: { farmer_id: farmerId, is_active: true } }),
    DrishtiHouseholdExpense.findAll({ where: { farmer_id: farmerId, is_active: true } }),
  ]);

  // ── Income aggregation ──
  const incomeByType = {};
  const incomeByMember = {};
  let totalMonthlyIncome = 0;

  for (const s of incomeSources) {
    const monthly = parseFloat(s.amount_monthly_equivalent) || 0;
    totalMonthlyIncome += monthly;

    const type = s.source_type;
    if (!incomeByType[type]) incomeByType[type] = { monthly: 0, sources: [] };
    incomeByType[type].monthly += monthly;
    incomeByType[type].sources.push(mapIncomeSourceToDto(s));

    const member = s.earning_member;
    if (!incomeByMember[member]) incomeByMember[member] = 0;
    incomeByMember[member] += monthly;
  }

  // ── Expense aggregation ──
  const expenseByCategory = {};
  let totalMonthlyExpense = 0;

  for (const e of expenses) {
    const monthly = parseFloat(e.amount_monthly_equivalent) || 0;
    totalMonthlyExpense += monthly;

    const cat = e.category;
    if (!expenseByCategory[cat]) expenseByCategory[cat] = { monthly: 0, items: [] };
    expenseByCategory[cat].monthly += monthly;
    expenseByCategory[cat].items.push(mapExpenseToDto(e));
  }

  // ── Earning member analysis ──
  const earningMembers = [...new Set(incomeSources.map(s => s.earning_member))];
  const familyMembersCount = Math.max(earningMembers.length, 1);

  // Detect spouse occupation
  const spouseEntries = incomeSources.filter(s => s.earning_member === 'spouse');
  const spouseOccupation = spouseEntries.length > 0
    ? spouseEntries.map(s => s.source_label || s.source_type).join(', ')
    : null;

  // Detect farmer's non-farm occupation
  const farmerNonFarm = incomeSources.find(
    s => s.earning_member === 'farmer' && !['mgnrega', 'govt_transfer'].includes(s.source_type)
  );

  const summary = {
    income: {
      sources: incomeSources.map(mapIncomeSourceToDto),
      by_type: incomeByType,
      by_member: incomeByMember,
      total_monthly: round2(totalMonthlyIncome),
      total_annual: round2(totalMonthlyIncome * 12),
      stream_count: incomeSources.length,
      // Structured for snapshot builder
      income_streams: incomeSources.map(s => ({
        source: s.source_type,
        label: s.source_label,
        earning_member: s.earning_member,
        amount_monthly: parseFloat(s.amount_monthly_equivalent) || 0,
        frequency: s.frequency,
        reliability: s.reliability,
        active_months: s.active_months,
      })),
    },
    expenses: {
      items: expenses.map(mapExpenseToDto),
      by_category: expenseByCategory,
      total_monthly: round2(totalMonthlyExpense),
      total_annual: round2(totalMonthlyExpense * 12),
      category_count: expenses.length,
      // Structured for snapshot builder
      expense_categories: expenses.map(e => ({
        category: e.category,
        label: e.category_label,
        monthly: parseFloat(e.amount_monthly_equivalent) || 0,
        frequency: e.frequency,
        peak_months: e.peak_months,
        peak_amount: parseFloat(e.peak_amount) || 0,
      })),
    },
    household_context: {
      earning_members: earningMembers,
      earning_members_count: earningMembers.length,
      family_members_count: familyMembersCount,
      spouse_occupation: spouseOccupation,
      primary_non_farm_occupation: farmerNonFarm ? (farmerNonFarm.source_label || farmerNonFarm.source_type) : null,
    },
    totals: {
      monthly_income: round2(totalMonthlyIncome),
      monthly_expense: round2(totalMonthlyExpense),
      monthly_surplus: round2(totalMonthlyIncome - totalMonthlyExpense),
      annual_income: round2(totalMonthlyIncome * 12),
      annual_expense: round2(totalMonthlyExpense * 12),
      annual_surplus: round2((totalMonthlyIncome - totalMonthlyExpense) * 12),
    },
  };

  try {
    await setWithTTL(cacheKey, JSON.stringify(summary), SUMMARY_CACHE_TTL);
  } catch (_) { /* cache write failure is non-critical */ }

  return summary;
};

// ─── Bulk Upsert (for Sathi field visit collection flow) ────────────

/**
 * Upsert multiple income sources at once during a Sathi data collection session.
 */
const bulkUpsertIncomeSources = async (farmerId, sources, userId) => {
  const results = [];
  for (const source of sources) {
    const result = await upsertIncomeSource(farmerId, source, userId);
    results.push(result);
  }
  return results;
};

/**
 * Upsert multiple expenses at once.
 */
const bulkUpsertExpenses = async (farmerId, expenseList, userId) => {
  const results = [];
  for (const expense of expenseList) {
    const result = await upsertExpense(farmerId, expense, userId);
    results.push(result);
  }
  return results;
};

// ─── Deactivation ───────────────────────────────────────────────────

const deactivateIncomeSource = async (farmerId, sourceUuid, userId) => {
  const { DrishtiHouseholdIncomeSource } = getDb();
  const source = await DrishtiHouseholdIncomeSource.findOne({
    where: { farmer_id: farmerId, source_uuid: sourceUuid, is_active: true },
  });
  if (!source) {
    const err = new Error('Income source not found');
    err.statusCode = 404;
    err.errorCode = 'DRISHTI_INCOME_NOT_FOUND';
    throw err;
  }
  await source.update({ is_active: false });
  await invalidateSummaryCache(farmerId);
  logger.info(`DRISHTI: deactivated income source ${sourceUuid} for farmer ${farmerId}`);
  return { sourceUuid, deactivated: true };
};

const deactivateExpense = async (farmerId, expenseUuid, userId) => {
  const { DrishtiHouseholdExpense } = getDb();
  const expense = await DrishtiHouseholdExpense.findOne({
    where: { farmer_id: farmerId, expense_uuid: expenseUuid, is_active: true },
  });
  if (!expense) {
    const err = new Error('Expense not found');
    err.statusCode = 404;
    err.errorCode = 'DRISHTI_EXPENSE_NOT_FOUND';
    throw err;
  }
  await expense.update({ is_active: false });
  await invalidateSummaryCache(farmerId);
  logger.info(`DRISHTI: deactivated expense ${expenseUuid} for farmer ${farmerId}`);
  return { expenseUuid, deactivated: true };
};

// ─── DTO Mappers ────────────────────────────────────────────────────

const mapIncomeSourceToDto = (s) => ({
  sourceUuid: s.source_uuid,
  sourceType: s.source_type,
  sourceLabel: s.source_label,
  earningMember: s.earning_member,
  earningMemberName: s.earning_member_name,
  amount: parseFloat(s.amount) || 0,
  frequency: s.frequency,
  amountMonthlyEquivalent: parseFloat(s.amount_monthly_equivalent) || 0,
  activeMonths: s.active_months,
  reliability: s.reliability,
  shgName: s.shg_name,
  shgMonthlySaving: parseFloat(s.shg_monthly_saving) || null,
  shgLoanOutstanding: parseFloat(s.shg_loan_outstanding) || null,
  shgMemberSince: s.shg_member_since,
  verifiedBySathi: s.verified_by_sathi,
  verifiedAt: s.verified_at,
  confidenceLevel: s.confidence_level,
  isActive: s.is_active,
});

const mapExpenseToDto = (e) => ({
  expenseUuid: e.expense_uuid,
  category: e.category,
  categoryLabel: e.category_label,
  amount: parseFloat(e.amount) || 0,
  frequency: e.frequency,
  amountMonthlyEquivalent: parseFloat(e.amount_monthly_equivalent) || 0,
  peakMonths: e.peak_months,
  peakAmount: parseFloat(e.peak_amount) || null,
  notes: e.notes,
  verifiedBySathi: e.verified_by_sathi,
  confidenceLevel: e.confidence_level,
  isActive: e.is_active,
});

// ─── Helpers ────────────────────────────────────────────────────────

const normalizeToMonthly = (amount, frequency) => {
  const amt = parseFloat(amount) || 0;
  switch (frequency) {
    case 'daily': return round2(amt * 30);
    case 'weekly': return round2(amt * 4.33);
    case 'monthly': return amt;
    case 'quarterly': return round2(amt / 3);
    case 'seasonal': return round2(amt / 4);
    case 'annual': return round2(amt / 12);
    case 'irregular': return round2(amt / 12);
    default: return amt;
  }
};

const invalidateSummaryCache = async (farmerId) => {
  try {
    await deleteKeys([`drishti:household_summary:${farmerId}`]);
  } catch (_) { /* non-critical */ }
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = {
  getIncomeSources,
  upsertIncomeSource,
  getExpenses,
  upsertExpense,
  getHouseholdSummary,
  bulkUpsertIncomeSources,
  bulkUpsertExpenses,
  deactivateIncomeSource,
  deactivateExpense,
  normalizeToMonthly,
};
