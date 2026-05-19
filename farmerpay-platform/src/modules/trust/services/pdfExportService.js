/**
 * PDF Export Service — TRUST v2
 *
 * Resolves a snapshotUuid, assembles the full DTO, and renders a
 * single-page Sanction Review PDF. No direct SQL — reads through
 * the service layer.
 */

const logger = require('../../../shared/utils/logger');
const { rollupGroups } = require('./groupRollup');
const template = require('../templates/sanctionReview.pdf.template');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Exports a TRUST snapshot as a PDF buffer.
 *
 * @param {string} snapshotUuid - trust_score_history.score_history_uuid
 * @returns {Promise<{ buffer: Buffer, filename: string }>}
 * @throws 404 TRUST_SNAPSHOT_NOT_FOUND | 410 TRUST_SNAPSHOT_INACTIVE
 */
const exportSnapshotPdf = async (snapshotUuid) => {
  const {
    TrustScoreHistory, TrustScoreCalculation, TrustSection, User,
  } = getDb();

  // ─── 1. Resolve snapshot ─────────────────────────────────────
  const snapshot = await TrustScoreHistory.findOne({
    where: { score_history_uuid: snapshotUuid },
    include: [{ model: User, as: 'farmer', attributes: ['id', 'first_name', 'last_name', 'village'] }],
  });

  if (!snapshot) {
    const err = new Error('Snapshot not found');
    err.statusCode = 404;
    err.errorCode = 'TRUST_SNAPSHOT_NOT_FOUND';
    throw err;
  }

  if (!snapshot.is_active) {
    const err = new Error('Snapshot is no longer active (superseded)');
    err.statusCode = 410;
    err.errorCode = 'TRUST_SNAPSHOT_INACTIVE';
    throw err;
  }

  // ─── 2. Load pillar calculations ─────────────────────────────
  const calculations = await TrustScoreCalculation.findAll({
    where: { farmer_id: snapshot.farmer_id, is_active: true },
    include: [{ model: TrustSection, as: 'section', attributes: ['pillar_code', 'section_name', 'weight_in_total_score'] }],
    order: [['section_id', 'ASC']],
  });

  const pillars = calculations.map((c) => ({
    code: c.section?.pillar_code || '—',
    name: c.section?.section_name || '—',
    weight: c.section ? parseFloat(c.section.weight_in_total_score) / 100 : 0,
    score: c.normalized_score,
    rawPoints: c.raw_points,
    maxPoints: c.max_possible_points,
    contribution: parseFloat(c.contribution_to_total),
  }));

  // ─── 3. Derive group rollups ─────────────────────────────────
  const groups = rollupGroups(snapshot.section_scores || {});

  // ─── 4. Read evidence ────────────────────────────────────────
  let evidence = [];
  try {
    const evidenceCollector = require('./evidenceCollector');
    evidence = await evidenceCollector.readForSnapshot(snapshot.id, snapshot.farmer_id);
  } catch (err) {
    logger.warn(`[TRUST/pdf] Evidence read failed: ${err.message}`);
  }

  // ─── 5. Assemble DTO ────────────────────────────────────────
  const farmer = snapshot.farmer;
  const dto = {
    farmer: {
      name: farmer ? `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim() : '—',
      farmerId: snapshot.farmer_id,
      village: farmer?.village || '—',
    },
    snapshotUuid: snapshot.score_history_uuid,
    score: snapshot.total_score_1000,
    decision: snapshot.decision,
    computedAt: snapshot.calculated_at,
    pillars,
    groups,
    evidence,
    cibil: {
      flag: snapshot.cibil_flag || false,
      overdueInr: snapshot.cibil_overdue_inr,
      issuer: snapshot.cibil_overdue_issuer,
    },
  };

  // ─── 6. Render ──────────────────────────────────────────────
  const buffer = await template.render(dto);

  const filename = `trust-review-${snapshotUuid.slice(0, 8)}-${Date.now()}.pdf`;

  logger.info(`[TRUST/pdf] Generated ${filename} (${buffer.length} bytes) for farmer ${snapshot.farmer_id}`);

  return { buffer, filename };
};

module.exports = { exportSnapshotPdf };
