/**
 * Readiness Controller
 * HTTP handling for loan-readiness endpoints. Zero business logic.
 */

const readinessService = require('../services/readinessService');
const { success } = require('../../../shared/utils/responseHelper');
const logger = require('../../../shared/utils/logger');

// Lazy-load to avoid circular deps
let _User;
const getUser = () => {
  if (!_User) _User = require('../../../shared/models').User;
  return _User;
};

let _AuditLog;
const getAuditLog = () => {
  if (!_AuditLog) _AuditLog = require('../../../shared/models').ReadinessDecisionAuditLog;
  return _AuditLog;
};

/**
 * Resolve the internal integer farmer ID from a UUID path param.
 * @param {string} farmerUuid - The UUID from the URL path
 * @returns {Promise<number>} Internal farmer PK
 */
const resolveFarmerByUuid = async (farmerUuid) => {
  const User = getUser();
  const user = await User.findOne({ where: { user_id: farmerUuid, is_active: true } });
  if (!user) {
    const err = new Error('Farmer not found');
    err.statusCode = 404;
    err.errorCode = 'READINESS_FARMER_NOT_FOUND';
    throw err;
  }
  return user.id;
};

/**
 * Resolve the authenticated user's internal integer PK.
 * @param {Object} req - Express request (req.user.id is the JWT UUID)
 * @returns {Promise<number>} Internal user PK
 */
const resolveAuthUserId = async (req) => {
  const User = getUser();
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return { internalId: user.id, userUuid: user.user_id };
};

/**
 * Map JWT role strings to the readiness role abstraction.
 * Sathi agents → 'sathi', bankers/admins → 'banker', everyone else → 'farmer'.
 */
const resolveRole = (req) => {
  const userRole = req.user.role;
  if (userRole === 'sathi_agent' || userRole === 'sathi') return 'sathi';
  if (['banker', 'admin', 'system_admin', 'super_admin', 'dice_admin', 'dice_analyst'].includes(userRole)) return 'banker';
  return 'farmer';
};

/**
 * GET /readiness/:farmerUuid
 * Returns role-shaped loan readiness for the specified farmer.
 * Farmers may only query their own UUID (403 otherwise).
 */
const getReadiness = async (req, res, next) => {
  try {
    const { farmerUuid } = req.params;
    const role = resolveRole(req);

    // Self-query guard: farmers can only view their own readiness
    if (role === 'farmer') {
      const { userUuid } = await resolveAuthUserId(req);
      if (userUuid !== farmerUuid) {
        const err = new Error('Farmers may only view their own readiness');
        err.statusCode = 403;
        err.errorCode = 'READINESS_SELF_ONLY';
        throw err;
      }
    }

    const farmerId = await resolveFarmerByUuid(farmerUuid);
    const showNumericScores = req.query.showNumericScores === 'true';

    const result = await readinessService.getLoanReadinessState(farmerId, {
      role,
      showNumericScores,
    });

    // Fire-and-forget audit log for banker views
    if (role === 'banker') {
      resolveAuthUserId(req)
        .then(({ internalId }) => {
          const AuditLog = getAuditLog();
          return AuditLog.create({
            farmer_id: farmerId,
            banker_user_id: internalId,
            trust_score: result.trust?.score ?? null,
            fhs_score: result.financialHealth?.score ?? null,
            matrix_cell: result.matrixCell ?? null,
            recommended_action: result.recommendedAction ?? null,
            scenarios_applied: null,
            ip: req.ip || req.connection?.remoteAddress || null,
            user_agent: req.headers?.['user-agent'] || null,
            viewed_at: new Date(),
          });
        })
        .catch((auditErr) => {
          logger.error('readiness: audit log write failed', { farmerId, error: auditErr.message });
        });
    }

    return success(res, { message: 'Loan readiness retrieved', data: result });
  } catch (err) { next(err); }
};

/**
 * GET /readiness/:farmerUuid/why
 * Returns drill-down: reasons, component contributions, next steps.
 * Same role projection rules as getReadiness.
 */
const getReadinessWhy = async (req, res, next) => {
  try {
    const { farmerUuid } = req.params;
    const role = resolveRole(req);

    // Self-query guard
    if (role === 'farmer') {
      const { userUuid } = await resolveAuthUserId(req);
      if (userUuid !== farmerUuid) {
        const err = new Error('Farmers may only view their own readiness');
        err.statusCode = 403;
        err.errorCode = 'READINESS_SELF_ONLY';
        throw err;
      }
    }

    const farmerId = await resolveFarmerByUuid(farmerUuid);

    const result = await readinessService.getReadinessWhy(farmerId, { role });

    return success(res, { message: 'Readiness drill-down retrieved', data: result });
  } catch (err) { next(err); }
};

// ─── Admin: Bank Product Config ──────────────────────────────────

let _configService;
const getConfigService = () => {
  if (!_configService) _configService = require('../services/bankProductConfigService');
  return _configService;
};

/**
 * PUT /readiness/admin/thresholds
 * Update cutoffs for a (bank, product) pair. Creates a new versioned row.
 */
const updateThresholds = async (req, res, next) => {
  try {
    const { internalId } = await resolveAuthUserId(req);
    const { bankId, productId, trustCutoff, fhsCutoff, reason } = req.body;

    const result = await getConfigService().updateThresholds({
      bankId,
      productId: productId || null,
      trustCutoff,
      fhsCutoff,
      reason,
      updatedBy: internalId,
    });

    return success(res, {
      message: 'Thresholds updated',
      data: result,
      statusCode: 200,
    });
  } catch (err) { next(err); }
};

/**
 * GET /readiness/admin/thresholds
 * Get active config for a (bank, product) pair.
 */
const getActiveConfig = async (req, res, next) => {
  try {
    const { bankId, productId } = req.query;
    const config = await getConfigService().getActiveConfig(Number(bankId), productId ? Number(productId) : null);

    if (!config) {
      const defaults = getConfigService().DEFAULT_THRESHOLDS;
      return success(res, {
        message: 'No custom config — using system defaults',
        data: { ...defaults, source: 'system', version: 0 },
      });
    }

    return success(res, { message: 'Active config retrieved', data: config });
  } catch (err) { next(err); }
};

/**
 * GET /readiness/admin/thresholds/history
 * Get version history for a (bank, product) pair.
 */
const getThresholdHistory = async (req, res, next) => {
  try {
    const { bankId, productId } = req.query;
    const history = await getConfigService().getHistory(Number(bankId), productId ? Number(productId) : null);

    return success(res, {
      message: 'Threshold history retrieved',
      data: history,
      meta: { total: history.length },
    });
  } catch (err) { next(err); }
};

// ─── Shadow telemetry: Sathi field-access logging ───────────────────

const config = require('../../../config');

/**
 * POST /readiness/telemetry
 * Receives field-access logs from the Sathi dashboard shadow release.
 * Logs entries via the structured logger so they appear in log aggregation.
 * Only active when sathiShadowLog flag is on.
 */
const receiveTelemetry = async (req, res, next) => {
  try {
    if (!config.features.readiness.sathiShadowLog) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const { entries } = req.body || {};
    if (!Array.isArray(entries) || entries.length === 0) {
      return success(res, { message: 'No entries', data: { accepted: 0 } });
    }

    // Classify fields as expected vs unexpected (FHS-related)
    const FHS_PATTERNS = /^(financialHealth|fhs|fhsScore|fhsGrade|fhsBreakdown|cashFlowStability|balanceAdequacy|incomeDiversity|debtDiscipline|govtTransferAccess|digitalAdoption|transactionCount|analysisMode|analysisUuid)/i;

    let expectedCount = 0;
    let unexpectedCount = 0;
    const unexpected = [];

    for (const entry of entries) {
      const field = entry.field || entry.path || '';
      if (FHS_PATTERNS.test(field)) {
        unexpectedCount++;
        unexpected.push(entry);
      } else {
        expectedCount++;
      }
    }

    // Always log a summary
    logger.info('readiness:telemetry:sathi', {
      total: entries.length,
      expected: expectedCount,
      unexpected: unexpectedCount,
      userAgent: req.headers?.['user-agent'] || null,
    });

    // Log details for unexpected (FHS) accesses — these are the signal we care about
    if (unexpected.length > 0) {
      logger.warn('readiness:telemetry:sathi:FHS_ACCESS_DETECTED', {
        count: unexpected.length,
        fields: unexpected.map(e => e.field || e.path),
        entries: unexpected.slice(0, 20), // Cap detail to prevent log bloat
      });
    }

    return success(res, {
      message: 'Telemetry accepted',
      data: { accepted: entries.length, expected: expectedCount, unexpected: unexpectedCount },
    });
  } catch (err) { next(err); }
};

module.exports = { getReadiness, getReadinessWhy, updateThresholds, getActiveConfig, getThresholdHistory, receiveTelemetry };
