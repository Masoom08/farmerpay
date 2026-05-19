/**
 * AA Controller — Handles HTTP requests for Account Aggregator endpoints.
 * Zero business logic — delegates to services and formats responses.
 */

const aaConsentService = require('../services/aaConsentService');
const aaDataFetchService = require('../services/aaDataFetchService');
const aaCrossModuleBridge = require('../services/aaCrossModuleBridge');
const { runAnalysis, getLatestAnalysis, getAnalysisHistory: getHistory } = require('../services/aaAnalysisOrchestrator');
const { success } = require('../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../shared/constants/statusCodes');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

// ──────────────────────────────────────────────
// Consent Lifecycle
// ──────────────────────────────────────────────

/** POST /aa/consent — Initiate AA consent */
const initiateConsent = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await aaConsentService.initiateConsent(farmerId, req.body);
    return success(res, {
      message: 'AA consent initiated',
      data: result,
      statusCode: STATUS_CODES.CREATED,
    });
  } catch (err) { next(err); }
};

/** GET /aa/consent — Get farmer's current consent status */
const getConsentStatus = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await aaConsentService.getConsentForFarmer(farmerId);
    return success(res, { message: 'Consent status retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /aa/consent/:consentUuid — Check specific consent */
const checkConsent = async (req, res, next) => {
  try {
    const result = await aaConsentService.checkConsentStatus(req.params.consentUuid);
    return success(res, { message: 'Consent status checked', data: result });
  } catch (err) { next(err); }
};

/** DELETE /aa/consent — Revoke active consent */
const revokeConsent = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await aaConsentService.revokeConsent(farmerId);
    return success(res, { message: 'Consent revoked', data: result });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────────
// Webhooks (from AA providers)
// ──────────────────────────────────────────────

/** POST /aa/webhook/:provider — Receive AA provider callbacks */
const handleWebhook = async (req, res, next) => {
  try {
    const result = await aaConsentService.processWebhook(req.params.provider, req.body, req.headers);
    return success(res, { message: 'Webhook processed', data: result });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────────
// Data Fetch & Refresh
// ──────────────────────────────────────────────

/** POST /aa/fetch — Trigger manual data fetch for an approved consent */
const triggerDataFetch = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const consent = await aaConsentService.getConsentForFarmer(farmerId);

    if (!consent || consent.status !== 'approved') {
      const err = new Error('No approved consent found. Initiate consent first.');
      err.statusCode = 400;
      err.errorCode = 'AA_CONSENT_NOT_APPROVED';
      throw err;
    }

    // Find the AaConsent record
    const { AaConsent } = require('../../../shared/models');
    const consentRecord = await AaConsent.findOne({
      where: { consent_uuid: consent.consentUuid, consent_status: 'approved' },
    });

    const result = await aaDataFetchService.fetchAndStore(
      consentRecord.id, farmerId, consentRecord.aa_provider
    );
    return success(res, { message: 'Data fetch completed', data: result });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────────
// Analysis & Intelligence (Layer 2 + 3)
// ──────────────────────────────────────────────

/** GET /aa/analysis — Get full financial analysis */
const getAnalysis = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const callerRole = req.user.role;
    const result = await aaCrossModuleBridge.getAnalysis(farmerId, null, { callerRole });

    if (!result) {
      const err = new Error('No AA data available. Complete consent and data fetch first.');
      err.statusCode = 404;
      err.errorCode = 'AA_NO_DATA';
      throw err;
    }

    return success(res, { message: 'Financial analysis retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /aa/analysis/health-score — Get financial health score */
const getHealthScore = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const callerRole = req.user.role;
    const result = await aaCrossModuleBridge.getAnalysis(farmerId, null, { callerRole });

    if (!result) {
      return success(res, { message: 'No AA data', data: { score: null, grade: 'N/A', available: false } });
    }

    return success(res, {
      message: 'Financial health score retrieved',
      data: {
        score: result.score,
        grade: result.grade,
        components: result.components,
        available: true,
      },
    });
  } catch (err) { next(err); }
};

/** GET /aa/bridge/:module — Get module-specific AA data */
const getModuleData = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const moduleName = req.params.module;
    const callerRole = req.user.role;

    const bridges = {
      trust: aaCrossModuleBridge.getTrustInputs,
      drishti: aaCrossModuleBridge.getDrishtiInputs,
      sentinel: aaCrossModuleBridge.getSentinelInputs,
      dice: aaCrossModuleBridge.getDiceInputs,
      sathi: aaCrossModuleBridge.getSathiInputs,
    };

    const bridgeFn = bridges[moduleName];
    if (!bridgeFn) {
      const err = new Error(`Invalid module: ${moduleName}`);
      err.statusCode = 400;
      err.errorCode = 'AA_INVALID_MODULE';
      throw err;
    }

    const result = await bridgeFn(farmerId, { callerRole });
    if (!result) {
      return success(res, { message: 'No AA data available', data: null });
    }

    return success(res, {
      message: `AA data for ${moduleName} retrieved`,
      data: result,
    });
  } catch (err) { next(err); }
};

/** GET /aa/providers — List available AA providers */
const listProviders = async (req, res, next) => {
  try {
    const { listProviders: getProviders } = require('../../../integrations/accountAggregator');
    const result = getProviders();
    return success(res, { message: 'AA providers listed', data: result, meta: { total: result.length } });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────────
// Analysis V2 Endpoints
// ──────────────────────────────────────────────

/** GET /aa/analysis/history — Paginated past analyses */
const getAnalysisHistory = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await getHistory(farmerId, req.query);
    return success(res, { message: 'Analysis history retrieved', data: result.items, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /aa/analysis/transactions — Paginated classified transactions */
const getTransactions = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const { AaTransaction } = require('../../../shared/models');
    const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');
    const { Op } = require('sequelize');

    const { page, limit, offset } = parsePagination(req.query);
    const where = { farmer_id: farmerId, is_active: true };

    if (req.query.type) where.txn_type = req.query.type;
    if (req.query.category) {
      where[Op.or] = [
        { income_category: req.query.category },
        { expense_category: req.query.category },
      ];
    }
    if (req.query.fromDate || req.query.toDate) {
      where.txn_date = {};
      if (req.query.fromDate) where.txn_date[Op.gte] = req.query.fromDate;
      if (req.query.toDate) where.txn_date[Op.lte] = req.query.toDate;
    }

    const { count, rows } = await AaTransaction.findAndCountAll({
      where, limit, offset,
      order: [['txn_date', 'DESC']],
    });

    const data = rows.map(t => ({
      transactionUuid: t.transaction_uuid,
      txnDate: t.txn_date,
      txnType: t.txn_type,
      amount: parseFloat(t.amount),
      balanceAfter: t.balance_after ? parseFloat(t.balance_after) : null,
      narration: t.narration,
      reference: t.reference,
      mode: t.mode,
      incomeCategory: t.income_category,
      expenseCategory: t.expense_category,
      classificationConfidence: t.classification_confidence ? parseFloat(t.classification_confidence) : null,
    }));

    return success(res, { message: 'Transactions retrieved', data, meta: buildMeta(page, limit, count) });
  } catch (err) { next(err); }
};

/** POST /aa/analysis/refresh — Trigger re-analysis */
const refreshAnalysis = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);

    // Load existing transactions from DB if available
    const { AaTransaction } = require('../../../shared/models');
    const existingTxns = await AaTransaction.findAll({
      where: { farmer_id: farmerId, is_active: true },
      order: [['txn_date', 'DESC']],
      raw: true,
    });

    // Map DB rows back to the format analyzers expect
    const transactions = existingTxns.length > 0 ? existingTxns.map(t => ({
      narration: t.narration,
      amount: parseFloat(t.amount),
      type: t.txn_type === 'credit' ? 'CREDIT' : 'DEBIT',
      txnDate: t.txn_date,
      currentBalance: t.balance_after ? parseFloat(t.balance_after) : 0,
      mode: t.mode,
      reference: t.reference,
    })) : null;

    const result = await runAnalysis(farmerId, transactions);
    if (!result) {
      const err = new Error('No AA data available for analysis');
      err.statusCode = 404;
      err.errorCode = 'AA_NO_DATA';
      throw err;
    }

    return success(res, { message: 'Analysis refreshed', data: result });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────────
// Admin / Banker Endpoints
// ──────────────────────────────────────────────

/** GET /aa/admin/stats — AA adoption stats */
const getAdminStats = async (req, res, next) => {
  try {
    const { AaConsent, AaFinancialAnalysis, sequelize: seq } = require('../../../shared/models');
    const { fn, col, literal } = require('sequelize');

    // Replaced raw SQL with the ORM builder. The previous template strings
    // were incidentally safe (no interpolation) but each future edit was
    // one `${filter}` away from an injection. ORM-only removes that risk.
    const [consentRow] = await AaConsent.findAll({
      where: { is_active: true },
      attributes: [
        [fn('COUNT', col('*')), 'total_consents'],
        [fn('SUM', literal("CASE WHEN consent_status = 'approved' THEN 1 ELSE 0 END")), 'approved'],
        [fn('SUM', literal("CASE WHEN consent_status = 'requested' THEN 1 ELSE 0 END")), 'pending'],
        [fn('SUM', literal("CASE WHEN consent_status = 'rejected' THEN 1 ELSE 0 END")), 'rejected'],
        [fn('SUM', literal("CASE WHEN consent_status = 'revoked' THEN 1 ELSE 0 END")), 'revoked'],
        [fn('SUM', literal("CASE WHEN consent_status = 'expired' THEN 1 ELSE 0 END")), 'expired'],
      ],
      raw: true,
    });

    const [analysisRow] = await AaFinancialAnalysis.findAll({
      where: { is_active: true, is_latest: true },
      attributes: [
        [fn('COUNT', col('*')), 'total_analyses'],
        [fn('AVG', col('health_score')), 'avg_score'],
        [fn('COUNT', fn('DISTINCT', col('farmer_id'))), 'farmers_analyzed'],
        [fn('SUM', literal("CASE WHEN analysis_mode = 'raw_transactions' THEN 1 ELSE 0 END")), 'full_analyses'],
        [fn('SUM', literal("CASE WHEN analysis_mode = 'summary_fallback' THEN 1 ELSE 0 END")), 'summary_analyses'],
      ],
      raw: true,
    });

    const gradeDistribution = await AaFinancialAnalysis.findAll({
      where: { is_active: true, is_latest: true },
      attributes: [
        'health_grade',
        [fn('COUNT', col('*')), 'count'],
      ],
      group: ['health_grade'],
      order: [['health_grade', 'ASC']],
      raw: true,
    });

    return success(res, {
      message: 'AA stats retrieved',
      data: {
        consents: consentRow || {},
        analyses: analysisRow || {},
        gradeDistribution,
      },
    });
  } catch (err) { next(err); }
};

/** GET /aa/admin/farmer/:farmerId/analysis — Banker views farmer's analysis */
const getFarmerAnalysis = async (req, res, next) => {
  try {
    const farmerId = parseInt(req.params.farmerId, 10);

    // Non-admin bankers are scoped to farmers whose loan applications they
    // touched (reviewed_by / checker_id). Admins are unrestricted. This is
    // AA's version of the same IDOR guard we apply in SENTINEL; when a
    // dedicated banker-to-farmer assignment model lands, swap this for it.
    if (req.user?.role !== 'admin' && req.user?.role !== 'ADMIN') {
      const { User, LoanApplication } = require('../../../shared/models');
      const banker = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
      if (!banker) {
        const err = new Error('Banker not found'); err.statusCode = 404; throw err;
      }
      const touched = await LoanApplication.findOne({
        where: {
          farmer_id: farmerId,
          is_active: true,
          [require('sequelize').Op.or]: [
            { reviewed_by: banker.id },
            { checker_id: banker.id },
          ],
        },
      });
      if (!touched) {
        const err = new Error('Forbidden: farmer is outside your portfolio');
        err.statusCode = 403;
        err.errorCode = 'AA_FARMER_FORBIDDEN';
        throw err;
      }
      // Audit trail for banker AA accesses — regulatory requirement.
      require('../../../shared/utils/logger').info('aa.banker_access', {
        bankerId: banker.id, farmerId, ip: req.ip,
      });
    }

    const result = await getLatestAnalysis(farmerId);
    if (!result) {
      const err = new Error('No analysis found for this farmer');
      err.statusCode = 404;
      err.errorCode = 'AA_NO_ANALYSIS';
      throw err;
    }

    return success(res, { message: 'Farmer analysis retrieved', data: result });
  } catch (err) { next(err); }
};

/** POST /aa/admin/bulk-analysis — Queue batch re-analysis via RabbitMQ */
const triggerBulkAnalysis = async (req, res, next) => {
  try {
    const { farmerIds } = req.body;
    const { publishToQueue } = require('../../../config/rabbitmq');

    let queued = 0;
    for (const farmerId of farmerIds) {
      try {
        await publishToQueue('aa.analysis.batch', { farmerId });
        queued++;
      } catch (queueErr) {
        // Log but don't fail the entire batch
        const logger = require('../../../shared/utils/logger');
        logger.error(`[AAAdmin] Failed to queue analysis for farmer ${farmerId}:`, queueErr.message);
      }
    }

    return success(res, {
      message: `Bulk analysis queued for ${queued}/${farmerIds.length} farmers`,
      data: { queued, total: farmerIds.length },
      statusCode: STATUS_CODES.ACCEPTED,
    });
  } catch (err) { next(err); }
};

module.exports = {
  initiateConsent,
  getConsentStatus,
  checkConsent,
  revokeConsent,
  handleWebhook,
  triggerDataFetch,
  getAnalysis,
  getHealthScore,
  getModuleData,
  listProviders,
  getAnalysisHistory,
  getTransactions,
  refreshAnalysis,
  getAdminStats,
  getFarmerAnalysis,
  triggerBulkAnalysis,
};
