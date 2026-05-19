/**
 * Risk Analysis Service
 * Risk scoring, cash flow projections, and diversion risk assessment.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Retrieves comprehensive risk data for a loan application.
 */
const getLoanRisk = async (applicationId) => {
  const {
    RssScoreHistory, EwsSignal, DiversionRiskAssessment, ActionSuggestion,
  } = getDb();

  // Latest RSS score
  const rssScore = await RssScoreHistory.findOne({
    where: { application_id: applicationId, is_active: true },
    order: [['score_date', 'DESC']],
  });

  // Active EWS signals
  const signals = await EwsSignal.findAll({
    where: { application_id: applicationId, is_active: true },
    order: [['signal_timestamp', 'DESC']],
    limit: 10,
  });

  // Latest diversion risk
  const diversion = await DiversionRiskAssessment.findOne({
    where: { application_id: applicationId, is_active: true },
    order: [['assessment_date', 'DESC']],
  });

  // Active suggestions
  const suggestions = await ActionSuggestion.findAll({
    where: {
      application_id: applicationId,
      is_active: true,
      action_taken_based_on_suggestion: false,
    },
    order: [['suggestion_priority', 'ASC']],
    limit: 5,
  });

  return {
    riskScore: rssScore ? rssScore.risk_severity_score : null,
    riskLevel: diversion ? diversion.diversion_risk_level : 'low',
    scoreTrend: rssScore ? rssScore.score_trend : null,
    isDeteriorating: rssScore ? rssScore.is_deteriorating : false,
    indicators: diversion ? diversion.diversion_indicators : null,
    ewsSignals: signals.map((s) => ({
      signalType: s.signal_type,
      strength: s.signal_strength,
      timestamp: s.signal_timestamp,
      data: s.signal_data,
    })),
    suggestedActions: suggestions.map((s) => ({
      category: s.suggestion_category,
      text: s.suggestion_text,
      priority: s.suggestion_priority,
    })),
  };
};

/**
 * Retrieves cash flow projections for a loan application.
 */
const getCashFlow = async (applicationId) => {
  const { CashFlowProjection } = getDb();

  const projections = await CashFlowProjection.findAll({
    where: { application_id: applicationId, is_active: true },
    order: [['projection_year', 'ASC'], ['projection_month', 'ASC']],
  });

  if (!projections.length) {
    return { projections: [], cashflowHealth: null };
  }

  const latestHealth = projections[projections.length - 1].cash_flow_health;

  return {
    projections: projections.map((p) => ({
      month: p.projection_month,
      year: p.projection_year,
      income: p.projected_income,
      expenses: p.projected_expenses,
      emiObligation: p.projected_emi_obligation,
      surplusDeficit: p.projected_surplus_deficit,
      health: p.cash_flow_health,
    })),
    cashflowHealth: latestHealth,
  };
};

module.exports = {
  getLoanRisk,
  getCashFlow,
};
