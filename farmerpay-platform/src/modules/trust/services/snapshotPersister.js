/**
 * Snapshot Persister — TRUST v2
 * Persists the full scoring bundle in a single transaction:
 *   a. INSERT trust_score_history (new snapshot)
 *   b. UPDATE prior snapshot → is_active = false
 *   c. INSERT 6 trust_score_calculations (flip older rows is_active=false)
 *   d. INSERT trust_evidence rows (external sources only)
 *   e. INSERT trust_audit_events row
 */

const { generateUUID } = require('../../../shared/utils/uuidHelper');
const logger = require('../../../shared/utils/logger');
const { logEvent } = require('./auditLogger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Persists a computed snapshot atomically.
 *
 * @param {Object} params
 * @param {number} params.farmerId
 * @param {number} params.totalScore1000 - 0..1000
 * @param {number} params.legacyScore - 0..100
 * @param {string} params.legacyBand - poor/fair/good/excellent
 * @param {string} params.decision - SANCTION/RECONSIDER/REJECT
 * @param {Object} params.cibil - { flag, overdueInr, issuer }
 * @param {string} params.inputsFingerprint - SHA-256 hex
 * @param {Object} params.sectionScoresJson - { P1: { score, weight, contribution }, ... }
 * @param {Object} params.pillarResults - Per-pillar scoring results
 * @param {Array}  params.sections - TrustSection rows (for section_id mapping)
 * @param {Array}  params.externalEvidenceItems - Items for trust_evidence
 * @param {string} [params.reason] - Optional recompute reason
 * @returns {Promise<Object>} The created TrustScoreHistory row
 */
const persist = async ({
  farmerId, totalScore1000, legacyScore, legacyBand, decision,
  cibil, inputsFingerprint, sectionScoresJson, pillarResults,
  sections, externalEvidenceItems, reason,
}) => {
  const {
    TrustScoreHistory, TrustScoreCalculation, TrustEvidence, sequelize: seq,
  } = getDb();

  const transaction = await seq.transaction();

  try {
    // (b) Find & deactivate prior active snapshot
    const priorSnapshot = await TrustScoreHistory.findOne({
      where: { farmer_id: farmerId, is_active: true },
      order: [['calculated_at', 'DESC']],
      transaction,
    });

    if (priorSnapshot) {
      await TrustScoreHistory.update(
        { is_active: false },
        { where: { id: priorSnapshot.id }, transaction },
      );
    }

    // (a) INSERT new snapshot
    const snapshot = await TrustScoreHistory.create({
      score_history_uuid: generateUUID(),
      farmer_id: farmerId,
      total_trust_score: legacyScore,
      score_band: legacyBand,
      section_scores: sectionScoresJson,
      calculated_at: new Date(),
      is_active: true,
      // v2 fields
      total_score_1000: totalScore1000,
      decision,
      cibil_flag: cibil.flag,
      cibil_overdue_inr: cibil.overdueInr,
      cibil_overdue_issuer: cibil.issuer,
      inputs_fingerprint: inputsFingerprint,
      previous_snapshot_id: priorSnapshot ? priorSnapshot.id : null,
    }, { transaction });

    // (c) Deactivate old calculations for this farmer, then insert new ones
    await TrustScoreCalculation.update(
      { is_active: false },
      { where: { farmer_id: farmerId, is_active: true }, transaction },
    );

    const calculationRows = [];
    for (const section of sections) {
      const pillarCode = section.pillar_code;
      const result = pillarResults[pillarCode];
      if (!result) continue;

      calculationRows.push({
        calculation_uuid: generateUUID(),
        farmer_id: farmerId,
        section_id: section.id,
        raw_points: result.rawPoints,
        max_possible_points: result.maxPossiblePoints,
        normalized_score: result.normalizedScore,
        contribution_to_total: Math.round(result.normalizedScore * (parseFloat(section.weight_in_total_score) / 100) * 10),
        calculated_at: new Date(),
        calculation_basis: `v2_pillar_${pillarCode}`,
        is_active: true,
      });
    }

    await TrustScoreCalculation.bulkCreate(calculationRows, { transaction });

    // (d) INSERT external evidence
    if (externalEvidenceItems && externalEvidenceItems.length > 0) {
      const evidenceRows = externalEvidenceItems.map((item) => ({
        ...item,
        evidence_uuid: generateUUID(),
        farmer_id: farmerId,
        score_history_id: snapshot.id,
        is_active: true,
      }));
      await TrustEvidence.bulkCreate(evidenceRows, { transaction });
    }

    // (e) Audit event
    await logEvent({
      farmerId,
      actorType: 'SYSTEM',
      actorId: null,
      action: 'SNAPSHOT_CREATED',
      payload: {
        fingerprint: inputsFingerprint,
        sources: (externalEvidenceItems || []).map((e) => e.source),
        reason: reason || null,
        totalScore1000,
        decision,
      },
      scoreHistoryId: snapshot.id,
      transaction,
    });

    await transaction.commit();

    logger.info(`[TRUST/persist] Snapshot ${snapshot.score_history_uuid} persisted for farmer ${farmerId}: ${totalScore1000} → ${decision}`);

    return snapshot;
  } catch (err) {
    await transaction.rollback();
    logger.error(`[TRUST/persist] Snapshot persist failed for farmer ${farmerId}: ${err.message}`);
    throw err;
  }
};

module.exports = { persist };
