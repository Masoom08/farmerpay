/**
 * Sathi Dashboard Service
 *
 * Pre-aggregated KPIs for a Sathi's dashboard:
 *   - Beneficiaries (total, counted-for-incentive, new this month)
 *   - Loans (sanctioned, disbursed, repaid)
 *   - Insurance (policies bought)
 *   - Nudges (sent, repayments-via-nudge)
 *   - Issues (open, critical)
 *   - Commission accrued (MTD, lifetime)
 *   - Incentive progress toward 100
 */

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const { accrualPeriod } = require('./sathiCommissionService');
const { quarterBounds, MILESTONE_THRESHOLD } = require('./sathiIncentiveService');

const overview = async (intermediaryId) => {
  const {
    SathiBeneficiary,
    SathiCommissionLedger,
    SathiIncentiveLedger,
    SathiIssueFlag,
    SathiNudge,
    Sequelize,
  } = getDb();

  const currentPeriod = accrualPeriod();
  const [qStart, qEnd] = quarterBounds();

  const [
    totalBeneficiaries,
    countedBeneficiaries,
    commissionMtd,
    commissionLifetime,
    openIssues,
    criticalIssues,
    nudgesSent,
    nudgesConverted,
    latestIncentive,
  ] = await Promise.all([
    SathiBeneficiary.count({ where: { intermediary_id: intermediaryId } }),
    SathiBeneficiary.count({
      where: { intermediary_id: intermediaryId, is_counted_for_incentive: true },
    }),
    SathiCommissionLedger.sum('commission_amount_paise', {
      where: { intermediary_id: intermediaryId, accrual_period: currentPeriod },
    }),
    SathiCommissionLedger.sum('commission_amount_paise', {
      where: { intermediary_id: intermediaryId },
    }),
    SathiIssueFlag.count({
      where: { intermediary_id: intermediaryId, status: 'open' },
    }),
    SathiIssueFlag.count({
      where: { intermediary_id: intermediaryId, status: 'open', severity: 'critical' },
    }),
    SathiNudge.count({
      where: {
        intermediary_id: intermediaryId,
        status: { [Sequelize.Op.in]: ['sent', 'delivered', 'acknowledged'] },
      },
    }),
    SathiNudge.count({
      where: {
        intermediary_id: intermediaryId,
        linked_action_taken_at: { [Sequelize.Op.ne]: null },
      },
    }),
    SathiIncentiveLedger.findOne({
      where: { intermediary_id: intermediaryId },
      order: [['qualifying_period_start', 'DESC']],
    }),
  ]);

  // Incentive progress is the count in the current quarter.
  const beneficiariesThisQuarter = await SathiBeneficiary.count({
    where: {
      intermediary_id: intermediaryId,
      is_counted_for_incentive: true,
      first_product_activated_at: {
        [Sequelize.Op.between]: [`${qStart} 00:00:00`, `${qEnd} 23:59:59`],
      },
    },
  });

  return {
    beneficiaries: {
      total: totalBeneficiaries,
      counted: countedBeneficiaries,
    },
    commission: {
      mtdPaise: Number(commissionMtd || 0),
      lifetimePaise: Number(commissionLifetime || 0),
      currentPeriod,
    },
    incentive: {
      thresholdTarget: MILESTONE_THRESHOLD,
      currentQuarterCount: beneficiariesThisQuarter,
      currentQuarter: { start: qStart, end: qEnd },
      progressPercent: Math.min(
        100,
        Math.round((beneficiariesThisQuarter / MILESTONE_THRESHOLD) * 100)
      ),
      latestPayout: latestIncentive
        ? {
            amountPaise: Number(latestIncentive.bonus_amount_paise),
            periodStart: latestIncentive.qualifying_period_start,
            status: latestIncentive.payout_status,
          }
        : null,
    },
    issues: { open: openIssues, critical: criticalIssues },
    nudges: {
      sent: nudgesSent,
      convertedToAction: nudgesConverted,
      conversionRate: nudgesSent ? Math.round((nudgesConverted / nudgesSent) * 100) : 0,
    },
  };
};

/**
 * Loans sanctioned / taken / repaid. Best-effort join into the dice
 * module's LoanApplication table. Falls back to zeros if the column
 * shape doesn't match.
 */
const loansSummary = async (intermediaryId) => {
  const { SathiBeneficiary, LoanApplication } = getDb();
  if (!LoanApplication) return { sanctioned: 0, disbursed: 0, repaid: 0 };

  const beneficiaries = await SathiBeneficiary.findAll({
    where: { intermediary_id: intermediaryId },
    attributes: ['farmer_id'],
  });
  const farmerIds = beneficiaries.map((b) => b.farmer_id);
  if (!farmerIds.length) return { sanctioned: 0, disbursed: 0, repaid: 0 };

  const [sanctioned, disbursed] = await Promise.all([
    LoanApplication.count({
      where: { farmer_id: farmerIds, application_status: 'approved' },
    }).catch(() => 0),
    LoanApplication.count({
      where: { farmer_id: farmerIds, application_status: 'disbursed' },
    }).catch(() => 0),
  ]);

  return { sanctioned, disbursed, repaid: 0, farmerCount: farmerIds.length };
};

const insuranceSummary = async (intermediaryId) => {
  const { SathiBeneficiary, InsurancePosReferral } = getDb();
  if (!InsurancePosReferral) return { policiesBought: 0 };

  const beneficiaries = await SathiBeneficiary.findAll({
    where: { intermediary_id: intermediaryId },
    attributes: ['farmer_id'],
  });
  const farmerIds = beneficiaries.map((b) => b.farmer_id);
  if (!farmerIds.length) return { policiesBought: 0 };

  const policiesBought = await InsurancePosReferral.count({
    where: { farmer_id: farmerIds, referral_status: 'converted' },
  }).catch(() => 0);

  return { policiesBought };
};

/**
 * List farmers assigned to a Sathi with loan/insurance/risk summary.
 * Joins intermediary_assignments → users → farmer_profiles, and left-joins
 * loan_applications + insurance_enrollments for per-farmer status.
 */
const getAssignedFarmers = async (intermediaryId) => {
  const {
    IntermediaryAssignment,
    User,
    FarmerProfile,
    SathiBeneficiary,
    SathiNudge,
    LoanApplication,
    InsuranceEnrollment,
    Sequelize,
  } = getDb();

  const assignments = await IntermediaryAssignment.findAll({
    where: { intermediary_id: intermediaryId, is_active: true },
    include: [
      {
        model: User,
        as: 'farmer',
        attributes: ['id', 'first_name', 'last_name', 'mobile'],
      },
    ],
    order: [['assigned_at', 'DESC']],
  });

  const farmers = [];

  for (const a of assignments) {
    if (!a.farmer) continue;

    const farmerId = a.farmer.id;

    // Parallel lookups for this farmer
    const [profile, beneficiary, latestNudge, loanCount, activeInsurance] = await Promise.all([
      FarmerProfile ? FarmerProfile.findOne({ where: { farmer_id: farmerId }, attributes: ['village', 'district', 'onboarding_status'] }).catch(() => null) : null,
      SathiBeneficiary.findOne({ where: { intermediary_id: intermediaryId, farmer_id: farmerId } }).catch(() => null),
      SathiNudge.findOne({ where: { intermediary_id: intermediaryId, farmer_id: farmerId }, order: [['sent_at', 'DESC']], attributes: ['sent_at'] }).catch(() => null),
      LoanApplication ? LoanApplication.count({ where: { farmer_id: farmerId, application_status: { [Sequelize.Op.in]: ['approved', 'disbursed', 'active'] } } }).catch(() => 0) : 0,
      InsuranceEnrollment ? InsuranceEnrollment.count({ where: { farmer_id: farmerId, status: 'active' } }).catch(() => 0) : 0,
    ]);

    // Determine loan status (simplistic: latest loan's status)
    let loanStatus = 'none';
    if (LoanApplication) {
      const latest = await LoanApplication.findOne({
        where: { farmer_id: farmerId },
        order: [['created_at', 'DESC']],
        attributes: ['application_status', 'loan_amount'],
      }).catch(() => null);
      if (latest) loanStatus = latest.application_status || 'none';
    }

    // Risk heuristic based on beneficiary status
    let riskStatus = 'on_track';
    if (beneficiary?.status === 'dormant') riskStatus = 'at_risk';
    if (beneficiary?.status === 'churned') riskStatus = 'off_track';

    farmers.push({
      id: farmerId,
      name: `${a.farmer.first_name || ''} ${a.farmer.last_name || ''}`.trim(),
      mobile: a.farmer.mobile,
      village: profile?.village || null,
      district: profile?.district || null,
      loanStatus,
      loanCount,
      insuranceActive: activeInsurance > 0,
      riskStatus,
      lastNudge: latestNudge?.sent_at ? latestNudge.sent_at.toISOString().slice(0, 10) : null,
      assignedAt: a.assigned_at,
      beneficiaryStatus: beneficiary?.status || 'pending',
    });
  }

  return farmers;
};

module.exports = { overview, loansSummary, insuranceSummary, getAssignedFarmers };
