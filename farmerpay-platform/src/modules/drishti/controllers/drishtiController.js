/**
 * DRISHTI Controller
 * Handles all scenario simulation, household data, template, and benchmark endpoints.
 * Contains zero business logic — resolves user, delegates to services, formats responses.
 */

const drishtiService = require('../services/drishtiService');
const householdService = require('../services/householdService');
const benchmarkService = require('../services/benchmarkService');
const { success } = require('../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../shared/constants/statusCodes');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.errorCode = 'DRISHTI_USER_NOT_FOUND';
    throw err;
  }
  return user.id;
};

// ─── Scenario Engines ───────────────────────────────────────────────

/** POST /scenarios/pre-loan */
const runPreLoan = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await drishtiService.runScenario('pre_loan', req.body, userId, req.user.role);
    return success(res, { message: 'Pre-loan scenario completed', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** POST /scenarios/household-portfolio */
const runHouseholdPortfolio = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await drishtiService.runScenario('household_portfolio', req.body, userId, req.user.role);
    return success(res, { message: 'Household portfolio scenario completed', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** POST /scenarios/climate-stress */
const runClimateStress = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await drishtiService.runScenario('climate_stress', req.body, userId, req.user.role);
    return success(res, { message: 'Climate stress scenario completed', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** POST /scenarios/insurance */
const runInsurance = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await drishtiService.runScenario('insurance', req.body, userId, req.user.role);
    return success(res, { message: 'Insurance scenario completed', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** POST /scenarios/market-timing */
const runMarketTiming = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await drishtiService.runScenario('market_timing', req.body, userId, req.user.role);
    return success(res, { message: 'Market timing scenario completed', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** POST /scenarios/banker-portfolio */
const runBankerPortfolio = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await drishtiService.runBankerPortfolio(req.body, userId);
    return success(res, { message: 'Portfolio simulation queued', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

// ─── Scenario Queries ───────────────────────────────────────────────

/** GET /scenarios/:runUuid */
const getScenarioByUuid = async (req, res, next) => {
  try {
    const result = await drishtiService.getScenarioByUuid(req.params.runUuid);
    return success(res, { message: 'Scenario retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /scenarios/farmer/:farmerId */
const getScenariosByFarmer = async (req, res, next) => {
  try {
    const result = await drishtiService.getScenariosByFarmer(
      parseInt(req.params.farmerId, 10),
      req.query
    );
    return success(res, {
      message: 'Farmer scenarios retrieved',
      data: result.items,
      meta: result.meta,
    });
  } catch (err) { next(err); }
};

/** POST /scenarios/compare */
const compareScenarios = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await drishtiService.compareScenarios(req.body, userId);
    return success(res, { message: 'Scenario comparison created', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** GET /scenarios/comparison/:compUuid */
const getComparison = async (req, res, next) => {
  try {
    const result = await drishtiService.getComparison(req.params.compUuid);
    return success(res, { message: 'Comparison retrieved', data: result });
  } catch (err) { next(err); }
};

// ─── Templates ──────────────────────────────────────────────────────

/** GET /templates */
const getTemplates = async (req, res, next) => {
  try {
    const result = await drishtiService.getTemplates(req.query);
    return success(res, { message: 'Templates retrieved', data: result.items, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /templates/:engineType */
const getTemplatesByEngine = async (req, res, next) => {
  try {
    const result = await drishtiService.getTemplatesByEngine(req.params.engineType);
    return success(res, { message: 'Templates retrieved', data: result });
  } catch (err) { next(err); }
};

// ─── Benchmarks ─────────────────────────────────────────────────────

/** GET /benchmarks/:districtId */
const getBenchmarks = async (req, res, next) => {
  try {
    const result = await benchmarkService.getBenchmarks(parseInt(req.params.districtId, 10));
    return success(res, { message: 'Benchmarks retrieved', data: result });
  } catch (err) { next(err); }
};

// ─── Portfolio Runs (Banker) ────────────────────────────────────────

/** GET /portfolio-runs/:runUuid */
const getPortfolioRun = async (req, res, next) => {
  try {
    const result = await drishtiService.getPortfolioRun(req.params.runUuid);
    return success(res, { message: 'Portfolio run retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /portfolio-runs/:runUuid/farmers */
const getPortfolioRunFarmers = async (req, res, next) => {
  try {
    const result = await drishtiService.getPortfolioRunFarmers(req.params.runUuid, req.query);
    return success(res, {
      message: 'Portfolio farmer results retrieved',
      data: result.items,
      meta: result.meta,
    });
  } catch (err) { next(err); }
};

// ─── Household Income CRUD ──────────────────────────────────────────

/** GET /household/:farmerId/income */
const getHouseholdIncome = async (req, res, next) => {
  try {
    const result = await householdService.getIncomeSources(
      parseInt(req.params.farmerId, 10),
      req.query
    );
    return success(res, { message: 'Income sources retrieved', data: result.items, meta: result.meta });
  } catch (err) { next(err); }
};

/** POST /household/:farmerId/income */
const upsertHouseholdIncome = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await householdService.upsertIncomeSource(
      parseInt(req.params.farmerId, 10),
      req.body,
      userId
    );
    return success(res, { message: 'Income source saved', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** GET /household/:farmerId/expenses */
const getHouseholdExpenses = async (req, res, next) => {
  try {
    const result = await householdService.getExpenses(
      parseInt(req.params.farmerId, 10),
      req.query
    );
    return success(res, { message: 'Expenses retrieved', data: result.items, meta: result.meta });
  } catch (err) { next(err); }
};

/** POST /household/:farmerId/expenses */
const upsertHouseholdExpense = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await householdService.upsertExpense(
      parseInt(req.params.farmerId, 10),
      req.body,
      userId
    );
    return success(res, { message: 'Expense saved', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** GET /household/:farmerId/summary */
const getHouseholdSummary = async (req, res, next) => {
  try {
    const result = await householdService.getHouseholdSummary(
      parseInt(req.params.farmerId, 10)
    );
    return success(res, { message: 'Household summary retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /scenarios/:runUuid/share */
const getShareableSummary = async (req, res, next) => {
  try {
    const result = await drishtiService.getShareableSummary(req.params.runUuid, {
      language: req.query.language || 'en',
      sendSms: req.query.send_sms === 'true',
      recipientPhone: req.query.phone || null,
    });
    return success(res, { message: 'Shareable summary generated', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  // Engines
  runPreLoan,
  runHouseholdPortfolio,
  runClimateStress,
  runInsurance,
  runMarketTiming,
  runBankerPortfolio,
  // Scenario queries
  getScenarioByUuid,
  getScenariosByFarmer,
  compareScenarios,
  getComparison,
  getShareableSummary,
  // Templates
  getTemplates,
  getTemplatesByEngine,
  // Benchmarks
  getBenchmarks,
  // Portfolio runs
  getPortfolioRun,
  getPortfolioRunFarmers,
  // Household CRUD
  getHouseholdIncome,
  upsertHouseholdIncome,
  getHouseholdExpenses,
  upsertHouseholdExpense,
  getHouseholdSummary,
};
