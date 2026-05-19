/**
 * Evidence Collector — TRUST v2
 * Gathers evidence from:
 *   1. trust_responses (questionnaire answers) — farmer-declared + agent-verified
 *   2. trust_evidence (external: AA, CIBIL, ROOTS, POP, PMFBY)
 *
 * Used by:
 *   - pillarEngine: as input bundle for scoring
 *   - getLatestSnapshot: to union evidence for the DTO
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { PILLAR_CODE_BY_SECTION_CODE } = require('../constants');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Collects ALL scoring inputs for a farmer, grouped by pillar.
 * Called during computeSnapshot to build the evidence bundle.
 *
 * @param {number} farmerId
 * @returns {Promise<Object>} Evidence bundle keyed by pillar code.
 */
const collectForScoring = async (farmerId) => {
  const {
    TrustSection, TrustQuestion, TrustQuestionChoice, TrustQuestionCondition,
    TrustTextInputScoringRange, TrustResponse, TrustResponseChoice, TrustResponseNumeric,
    TrustFarmerActivity, TrustFarmerActivityMix,
    TrustHouseholdExpense, TrustLoanLiability, TrustLoanRepayment,
  } = getDb();

  // 1. Load sections (for pillar mapping)
  const sections = await TrustSection.findAll({
    where: { is_active: true },
    include: [{
      model: TrustQuestion, as: 'questions',
      where: { is_active: true },
      required: false,
      include: [
        { model: TrustQuestionChoice, as: 'choices', where: { is_active: true }, required: false },
        { model: TrustQuestionCondition, as: 'conditions', where: { is_active: true }, required: false },
        { model: TrustTextInputScoringRange, as: 'scoringRanges', where: { is_active: true }, required: false },
      ],
    }],
    order: [['section_order', 'ASC']],
  });

  // 2. Load responses
  const responses = await TrustResponse.findAll({
    where: { farmer_id: farmerId, is_active: true },
    include: [
      { model: TrustResponseChoice, as: 'choiceResponses', include: [{ model: TrustQuestionChoice, as: 'choice' }] },
      { model: TrustResponseNumeric, as: 'numericResponse' },
    ],
  });

  // Map question → section
  const questionSectionMap = {};
  sections.forEach((s) => {
    (s.questions || []).forEach((q) => { questionSectionMap[q.id] = s; });
  });

  // Group responses by section
  const responsesBySection = {};
  responses.forEach((r) => {
    const section = questionSectionMap[r.question_id];
    if (section) {
      const id = section.id;
      if (!responsesBySection[id]) responsesBySection[id] = [];
      responsesBySection[id].push(r);
    }
  });

  // 3. Load livelihood (parallel)
  const [activities, activityMix, expenses, liabilities, repayments] = await Promise.all([
    TrustFarmerActivity.findAll({ where: { farmer_id: farmerId, is_active: true }, order: [['is_primary', 'DESC']] }),
    TrustFarmerActivityMix.findAll({ where: { farmer_id: farmerId, is_active: true }, order: [['reference_year', 'DESC']] }),
    TrustHouseholdExpense.findAll({
      where: { farmer_id: farmerId, is_active: true },
      order: [['reference_year', 'DESC'], ['reference_month', 'DESC']],
      limit: 3,
    }),
    TrustLoanLiability.findAll({
      where: { farmer_id: farmerId, is_active: true, status: { [Op.in]: ['ACTIVE', 'RESTRUCTURED'] } },
    }),
    TrustLoanRepayment.findAll({
      where: { farmer_id: farmerId, is_active: true },
      order: [['due_date', 'DESC']],
      limit: 24,
    }),
  ]);

  // 4. Collect external signals via module public APIs (non-blocking).
  // Every external evidence read is logged so auditors can reconstruct
  // which data sources fed a given score calculation. `trust.evidence_pull`
  // is the structured event name downstream log pipelines should index on.
  let aaAnalysis = null;
  let rootsLand = null;
  try {
    const { AaFinancialAnalysis } = getDb();
    if (AaFinancialAnalysis) {
      aaAnalysis = await AaFinancialAnalysis.findOne({
        where: { farmer_id: farmerId, is_active: true },
        order: [['created_at', 'DESC']],
      });
      logger.info('trust.evidence_pull', {
        event: 'trust.evidence_pull', source: 'aa', farmerId,
        found: !!aaAnalysis, analysisUuid: aaAnalysis?.analysis_uuid || null,
      });
    }
  } catch (err) {
    logger.warn(`[TRUST/evidence] AA analysis fetch failed: ${err.message}`);
  }

  try {
    const { FarmRegister } = getDb();
    if (FarmRegister) {
      rootsLand = await FarmRegister.findAll({
        where: { farmer_id: farmerId, is_active: true },
      });
      logger.info('trust.evidence_pull', {
        event: 'trust.evidence_pull', source: 'roots_land', farmerId,
        parcels: rootsLand.length,
      });
    }
  } catch (err) {
    logger.warn(`[TRUST/evidence] ROOTS land fetch failed: ${err.message}`);
  }

  // 4b. Collect ROOTS compliance evidence (non-blocking)
  let rootsCompliance = null;
  try {
    rootsCompliance = await collectRootsEvidence(farmerId);
  } catch (err) {
    logger.warn(`[TRUST/evidence] ROOTS compliance fetch failed: ${err.message}`);
  }

  // 5. Assemble per-pillar evidence bundle
  const bundle = {};
  for (const section of sections) {
    const pillarCode = section.pillar_code || PILLAR_CODE_BY_SECTION_CODE[section.section_code];
    if (!pillarCode) continue;

    bundle[pillarCode] = {
      section,
      sectionCode: section.section_code,
      pillarCode,
      responses: responsesBySection[section.id] || [],
      activities: pillarCode === 'P2' || pillarCode === 'P3' ? activities : [],
      activityMix: pillarCode === 'P3' ? activityMix : [],
      expenses: pillarCode === 'P3' || pillarCode === 'P4' ? expenses : [],
      liabilities: pillarCode === 'P4' ? liabilities : [],
      repayments: pillarCode === 'P4' ? repayments : [],
      aaAnalysis: pillarCode === 'P3' || pillarCode === 'P4' ? aaAnalysis : null,
      rootsLand: pillarCode === 'P2' || pillarCode === 'P5' ? rootsLand : null,
      rootsCompliance: pillarCode === 'P4' ? rootsCompliance : null,
    };
  }

  return { sections, bundle, activities, activityMix, expenses, liabilities, repayments, aaAnalysis, rootsLand, rootsCompliance };
};

/**
 * Reads evidence for a persisted snapshot (for the read DTO).
 * Unions trust_evidence + trust_responses for the snapshot.
 *
 * @param {number} scoreHistoryId
 * @param {number} farmerId
 * @returns {Promise<Array>} Evidence DTO array
 */
const readForSnapshot = async (scoreHistoryId, farmerId) => {
  const { TrustEvidence, TrustResponse, TrustQuestion, TrustSection } = getDb();

  // External evidence rows
  const externalRows = await TrustEvidence.findAll({
    where: { score_history_id: scoreHistoryId, is_active: true },
  });

  const external = externalRows.map((e) => ({
    pillarCode: e.pillar_code,
    featureCode: e.feature_code,
    band: e.band,
    source: e.source,
    fetchedAt: e.fetched_at,
    rawRef: e.raw_ref,
    confidence: e.confidence,
  }));

  // Questionnaire-based evidence (latest response per question for this farmer)
  const questionnaireResponses = await TrustResponse.findAll({
    where: { farmer_id: farmerId, is_active: true },
    include: [{
      model: TrustQuestion, as: 'question',
      include: [{ model: TrustSection, as: 'section' }],
    }],
    order: [['response_timestamp', 'DESC']],
  });

  // Deduplicate: one entry per question (latest)
  const seen = new Set();
  const questionnaire = [];
  for (const r of questionnaireResponses) {
    if (seen.has(r.question_id)) continue;
    seen.add(r.question_id);

    const section = r.question?.section;
    const pillarCode = section?.pillar_code || PILLAR_CODE_BY_SECTION_CODE[section?.section_code];
    if (!pillarCode) continue;

    questionnaire.push({
      pillarCode,
      featureCode: `Q_${r.question_id}`,
      band: null,
      source: 'QUESTIONNAIRE',
      fetchedAt: r.response_timestamp,
      rawRef: null,
      confidence: 'HIGH',
    });
  }

  return [...external, ...questionnaire];
};

/**
 * Builds external evidence items to persist in trust_evidence after scoring.
 * Only includes items from external sources (AA, CIBIL, ROOTS, POP, PMFBY).
 *
 * @param {Object} scoringResult - Per-pillar scoring result with feature_bands
 * @param {Object} externalData - { aaAnalysis, rootsLand, cibil }
 * @returns {Array} Items ready for trust_evidence bulk insert
 */
const buildExternalEvidenceItems = (scoringResult, externalData) => {
  const items = [];
  const now = new Date();

  // AA-sourced evidence
  if (externalData.aaAnalysis) {
    items.push({
      pillar_code: 'P3',
      feature_code: 'AA_FINANCIAL_HEALTH',
      band: Math.min(5, Math.max(1, Math.ceil((externalData.aaAnalysis.overall_score || 50) / 20))),
      source: 'AA',
      fetched_at: externalData.aaAnalysis.created_at || now,
      raw_ref: externalData.aaAnalysis.analysis_uuid || null,
      confidence: 'HIGH',
    });
  }

  // CIBIL-sourced evidence
  if (externalData.cibil && externalData.cibil.flag) {
    items.push({
      pillar_code: 'P4',
      feature_code: 'CIBIL_OVERDUE',
      band: 1, // Adverse
      source: 'CIBIL',
      fetched_at: now,
      raw_ref: null,
      confidence: 'HIGH',
    });
  }

  // ROOTS-sourced evidence
  if (externalData.rootsLand && externalData.rootsLand.length > 0) {
    items.push({
      pillar_code: 'P2',
      feature_code: 'ROOTS_LAND_VERIFIED',
      band: Math.min(5, Math.max(1, externalData.rootsLand.length)),
      source: 'ROOTS',
      fetched_at: now,
      raw_ref: null,
      confidence: 'HIGH',
    });
  }

  // ROOTS compliance evidence
  if (externalData.rootsCompliance && externalData.rootsCompliance.rootsTrustScore !== null) {
    const rc = externalData.rootsCompliance;
    const band = Math.ceil((rc.rootsTrustScore || 0) / 20); // 0-100 → 1-5
    items.push({
      pillar_code: 'P4',
      feature_code: 'ROOTS_COMPLIANCE',
      band: Math.min(5, Math.max(1, band)),
      source: 'ROOTS',
      fetched_at: now,
      raw_ref: JSON.stringify({ score: rc.rootsTrustScore, seasonCount: rc.seasonCount }),
      confidence: rc.dataCompleteness >= 80 ? 'HIGH' : rc.dataCompleteness >= 50 ? 'MEDIUM' : 'LOW',
    });
  }

  return items;
};

/* ====================================================================
 * collectRootsEvidence — ROOTS compliance signals for TRUST scoring
 * ==================================================================== */

const ROOTS_SIGNAL_WEIGHTS = {
  data_entry_consistency: 0.15,
  timing_compliance: 0.20,
  practice_adherence: 0.20,
  cost_rationality: 0.15,
  advisory_responsiveness: 0.10,
  variance_trend: 0.10,
  evidence_quality: 0.05,
  multi_livelihood_bonus: 0.05,
};

/**
 * Collect ROOTS compliance evidence for a farmer across all active activities.
 * Returns aggregated trust score (0-100) + breakdown + positive/negative signals.
 */
const collectRootsEvidence = async (farmerId) => {
  const { RootsComplianceSnapshot, SageAdvisory, CultivationCycle, SoilHealthRecord } = getDb();

  // Fetch all active compliance snapshots (latest per activity)
  const snapshots = await RootsComplianceSnapshot.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['snapshot_date', 'DESC']],
  });

  if (!snapshots || snapshots.length === 0) {
    return { rootsTrustScore: null, breakdown: {}, signals: { positive: [], negative: [] }, seasonCount: 0, dataCompleteness: 0, insufficient: true };
  }

  // Deduplicate: latest per activity_reference_id
  const latestByRef = {};
  snapshots.forEach((s) => {
    const key = `${s.activity_type}_${s.activity_reference_id}`;
    if (!latestByRef[key]) latestByRef[key] = s;
  });
  const latest = Object.values(latestByRef);

  // Count distinct seasons
  const seasons = new Set(latest.map((s) => s.season).filter(Boolean));
  const seasonCount = seasons.size;

  // Aggregate scores
  const avgOrNull = (arr) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

  const timingScores = latest.map((s) => parseFloat(s.timing_compliance_score || 0)).filter((v) => !isNaN(v));
  const practiceScores = latest.map((s) => parseFloat(s.practice_compliance_score || 0)).filter((v) => !isNaN(v));
  const costScores = latest.map((s) => parseFloat(s.cost_compliance_score || 0)).filter((v) => !isNaN(v));
  const dataCompleteness = latest.map((s) => parseFloat(s.data_completeness_pct || 0));
  const avgDataCompleteness = avgOrNull(dataCompleteness) || 0;

  // Check if sufficient data
  if (avgDataCompleteness < 40) {
    return {
      rootsTrustScore: null, breakdown: {},
      signals: { positive: [], negative: ['Insufficient operational data (<40% completeness)'] },
      seasonCount, dataCompleteness: avgDataCompleteness, insufficient: true,
    };
  }

  const breakdown = {};
  let weightedTotal = 0;

  // 1. Data entry consistency
  const entryConsistency = avgDataCompleteness;
  breakdown.data_entry_consistency = Math.round(entryConsistency * 10) / 10;
  weightedTotal += entryConsistency * ROOTS_SIGNAL_WEIGHTS.data_entry_consistency;

  // 2. Timing compliance
  const timingAvg = avgOrNull(timingScores) || 50;
  breakdown.timing_compliance = Math.round(timingAvg * 10) / 10;
  weightedTotal += timingAvg * ROOTS_SIGNAL_WEIGHTS.timing_compliance;

  // 3. Practice adherence
  const practiceAvg = avgOrNull(practiceScores) || 50;
  breakdown.practice_adherence = Math.round(practiceAvg * 10) / 10;
  weightedTotal += practiceAvg * ROOTS_SIGNAL_WEIGHTS.practice_adherence;

  // 4. Cost rationality
  const costAvg = avgOrNull(costScores) || 50;
  breakdown.cost_rationality = Math.round(costAvg * 10) / 10;
  weightedTotal += costAvg * ROOTS_SIGNAL_WEIGHTS.cost_rationality;

  // 5. Advisory responsiveness (from SAGE acknowledged advisories)
  let advisoryScore = 50;
  try {
    const totalAdvisories = await SageAdvisory.count({ where: { farmer_id: farmerId, is_active: true } });
    const acknowledged = await SageAdvisory.count({ where: { farmer_id: farmerId, is_active: true, acknowledged_at: { [Op.not]: null } } });
    advisoryScore = totalAdvisories > 0 ? Math.round((acknowledged / totalAdvisories) * 100) : 50;
  } catch {}
  breakdown.advisory_responsiveness = advisoryScore;
  weightedTotal += advisoryScore * ROOTS_SIGNAL_WEIGHTS.advisory_responsiveness;

  // 6. Variance trend (compare to older snapshots if available)
  let trendScore = 50; // neutral if no previous data
  const olderSnapshots = snapshots.filter((s) => {
    const refKey = `${s.activity_type}_${s.activity_reference_id}`;
    return latestByRef[refKey] && latestByRef[refKey].id !== s.id;
  });
  if (olderSnapshots.length > 0) {
    const prevAvg = avgOrNull(olderSnapshots.map((s) => parseFloat(s.overall_compliance_score || 0)).filter((v) => !isNaN(v)));
    const currAvg = avgOrNull(latest.map((s) => parseFloat(s.overall_compliance_score || 0)).filter((v) => !isNaN(v)));
    if (prevAvg && currAvg) {
      trendScore = currAvg >= prevAvg ? Math.min(100, 60 + (currAvg - prevAvg)) : Math.max(0, 40 - (prevAvg - currAvg));
    }
  }
  breakdown.variance_trend = Math.round(trendScore * 10) / 10;
  weightedTotal += trendScore * ROOTS_SIGNAL_WEIGHTS.variance_trend;

  // 7. Evidence quality
  const totalPhotos = latest.reduce((s, snap) => s + (snap.photo_evidence_count || 0), 0);
  const sathiVerifiedCount = latest.filter((s) => s.sathi_verified).length;
  const soilCount = await SoilHealthRecord.count({
    where: { field_id: { [Op.in]: latest.map((s) => s.activity_reference_id).filter(Boolean) }, is_active: true },
  }).catch(() => 0);
  const evidenceScore = Math.min(100, (totalPhotos > 0 ? 30 : 0) + (sathiVerifiedCount > 0 ? 40 : 0) + (soilCount > 0 ? 30 : 0));
  breakdown.evidence_quality = evidenceScore;
  weightedTotal += evidenceScore * ROOTS_SIGNAL_WEIGHTS.evidence_quality;

  // 8. Multi-livelihood bonus
  const highComplianceActivities = latest.filter((s) => parseFloat(s.overall_compliance_score || 0) >= 70);
  const multiBonus = latest.length > 1 && highComplianceActivities.length === latest.length ? 100 : 0;
  breakdown.multi_livelihood_bonus = multiBonus;
  weightedTotal += multiBonus * ROOTS_SIGNAL_WEIGHTS.multi_livelihood_bonus;

  const rootsTrustScore = Math.round(Math.min(100, Math.max(0, weightedTotal)) * 10) / 10;

  // Build signals
  const positive = [];
  const negative = [];

  if (entryConsistency >= 80) positive.push(`${Math.round(entryConsistency)}% data entry consistency`);
  if (timingAvg >= 80) positive.push('Stages completed on time');
  if (practiceAvg >= 80) positive.push('Strong PoP adherence');
  if (advisoryScore >= 70) positive.push('Responsive to advisories');
  if (sathiVerifiedCount > 0) positive.push('Sathi-verified field data');
  if (soilCount > 0) positive.push('Soil health card captured');
  if (multiBonus > 0) positive.push('All activities at 70%+ compliance');

  if (entryConsistency < 60) negative.push(`Low data entry (${Math.round(entryConsistency)}%)`);
  if (timingAvg < 50) negative.push('Multiple stages delayed or missed');
  if (costAvg < 40) negative.push('Cost significantly deviates from benchmarks');
  if (trendScore < 40) negative.push('Compliance declining from previous season');
  if (totalPhotos === 0) negative.push('No photo evidence submitted');

  return {
    rootsTrustScore,
    breakdown,
    signals: { positive, negative },
    seasonCount,
    dataCompleteness: Math.round(avgDataCompleteness),
    insufficient: false,
  };
};

module.exports = { collectForScoring, readForSnapshot, buildExternalEvidenceItems, collectRootsEvidence };
