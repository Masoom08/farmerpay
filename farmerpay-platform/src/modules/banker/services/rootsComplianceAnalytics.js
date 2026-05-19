/**
 * ROOTS Compliance Analytics — Banker portfolio analytics for the
 * Variance Engine compliance data. Powers the banker dashboard
 * "ROOTS Compliance" page.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/* ====================================================================
 * 1. getRootsPortfolioCompliance
 * ==================================================================== */

const getRootsPortfolioCompliance = async (filters = {}) => {
  const { RootsComplianceSnapshot, User, CultivationCycle, SoilHealthRecord, sequelize } = getDb();

  const where = { is_active: true };
  if (filters.season) where.season = filters.season;

  // Get latest snapshot per farmer+activity (deduplicated)
  const [snapshots] = await sequelize.query(`
    SELECT rcs.*,
      u.first_name, u.last_name, u.mobile,
      cc.self_declared_crop AS crop_name, cc.cycle_season, cc.cycle_year, cc.field_id
    FROM roots_compliance_snapshots rcs
    JOIN (
      SELECT farmer_id, activity_type, activity_reference_id, MAX(snapshot_date) AS max_date
      FROM roots_compliance_snapshots
      WHERE is_active = 1 ${filters.season ? 'AND season = :season' : ''}
      GROUP BY farmer_id, activity_type, activity_reference_id
    ) latest ON rcs.farmer_id = latest.farmer_id
      AND rcs.activity_type = latest.activity_type
      AND rcs.activity_reference_id = latest.activity_reference_id
      AND rcs.snapshot_date = latest.max_date
    JOIN users u ON rcs.farmer_id = u.id
    LEFT JOIN cultivation_cycles cc ON rcs.activity_reference_id = cc.id
    WHERE rcs.is_active = 1
    ${filters.season ? 'AND rcs.season = :season' : ''}
    ORDER BY rcs.overall_compliance_score DESC
  `, { replacements: { season: filters.season || '' } });

  // Classify into bands
  let high = 0, moderate = 0, low = 0, insufficientData = 0;
  let totalScore = 0, scoredCount = 0;

  snapshots.forEach((s) => {
    const score = parseFloat(s.overall_compliance_score);
    if (s.data_completeness_pct < 40 || score === null || isNaN(score)) {
      insufficientData++;
    } else if (score >= 80) {
      high++; totalScore += score; scoredCount++;
    } else if (score >= 60) {
      moderate++; totalScore += score; scoredCount++;
    } else {
      low++; totalScore += score; scoredCount++;
    }
  });

  // Soil health card percentage
  const farmerFieldIds = [...new Set(snapshots.map((s) => s.field_id).filter(Boolean))];
  let soilHealthCardCount = 0;
  if (farmerFieldIds.length > 0) {
    soilHealthCardCount = await SoilHealthRecord.count({
      where: { field_id: { [Op.in]: farmerFieldIds }, is_active: true },
      col: 'field_id',
      distinct: true,
    });
  }

  const totalFarmers = snapshots.length;
  const soilHealthCardPct = totalFarmers > 0 ? Math.round((soilHealthCardCount / totalFarmers) * 100) : 0;

  // Crop breakdown
  const cropMap = {};
  snapshots.forEach((s) => {
    const crop = s.crop_name || 'Unknown';
    if (!cropMap[crop]) cropMap[crop] = { crop, count: 0, totalScore: 0, scored: 0 };
    cropMap[crop].count++;
    const score = parseFloat(s.overall_compliance_score);
    if (!isNaN(score) && s.data_completeness_pct >= 40) {
      cropMap[crop].totalScore += score;
      cropMap[crop].scored++;
    }
  });
  const cropBreakdown = Object.values(cropMap).map((c) => ({
    crop: c.crop,
    farmerCount: c.count,
    avgScore: c.scored > 0 ? Math.round((c.totalScore / c.scored) * 10) / 10 : null,
  })).sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

  return {
    summary: {
      totalFarmers,
      highCompliance: high,
      moderateCompliance: moderate,
      lowCompliance: low,
      insufficientData,
      avgScore: scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : null,
      soilHealthCardPct,
    },
    cropBreakdown,
  };
};

/* ====================================================================
 * 2. getRootsRedFlags
 * ==================================================================== */

const getRootsRedFlags = async (filters = {}, pagination = { page: 1, pageSize: 25 }) => {
  const { RootsRedFlag, User, LoanApplication, sequelize } = getDb();

  const where = { is_active: true };
  if (filters.severity) where.severity = filters.severity;
  if (filters.status) where.status = filters.status;
  else where.status = { [Op.in]: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] };

  const { count, rows } = await RootsRedFlag.findAndCountAll({
    where,
    include: [
      { model: User, as: 'farmer', attributes: ['id', 'first_name', 'last_name', 'mobile'] },
    ],
    order: [
      [sequelize.literal("FIELD(severity, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW')"), 'ASC'],
      ['created_at', 'DESC'],
    ],
    limit: pagination.pageSize,
    offset: (pagination.page - 1) * pagination.pageSize,
  });

  const flags = rows.map((f) => ({
    flagId: f.uuid,
    flagDbId: f.id,
    farmerId: f.farmer_id,
    farmerName: f.farmer ? `${f.farmer.first_name || ''} ${f.farmer.last_name || ''}`.trim() : 'Unknown',
    farmerMobile: f.farmer?.mobile || null,
    activityType: f.activity_type,
    flagType: f.flag_type,
    severity: f.severity,
    status: f.status,
    description: f.description,
    loanApplicationId: f.loan_application_id,
    createdAt: f.created_at,
  }));

  // Severity summary
  const [summaryRows] = await sequelize.query(`
    SELECT severity, COUNT(*) AS cnt
    FROM roots_red_flags
    WHERE is_active = 1 AND status IN ('OPEN','ACKNOWLEDGED','INVESTIGATING')
    GROUP BY severity
  `);
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  summaryRows.forEach((r) => { summary[r.severity.toLowerCase()] = parseInt(r.cnt, 10); });

  return {
    flags,
    summary,
    meta: buildMeta(count, pagination.page, pagination.pageSize),
  };
};

/* ====================================================================
 * 3. getRootsVsRepayment
 * ==================================================================== */

const getRootsVsRepayment = async () => {
  const { sequelize } = getDb();

  const [rows] = await sequelize.query(`
    SELECT
      CASE
        WHEN rcs.overall_compliance_score >= 80 THEN 'high'
        WHEN rcs.overall_compliance_score >= 60 THEN 'moderate'
        WHEN rcs.overall_compliance_score IS NOT NULL AND rcs.data_completeness_pct >= 40 THEN 'low'
        ELSE 'no_data'
      END AS compliance_band,
      COUNT(DISTINCT la.id) AS total_loans,
      SUM(CASE WHEN lr.paid_on_time = 1 THEN 1 ELSE 0 END) AS on_time_count
    FROM loan_applications la
    LEFT JOIN roots_compliance_snapshots rcs
      ON la.farmer_id = rcs.farmer_id AND rcs.is_active = 1
    LEFT JOIN loan_repayments lr
      ON la.id = lr.application_id AND lr.is_active = 1
    WHERE la.is_active = 1
      AND la.application_status IN ('disbursed', 'active')
    GROUP BY compliance_band
  `);

  const correlation = {};
  rows.forEach((r) => {
    const totalLoans = parseInt(r.total_loans, 10);
    const onTime = parseInt(r.on_time_count, 10);
    correlation[`${r.compliance_band}_repayment_rate`] = totalLoans > 0
      ? Math.round((onTime / totalLoans) * 100 * 10) / 10
      : null;
    correlation[`${r.compliance_band}_total`] = totalLoans;
  });

  return { correlation };
};

/* ====================================================================
 * 4. getBranchCompliance
 * ==================================================================== */

const getBranchCompliance = async () => {
  const { sequelize } = getDb();

  const [rows] = await sequelize.query(`
    SELECT
      COALESCE(d.district_name, 'Unknown') AS branch,
      COUNT(DISTINCT rcs.farmer_id) AS farmer_count,
      AVG(rcs.overall_compliance_score) AS avg_score,
      (SELECT COUNT(*) FROM roots_red_flags rf
        WHERE rf.farmer_id IN (
          SELECT DISTINCT rcs2.farmer_id FROM roots_compliance_snapshots rcs2
          JOIN users u2 ON rcs2.farmer_id = u2.id
          LEFT JOIN farmer_profiles fp2 ON u2.id = fp2.farmer_id
          LEFT JOIN districts d2 ON fp2.district_id = d2.id
          WHERE d2.district_name = d.district_name
        ) AND rf.status IN ('OPEN','ACKNOWLEDGED','INVESTIGATING') AND rf.is_active = 1
      ) AS red_flag_count
    FROM roots_compliance_snapshots rcs
    JOIN users u ON rcs.farmer_id = u.id
    LEFT JOIN farmer_profiles fp ON u.id = fp.farmer_id
    LEFT JOIN districts d ON fp.district_id = d.id
    WHERE rcs.is_active = 1
    GROUP BY d.district_name
    ORDER BY avg_score DESC
  `);

  return {
    branches: rows.map((r) => ({
      branch: r.branch,
      farmerCount: parseInt(r.farmer_count, 10),
      avgScore: r.avg_score ? Math.round(parseFloat(r.avg_score) * 10) / 10 : null,
      redFlagCount: parseInt(r.red_flag_count || 0, 10),
    })),
  };
};

/* ====================================================================
 * 5. acknowledgeRedFlag
 * ==================================================================== */

const acknowledgeRedFlag = async (flagId, bankerId) => {
  const { RootsRedFlag } = getDb();

  const flag = await RootsRedFlag.findOne({ where: { uuid: flagId, is_active: true } });
  if (!flag) {
    const err = new Error('Red flag not found');
    err.statusCode = 404; throw err;
  }

  await flag.update({
    status: 'ACKNOWLEDGED',
    acknowledged_by: bankerId,
    acknowledged_at: new Date(),
  });

  return { flagId: flag.uuid, status: 'ACKNOWLEDGED' };
};

module.exports = {
  getRootsPortfolioCompliance,
  getRootsRedFlags,
  getRootsVsRepayment,
  getBranchCompliance,
  acknowledgeRedFlag,
};
