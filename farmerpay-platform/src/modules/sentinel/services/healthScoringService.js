/**
 * Health Scoring Service
 * Loan health assessment, SMA classification, and red flag aggregation.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Retrieves comprehensive loan health data for an application.
 */
const getLoanHealth = async (applicationId) => {
  const { LoanHealthSnapshot, SmaClassificationLog, RedFlagEvent, LoanApplication } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, is_active: true },
  });
  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Latest health snapshot
  const snapshot = await LoanHealthSnapshot.findOne({
    where: { application_id: applicationId, is_active: true },
    order: [['snapshot_date', 'DESC']],
  });

  // Latest SMA classification
  const smaLog = await SmaClassificationLog.findOne({
    where: { application_id: applicationId, is_active: true },
    order: [['classification_date', 'DESC']],
  });

  // Active red flags
  const redFlags = await RedFlagEvent.findAll({
    where: { application_id: applicationId, is_active: true, is_resolved: false },
    order: [['event_date', 'DESC']],
    limit: 10,
  });

  return {
    healthStatus: snapshot ? snapshot.health_status : 'good',
    daysOverdue: snapshot ? snapshot.days_overdue : 0,
    principalOutstanding: snapshot ? snapshot.principal_outstanding : null,
    interestOutstanding: snapshot ? snapshot.interest_outstanding : null,
    totalOutstanding: snapshot ? snapshot.total_outstanding : null,
    nextEmiDueDate: snapshot ? snapshot.next_emi_due_date : null,
    nextEmiAmount: snapshot ? snapshot.next_emi_amount : null,
    healthScore: snapshot ? snapshot.health_score : null,
    smaClassification: smaLog ? smaLog.sma_classification : 'standard',
    classificationDate: smaLog ? smaLog.classification_date : null,
    redFlags: redFlags.map((rf) => ({
      flagType: rf.flag_type,
      severity: rf.flag_severity,
      description: rf.event_description,
      date: rf.event_date,
      resolved: rf.is_resolved,
    })),
  };
};

/**
 * Retrieves SMA classification details for an application.
 */
const getSmaClassification = async (applicationId) => {
  const { SmaClassificationLog } = getDb();

  const log = await SmaClassificationLog.findOne({
    where: { application_id: applicationId, is_active: true },
    order: [['classification_date', 'DESC']],
  });

  if (!log) {
    return {
      classification: 'standard',
      classificationDate: null,
      reason: null,
      previousClassification: null,
      trigger: null,
      classifiedByOfficer: null,
    };
  }

  return {
    classification: log.sma_classification,
    classificationDate: log.classification_date,
    reason: log.classification_reason,
    previousClassification: log.previous_classification,
    trigger: log.classification_trigger,
    classifiedByOfficer: log.classified_by_bank_officer,
  };
};

/**
 * Retrieves red flags for an application.
 */
const getRedFlags = async (applicationId) => {
  const { RedFlagEvent } = getDb();

  const flags = await RedFlagEvent.findAll({
    where: { application_id: applicationId, is_active: true },
    order: [['event_date', 'DESC']],
  });

  const unresolvedCount = flags.filter((f) => !f.is_resolved).length;

  return {
    flags: flags.map((f) => ({
      flagType: f.flag_type,
      flagSeverity: f.flag_severity,
      description: f.event_description,
      dateIdentified: f.event_date,
      actionTaken: f.action_taken,
      resolved: f.is_resolved,
    })),
    total: flags.length,
    unresolvedCount,
  };
};

/**
 * Detects red flags for a farmer by checking 8 patterns.
 * Creates RedFlagEvent for each detected flag.
 * Patterns: sma_overdue, npa_classification, zero_agri_activity, fund_diversion,
 *           missed_payments, contact_lost, income_decline, high_ltv_breach.
 * @param {number} farmerId
 * @returns {Promise<Array<Object>>}
 */
const detectRedFlags = async (farmerId) => {
  const {
    LoanApplication,
    LoanHealthSnapshot,
    RedFlagEvent,
    GoldLoanCollateral,
    GoldLoanLtvMonitor,
    IncomeAdequacyAssessment,
  } = getDb();
  const { Op } = require('sequelize');
  const { generateUUID } = require('../../../shared/utils/uuidHelper');

  // Get all active loan applications for this farmer
  const applications = await LoanApplication.findAll({
    where: {
      farmer_id: farmerId,
      is_active: true,
      application_status: { [Op.in]: ['disbursed', 'active', 'approved'] },
    },
  });

  if (!applications || applications.length === 0) {
    logger.info(`No active applications found for farmer ${farmerId} — no red flags to detect`);
    return [];
  }

  const detectedFlags = [];

  for (const app of applications) {
    const snapshot = await LoanHealthSnapshot.findOne({
      where: { application_id: app.id, is_active: true },
      order: [['snapshot_date', 'DESC']],
    }).catch(() => null);

    const daysOverdue = snapshot ? (snapshot.days_overdue || 0) : 0;

    // 1. sma_overdue: days_past_due > 0
    if (daysOverdue > 0) {
      detectedFlags.push({
        applicationId: app.id,
        flagType: 'sma_overdue',
        severity: daysOverdue > 60 ? 'high' : daysOverdue > 30 ? 'medium' : 'low',
        description: `Account is ${daysOverdue} days past due`,
      });
    }

    // 2. npa_classification: days_past_due > 90
    if (daysOverdue > 90) {
      detectedFlags.push({
        applicationId: app.id,
        flagType: 'npa_classification',
        severity: 'critical',
        description: `Account is NPA with ${daysOverdue} days overdue (>90 days)`,
      });
    }

    // 3. zero_agri_activity: no ROOTS execution in 30+ days on active cycle
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let hasRecentActivity = true;
    try {
      const { WorkbandExecution, CultivationCycle } = getDb();
      if (WorkbandExecution && CultivationCycle) {
        const activeCycle = await CultivationCycle.findOne({
          where: { farmer_id: farmerId, is_active: true, cycle_status: { [Op.in]: ['sowing', 'growing', 'monitoring', 'harvesting'] } },
          attributes: ['cycle_uuid'],
        });
        if (activeCycle) {
          const recentExec = await WorkbandExecution.findOne({
            where: { cycle_id: activeCycle.cycle_uuid, is_active: true, updated_at: { [Op.gte]: thirtyDaysAgo } },
          });
          hasRecentActivity = !!recentExec;
        }
      }
    } catch (_) {
      hasRecentActivity = true;
    }

    if (!hasRecentActivity) {
      detectedFlags.push({
        applicationId: app.id,
        flagType: 'zero_agri_activity',
        severity: 'medium',
        description: 'No ROOTS execution activity recorded in the last 30 days',
      });
    }

    // 3b. ROOTS compliance-based red flags (Variance Engine integration)
    try {
      const { RootsComplianceSnapshot, RootsRedFlag, RootsLoanUtilizationTracking } = getDb();

      // roots_compliance_low: overall score < 50
      if (RootsComplianceSnapshot) {
        const latestSnapshot = await RootsComplianceSnapshot.findOne({
          where: { farmer_id: farmerId, is_active: true },
          order: [['snapshot_date', 'DESC']],
        });
        if (latestSnapshot && latestSnapshot.data_completeness_pct >= 40) {
          const score = parseFloat(latestSnapshot.overall_compliance_score || 0);
          if (score < 50) {
            detectedFlags.push({
              applicationId: app.id,
              flagType: 'roots_compliance_low',
              severity: score < 30 ? 'high' : 'medium',
              description: `ROOTS compliance score ${Math.round(score)}/100 — below threshold`,
            });
          }
        }
      }

      // Check ROOTS red flags
      if (RootsRedFlag) {
        const rootsFlags = await RootsRedFlag.findAll({
          where: { farmer_id: farmerId, is_active: true, status: { [Op.in]: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] } },
          attributes: ['flag_type', 'severity'],
        });

        for (const rf of rootsFlags) {
          const flagMap = {
            CRITICAL_STAGE_MISSED: { type: 'roots_critical_stage_missed', severity: 'high', desc: 'Critical farming stage missed (sowing/harvest)' },
            COST_ANOMALY: { type: 'roots_cost_anomaly', severity: 'medium', desc: 'Farm input cost anomaly detected' },
            NO_DATA_ENTRY: { type: 'roots_no_data_extended', severity: rf.severity === 'CRITICAL' ? 'high' : 'medium', desc: 'Extended period with no farming data entry' },
            BACKFILL_SUSPECTED: { type: 'roots_backfill_suspected', severity: 'low', desc: 'Possible backfill of farming data detected' },
            SATHI_DISCREPANCY: { type: 'roots_sathi_discrepancy', severity: 'high', desc: 'Sathi field verification found discrepancy' },
            LOAN_UTILIZATION_MISMATCH: { type: 'roots_loan_utilization_poor', severity: 'high', desc: 'Loan utilization below 20% threshold' },
          };

          const mapped = flagMap[rf.flag_type];
          if (mapped) {
            // Avoid duplicates
            if (!detectedFlags.some((f) => f.flagType === mapped.type)) {
              detectedFlags.push({ applicationId: app.id, flagType: mapped.type, severity: mapped.severity, description: mapped.desc });
            }
          }
        }
      }

      // roots_loan_utilization_poor: direct check
      if (RootsLoanUtilizationTracking) {
        const utilTracking = await RootsLoanUtilizationTracking.findOne({
          where: { farmer_id: farmerId, loan_application_id: app.id, is_active: true },
        });
        if (utilTracking && (utilTracking.utilization_quality === 'POOR' || utilTracking.utilization_quality === 'SUSPICIOUS')) {
          if (!detectedFlags.some((f) => f.flagType === 'roots_loan_utilization_poor')) {
            detectedFlags.push({
              applicationId: app.id,
              flagType: 'roots_loan_utilization_poor',
              severity: utilTracking.utilization_quality === 'SUSPICIOUS' ? 'high' : 'medium',
              description: `Loan utilization quality: ${utilTracking.utilization_quality} (ratio: ${utilTracking.utilization_ratio})`,
            });
          }
        }
      }
    } catch (rootsErr) {
      logger.warn(`SENTINEL: ROOTS signal fetch failed for farmer ${farmerId}: ${rootsErr.message}`);
    }

    // 4. fund_diversion: expense categories don't match declared loan purpose
    const endUsePurpose = app.end_use_purpose || '';
    const pslClassification = app.psl_classification || '';
    if (endUsePurpose && pslClassification === 'agriculture' && app.diversion_flag) {
      detectedFlags.push({
        applicationId: app.id,
        flagType: 'fund_diversion',
        severity: 'high',
        description: 'Expense categories do not match declared agricultural loan purpose',
      });
    }

    // 5. missed_payments: 2+ consecutive EMI misses
    const consecutiveMisses = snapshot ? (snapshot.consecutive_missed_emis || 0) : 0;
    if (consecutiveMisses >= 2) {
      detectedFlags.push({
        applicationId: app.id,
        flagType: 'missed_payments',
        severity: consecutiveMisses >= 3 ? 'critical' : 'high',
        description: `${consecutiveMisses} consecutive EMI payments missed`,
      });
    }

    // 6. contact_lost: no login in 60+ days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const lastLoginDate = app.last_login_date || null;
    if (lastLoginDate && new Date(lastLoginDate) < sixtyDaysAgo) {
      detectedFlags.push({
        applicationId: app.id,
        flagType: 'contact_lost',
        severity: 'medium',
        description: 'No user login recorded in the last 60 days',
      });
    }

    // 7. income_decline: current income < 60% of assessed income
    try {
      const latestAssessment = await IncomeAdequacyAssessment.findOne({
        where: { farmer_id: farmerId, is_active: true },
        order: [['assessment_date', 'DESC']],
      });
      if (latestAssessment && latestAssessment.adequacy_status === 'inadequate') {
        detectedFlags.push({
          applicationId: app.id,
          flagType: 'income_decline',
          severity: 'high',
          description: 'Current income assessed as inadequate relative to loan obligations',
        });
      }
    } catch (_) {
      // Model may not exist; skip
    }

    // 8. high_ltv_breach: gold loan LTV > applicable cap
    try {
      const ltvMonitor = await GoldLoanLtvMonitor.findOne({
        where: { application_id: app.id, is_active: true },
        order: [['monitor_date', 'DESC']],
      });
      if (ltvMonitor && ltvMonitor.ltv_breach) {
        detectedFlags.push({
          applicationId: app.id,
          flagType: 'high_ltv_breach',
          severity: 'high',
          description: `Gold loan LTV (${ltvMonitor.current_ltv}) exceeds cap (${ltvMonitor.applicable_ltv_cap})`,
        });
      }
    } catch (_) {
      // Model may not exist; skip
    }
  }

  // Persist each detected flag as RedFlagEvent
  for (const flag of detectedFlags) {
    await RedFlagEvent.create({
      flag_uuid: generateUUID(),
      application_id: flag.applicationId,
      farmer_id: farmerId,
      flag_type: flag.flagType,
      flag_severity: flag.severity,
      event_description: flag.description,
      event_date: new Date(),
      is_resolved: false,
    });
  }

  logger.info(`Red flag detection for farmer ${farmerId}: ${detectedFlags.length} flags detected`);

  return detectedFlags;
};

module.exports = {
  getLoanHealth,
  getSmaClassification,
  getRedFlags,
  detectRedFlags,
};
