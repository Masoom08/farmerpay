/**
 * EWS (Early Warning System) Service
 * Alert management: list, acknowledge, take action.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Retrieves alerts with optional filtering by priority and status.
 */
const getAlerts = async (filters = {}) => {
  const { EwsAlert, EwsSignal, LoanApplication } = getDb();

  const where = { is_active: true };
  if (filters.priority) where.alert_priority = filters.priority;
  if (filters.status) where.action_status = filters.status;

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  const { count, rows } = await EwsAlert.findAndCountAll({
    where,
    include: [
      {
        model: EwsSignal,
        as: 'signal',
        where: { is_active: true },
        include: [
          { model: LoanApplication, as: 'application', attributes: ['id'] },
        ],
      },
    ],
    order: [
      ['alert_priority', 'ASC'],
      ['alert_generated_at', 'DESC'],
    ],
    limit,
    offset,
  });

  const unacknowledged = await EwsAlert.count({
    where: { is_active: true, alert_acknowledged_at: null },
  });

  return {
    alerts: rows.map((a) => ({
      alertId: a.id,
      alertUuid: a.alert_uuid,
      signalType: a.signal ? a.signal.signal_type : null,
      priority: a.alert_priority,
      application: a.signal && a.signal.application ? { id: a.signal.application.id } : null,
      actionRecommended: a.action_recommended,
      actionTaken: a.action_taken,
      actionStatus: a.action_status,
      generatedAt: a.alert_generated_at,
      acknowledgedAt: a.alert_acknowledged_at,
    })),
    total: count,
    unacknowledged,
  };
};

/**
 * Acknowledges an alert.
 */
const acknowledgeAlert = async (alertId, userId, data = {}) => {
  const { EwsAlert, LoanApplication } = getDb();

  const alert = await EwsAlert.findOne({
    where: { id: alertId, is_active: true },
    include: [{
      model: LoanApplication, as: 'application',
      attributes: ['id', 'reviewed_by', 'checker_id'],
      required: false,
    }],
  });
  if (!alert) {
    const err = new Error('Alert not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Scope guard: an alert can only be acknowledged by an officer whose
  // portfolio the underlying loan falls into, or by an ADMIN. Skip the
  // check when no owner context is passed (legacy job callers).
  const isAdmin = data.isAdmin === true;
  if (!isAdmin && alert.application && userId) {
    const app = alert.application;
    const touched = app.reviewed_by === userId || app.checker_id === userId;
    if (!touched) {
      const err = new Error('Forbidden: alert is outside your portfolio');
      err.statusCode = 403;
      err.errorCode = 'SENTINEL_ALERT_FORBIDDEN';
      throw err;
    }
  }

  await alert.update({
    alert_acknowledged_at: data.acknowledgedAt || new Date(),
    alert_acknowledged_by: userId,
  });

  logger.info('sentinel.alert_ack', {
    event: 'sentinel.alert_ack',
    alertId, userId, applicationId: alert.application?.id || null,
  });
  return alert;
};

/**
 * Records action taken on an alert.
 */
const takeAlertAction = async (alertId, userId, data) => {
  const { EwsAlert } = getDb();

  const alert = await EwsAlert.findOne({ where: { id: alertId, is_active: true } });
  if (!alert) {
    const err = new Error('Alert not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  await alert.update({
    action_taken: data.actionTaken,
    action_status: data.actionStatus,
    alert_acknowledged_at: alert.alert_acknowledged_at || new Date(),
    alert_acknowledged_by: alert.alert_acknowledged_by || userId,
  });

  logger.info(`Alert ${alertId} action taken by user ${userId}: ${data.actionStatus}`);
  return { alert, actionId: alert.id };
};

/**
 * Generates EWS signals for a farmer across all active loans.
 * For each active loan, retrieves RSS score + red flags, creates EwsSignal records.
 * Creates EwsAlert if severity is high/critical.
 * @param {number} farmerId
 * @returns {Promise<{ signals: Array, alerts: Array }>}
 */
const generateEwsSignals = async (farmerId) => {
  const { LoanApplication, EwsSignal, EwsAlert, RssScoreHistory, RedFlagEvent } = getDb();
  const { generateUUID } = require('../../../shared/utils/uuidHelper');

  const applications = await LoanApplication.findAll({
    where: {
      farmer_id: farmerId,
      is_active: true,
      application_status: { [Op.in]: ['disbursed', 'active', 'approved'] },
    },
  });

  if (!applications || applications.length === 0) {
    logger.info(`No active loans for farmer ${farmerId} — no EWS signals generated`);
    return { signals: [], alerts: [] };
  }

  const generatedSignals = [];
  const generatedAlerts = [];

  for (const app of applications) {
    // Get latest RSS score
    const rssScore = await RssScoreHistory.findOne({
      where: { application_id: app.id, is_active: true },
      order: [['score_date', 'DESC']],
    }).catch(() => null);

    // Get active red flags
    const redFlags = await RedFlagEvent.findAll({
      where: { application_id: app.id, is_active: true, is_resolved: false },
    }).catch(() => []);

    // Determine signal type and severity from RSS score band
    let signalType = 'monitoring';
    let severity = 'low';

    if (rssScore) {
      if (rssScore.score_band === 'red') {
        signalType = 'critical_deterioration';
        severity = 'critical';
      } else if (rssScore.score_band === 'orange') {
        signalType = 'significant_risk';
        severity = 'high';
      } else if (rssScore.score_band === 'yellow') {
        signalType = 'early_warning';
        severity = 'medium';
      } else {
        signalType = 'routine_monitoring';
        severity = 'low';
      }
    }

    // Elevate severity if critical red flags exist
    const hasCriticalFlags = redFlags.some((f) => f.flag_severity === 'critical');
    const hasHighFlags = redFlags.some((f) => f.flag_severity === 'high');
    if (hasCriticalFlags && severity !== 'critical') {
      severity = 'critical';
      signalType = 'red_flag_critical';
    } else if (hasHighFlags && severity === 'low') {
      severity = 'high';
      signalType = 'red_flag_high';
    }

    // ROOTS compliance factor: adjust severity based on compliance score
    let rootsComplianceScore = null;
    try {
      const { RootsComplianceSnapshot } = getDb();
      if (RootsComplianceSnapshot) {
        const snapshot = await RootsComplianceSnapshot.findOne({
          where: { farmer_id: farmerId, is_active: true },
          order: [['snapshot_date', 'DESC']],
          attributes: ['overall_compliance_score', 'data_completeness_pct'],
        });
        if (snapshot && snapshot.data_completeness_pct >= 40) {
          rootsComplianceScore = parseFloat(snapshot.overall_compliance_score || 0);
          // High compliance reduces severity; low compliance elevates it
          if (rootsComplianceScore >= 80 && severity === 'high') {
            severity = 'medium'; // good farmer with temporary issue
            signalType = signalType + '_roots_mitigated';
          } else if (rootsComplianceScore < 50 && severity === 'low') {
            severity = 'medium'; // low compliance is a risk signal
            signalType = 'roots_compliance_concern';
          }
        }
      }
    } catch (_) {}

    // Create EwsSignal
    const signal = await EwsSignal.create({
      signal_uuid: generateUUID(),
      application_id: app.id,
      farmer_id: farmerId,
      signal_type: signalType,
      signal_severity: severity,
      signal_date: new Date(),
      rss_score: rssScore ? rssScore.total_score : null,
      rss_band: rssScore ? rssScore.score_band : null,
      red_flag_count: redFlags.length,
      signal_details: JSON.stringify({
        redFlagTypes: redFlags.map((f) => f.flag_type),
        rssComponents: rssScore ? {
          financial: rssScore.financial_health_score,
          agricultural: rssScore.agricultural_performance_score,
          market: rssScore.market_conditions_score,
          behavioral: rssScore.behavioral_engagement_score,
        } : null,
        rootsCompliance: rootsComplianceScore,
      }),
    });

    generatedSignals.push({
      signalId: signal.id,
      applicationId: app.id,
      signalType,
      severity,
      rssScore: rssScore ? rssScore.total_score : null,
      redFlagCount: redFlags.length,
    });

    // Create EwsAlert if severity is high or critical
    if (severity === 'high' || severity === 'critical') {
      let actionRecommended = 'Review account immediately';
      if (signalType === 'critical_deterioration') {
        actionRecommended = 'Initiate recovery proceedings and contact farmer urgently';
      } else if (signalType === 'significant_risk') {
        actionRecommended = 'Schedule field visit and reassess collateral/income';
      } else if (signalType === 'red_flag_critical') {
        actionRecommended = 'Escalate to senior management for immediate action';
      } else if (signalType === 'roots_compliance_concern') {
        actionRecommended = 'Low ROOTS compliance — schedule Sathi field verification and review farming activity';
      } else if (signalType.includes('roots_mitigated')) {
        actionRecommended = 'High ROOTS compliance farmer with temporary issue — monitor but no immediate action needed';
      }

      const alert = await EwsAlert.create({
        alert_uuid: generateUUID(),
        signal_id: signal.id,
        alert_priority: severity === 'critical' ? 1 : 2,
        action_recommended: actionRecommended,
        action_status: 'pending',
        alert_generated_at: new Date(),
      });

      generatedAlerts.push({
        alertId: alert.id,
        alertUuid: alert.alert_uuid,
        signalId: signal.id,
        priority: alert.alert_priority,
        actionRecommended,
      });
    }
  }

  logger.info(`EWS signals generated for farmer ${farmerId}: ${generatedSignals.length} signals, ${generatedAlerts.length} alerts`);

  return {
    signals: generatedSignals,
    alerts: generatedAlerts,
  };
};

module.exports = {
  getAlerts,
  acknowledgeAlert,
  takeAlertAction,
  generateEwsSignals,
};
