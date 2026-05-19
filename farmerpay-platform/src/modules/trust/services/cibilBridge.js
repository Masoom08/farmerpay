/**
 * CIBIL Bridge — TRUST v2
 * Read-only wrapper for credit bureau data (SENTINEL module).
 * Never writes to sentinel tables.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Fetches the latest CIBIL report for a farmer.
 * @param {number} farmerId
 * @returns {Promise<{ flag: boolean, overdueInr: number|null, issuer: string|null }>}
 */
// CIBIL reports are regulated artefacts: every read must be audit-logged,
// and stale reports (>90 days) must not be blindly reused because the
// consent window they were pulled under may have lapsed.
const CIBIL_FRESHNESS_DAYS = 90;

const getCibilStatus = async (farmerId) => {
  try {
    const { CreditBureauReport } = getDb();
    if (!CreditBureauReport) {
      return { flag: false, overdueInr: null, issuer: null };
    }

    const report = await CreditBureauReport.findOne({
      where: { farmer_id: farmerId, bureau_name: 'cibil', is_active: true },
      order: [['created_at', 'DESC']],
    });

    if (!report) {
      return { flag: false, overdueInr: null, issuer: null };
    }

    // Consent audit: the CIBIL report row ties consent_id + consent_timestamp
    // to the pull. If either is missing, the report was ingested without a
    // recorded consent trail — refuse to use it for scoring.
    if (!report.consent_id || !report.consent_timestamp) {
      logger.warn(`[TRUST/cibil] Report for farmer ${farmerId} lacks consent trail; skipping`);
      return { flag: false, overdueInr: null, issuer: null };
    }

    const ageDays = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > CIBIL_FRESHNESS_DAYS) {
      logger.warn(`[TRUST/cibil] Report for farmer ${farmerId} is stale (${Math.round(ageDays)}d); not used`);
      return { flag: false, overdueInr: null, issuer: null, stale: true };
    }

    const overdueInr = parseFloat(report.total_overdue_amount || 0);
    const flag = overdueInr > 0;
    const issuer = report.overdue_issuer || null;

    // Append-only access log — regulators require that every CIBIL read be
    // traceable to a calling service and timestamp, independent of the
    // mutable CreditBureauReport row.
    logger.info('trust.cibil_read', {
      event: 'trust.cibil_read',
      farmerId,
      reportUuid: report.report_uuid || report.id,
      consentId: report.consent_id,
      reportAgeDays: Math.round(ageDays),
    });

    return { flag, overdueInr: flag ? overdueInr : null, issuer };
  } catch (err) {
    logger.warn(`[TRUST/cibil] Failed to fetch CIBIL for farmer ${farmerId}: ${err.message}`);
    return { flag: false, overdueInr: null, issuer: null };
  }
};

module.exports = { getCibilStatus };
