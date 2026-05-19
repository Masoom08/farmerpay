/**
 * Sentinel Service
 * Portfolio overview and aggregate health metrics for bank users.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Retrieves portfolio overview with loan health summaries.
 */
const getPortfolio = async (filters = {}) => {
  const { LoanHealthSnapshot, SmaClassificationLog, LoanApplication, sequelize } = getDb();

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  // Respect the `date` filter accepted by the validator — snapshots on or
  // before that point in time. Silently dropping it (as the prior code did)
  // produced misleading portfolio views that always used 'latest'.
  const snapshotWhere = { is_active: true };
  if (filters.date) {
    const cutoff = new Date(filters.date);
    if (Number.isFinite(cutoff.getTime())) {
      snapshotWhere.snapshot_date = { [Op.lte]: cutoff };
    }
  }

  // Scope to the requesting officer's portfolio. `reviewed_by` and
  // `checker_id` on LoanApplication are the only officer-linkage fields
  // available today; an officer's portfolio = applications they reviewed
  // or approved. If no bankUserId is passed, the caller must be an ADMIN
  // running a bank-wide view — the route-level roleCheck handles that gate.
  const applicationWhere = { is_active: true };
  if (filters.bankUserId) {
    const bankerId = parseInt(filters.bankUserId, 10);
    if (!Number.isNaN(bankerId)) {
      applicationWhere[Op.or] = [
        { reviewed_by: bankerId },
        { checker_id: bankerId },
      ];
    }
  } else {
    logger.warn(
      'sentinel.portfolio called without bankUserId filter — returning unscoped view. ' +
      'Expect ADMIN callers only.'
    );
  }

  // Get latest snapshots per application
  const snapshots = await LoanHealthSnapshot.findAll({
    where: snapshotWhere,
    include: [
      {
        model: LoanApplication,
        as: 'application',
        where: applicationWhere,
        required: true,
        attributes: ['id', 'farmer_id'],
      },
    ],
    order: [['snapshot_date', 'DESC']],
    limit,
    offset,
  });

  // Aggregate metrics using SQL grouping instead of loading all rows. Must
  // apply the same scope filter, otherwise counts would still leak the
  // bank-wide NPA ratio even when the list is scoped.
  const healthCounts = await LoanHealthSnapshot.findAll({
    where: snapshotWhere,
    include: [{
      model: LoanApplication, as: 'application',
      where: applicationWhere, required: true, attributes: [],
    }],
    attributes: [
      'health_status',
      [sequelize.fn('COUNT', sequelize.col('LoanHealthSnapshot.id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('total_outstanding')), 'total_outstanding'],
    ],
    group: ['health_status'],
    raw: true,
  });

  let totalNpa = 0;
  let totalSma = 0;
  let totalCount = 0;

  healthCounts.forEach((row) => {
    const cnt = parseInt(row.count, 10);
    totalCount += cnt;
    if (row.health_status === 'npa') totalNpa += cnt;
    if (['watch', 'stressed'].includes(row.health_status)) totalSma += cnt;
  });

  const portfolioData = snapshots.map((s) => ({
    applicationId: s.application_id,
    loanAmount: s.total_outstanding,
    daysOverdue: s.days_overdue,
    healthStatus: s.health_status,
    healthScore: s.health_score,
    snapshotDate: s.snapshot_date,
  }));

  return {
    data: portfolioData,
    meta: {
      totalNpa: totalCount > 0 ? ((totalNpa / totalCount) * 100).toFixed(2) : 0,
      totalSma: totalCount > 0 ? ((totalSma / totalCount) * 100).toFixed(2) : 0,
      portfolioHealth: totalCount > 0
        ? Math.round(((totalCount - totalNpa - totalSma) / totalCount) * 100)
        : 100,
      total: totalCount,
    },
  };
};

/**
 * Calculates a composite Loan Health Score (RSS — Risk Scoring System) for an application.
 * 4 components: financial_health (35%), agricultural_performance (25%),
 * market_conditions (20%), behavioral_engagement (20%).
 * Total 0-100. Bands: green (75+), yellow (50-74), orange (25-49), red (0-24).
 * Persists to RssScoreHistory.
 * @param {number} loanApplicationId
 * @returns {Promise<Object>}
 */
const calculateLoanHealthScore = async (loanApplicationId) => {
  const {
    LoanApplication,
    LoanHealthSnapshot,
    RssScoreHistory,
  } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: loanApplicationId, is_active: true },
  });
  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // --- 1. Financial Health (35%) ---
  // Sub-components: repayment behavior + loan utilization
  const snapshot = await LoanHealthSnapshot.findOne({
    where: { application_id: loanApplicationId, is_active: true },
    order: [['snapshot_date', 'DESC']],
  });

  let repaymentScore = 80; // default if no snapshot
  if (snapshot) {
    const daysOverdue = snapshot.days_overdue || 0;
    if (daysOverdue === 0) repaymentScore = 100;
    else if (daysOverdue <= 30) repaymentScore = 70;
    else if (daysOverdue <= 60) repaymentScore = 40;
    else if (daysOverdue <= 90) repaymentScore = 20;
    else repaymentScore = 5;
  }

  const utilizationScore = 75; // placeholder: ideally from actual utilization data
  const financialHealth = (repaymentScore * 0.6 + utilizationScore * 0.4);

  // --- 2. Agricultural Performance (25%) ---
  // Sub-components: PoP compliance + yield performance
  const popComplianceScore = 70; // placeholder: from ROOTS execution data
  const yieldScore = 65; // placeholder: from actual vs expected yield
  const agriculturalPerformance = (popComplianceScore * 0.5 + yieldScore * 0.5);

  // --- 3. Market Conditions (20%) ---
  // Sub-component: PULSE price risk assessment
  const priceRiskScore = 60; // placeholder: from market volatility analysis
  const marketConditions = priceRiskScore;

  // --- 4. Behavioral Engagement (20%) ---
  // Sub-components: app usage + advisory adherence
  const appUsageScore = 70; // placeholder: from login frequency
  const advisoryAdherenceScore = 65; // placeholder: from advisory follow-up
  const behavioralEngagement = (appUsageScore * 0.5 + advisoryAdherenceScore * 0.5);

  // Weighted total
  const totalScore = Math.round(
    financialHealth * 0.35 +
    agriculturalPerformance * 0.25 +
    marketConditions * 0.20 +
    behavioralEngagement * 0.20
  );

  // Determine band
  let band;
  if (totalScore >= 75) band = 'green';
  else if (totalScore >= 50) band = 'yellow';
  else if (totalScore >= 25) band = 'orange';
  else band = 'red';

  // Persist to RssScoreHistory
  const { generateUUID } = require('../../../shared/utils/uuidHelper');
  await RssScoreHistory.create({
    score_uuid: generateUUID(),
    application_id: loanApplicationId,
    farmer_id: application.farmer_id,
    score_date: new Date(),
    total_score: totalScore,
    financial_health_score: parseFloat(financialHealth.toFixed(2)),
    agricultural_performance_score: parseFloat(agriculturalPerformance.toFixed(2)),
    market_conditions_score: parseFloat(marketConditions.toFixed(2)),
    behavioral_engagement_score: parseFloat(behavioralEngagement.toFixed(2)),
    score_band: band,
  });

  logger.info(`RSS score calculated for application ${loanApplicationId}: score=${totalScore}, band=${band}`);

  return {
    applicationId: loanApplicationId,
    totalScore,
    band,
    components: {
      financialHealth: { score: parseFloat(financialHealth.toFixed(2)), weight: 0.35 },
      agriculturalPerformance: { score: parseFloat(agriculturalPerformance.toFixed(2)), weight: 0.25 },
      marketConditions: { score: parseFloat(marketConditions.toFixed(2)), weight: 0.20 },
      behavioralEngagement: { score: parseFloat(behavioralEngagement.toFixed(2)), weight: 0.20 },
    },
    scoredAt: new Date(),
  };
};

module.exports = {
  getPortfolio,
  calculateLoanHealthScore,
};
