/**
 * Sanction Review PDF Template — TRUST v2
 *
 * Renders a single-page PDF summarising:
 *   - Farmer header (name, ID, village)
 *   - Score + decision badge
 *   - 6 pillar bar chart
 *   - Table-2 group rollups
 *   - Evidence sources
 *   - Audit trail link
 *
 * Accepts a pre-assembled DTO — no SQL inside this module.
 * Uses pdfkit for generation.
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ─── Fonts ──────────────────────────────────────────────────────

const FONT_DIR = path.resolve(__dirname, '../../../assets/fonts');
const NOTO_DEVANAGARI = path.join(FONT_DIR, 'NotoSansDevanagari-Regular.ttf');
const hasDevanagariFont = fs.existsSync(NOTO_DEVANAGARI);

// ─── Colour Palette ─────────────────────────────────────────────

const COLORS = {
  SANCTION: '#166534',
  RECONSIDER: '#B45309',
  REJECT: '#B91C1C',
  headerBg: '#F0FDF4',
  pillarBar: '#22C55E',
  pillarBg: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#D1D5DB',
  white: '#FFFFFF',
};

// ─── Public API ─────────────────────────────────────────────────

/**
 * Renders the sanction review PDF to a Buffer.
 *
 * @param {Object} dto - Snapshot DTO (same shape as getLatestSnapshot response)
 * @param {Object} dto.farmer - { name, farmerId, village }
 * @param {string} dto.snapshotUuid
 * @param {number} dto.score - 0..1000
 * @param {string} dto.decision - SANCTION | RECONSIDER | REJECT
 * @param {string} dto.computedAt - ISO date string
 * @param {Array}  dto.pillars - [{ code, name, weight, score, rawPoints, maxPoints, contribution }]
 * @param {Array}  dto.groups - [{ groupCode, groupLabel, score, deltaVsBenchmark }]
 * @param {Array}  dto.evidence - [{ pillarCode, featureCode, source, confidence }]
 * @param {Object} [dto.cibil] - { flag, overdueInr, issuer }
 * @returns {Promise<Buffer>} PDF file as buffer
 */
const render = (dto) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        info: {
          Title: `TRUST Sanction Review — ${dto.farmer?.name || 'Farmer'}`,
          Author: 'FarmerPay Platform',
          Subject: `Snapshot ${dto.snapshotUuid}`,
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Register Devanagari font if available
      if (hasDevanagariFont) {
        doc.registerFont('NotoDevanagari', NOTO_DEVANAGARI);
      }

      const pageWidth = 515; // A4 width minus margins

      // ─── Header ─────────────────────────────────────────
      drawHeader(doc, dto, pageWidth);

      // ─── Score + Decision ───────────────────────────────
      drawScoreSection(doc, dto, pageWidth);

      // ─── Pillar Bar Chart ──────────────────────────────
      drawPillarChart(doc, dto.pillars || [], pageWidth);

      // ─── Table-2 Group Rollups ─────────────────────────
      drawGroupTable(doc, dto.groups || [], pageWidth);

      // ─── Evidence Sources ──────────────────────────────
      drawEvidenceSources(doc, dto.evidence || [], pageWidth);

      // ─── CIBIL Flag ────────────────────────────────────
      if (dto.cibil && dto.cibil.flag) {
        drawCibilWarning(doc, dto.cibil, pageWidth);
      }

      // ─── Footer ────────────────────────────────────────
      drawFooter(doc, dto, pageWidth);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ─── Drawing Functions ──────────────────────────────────────────

function drawHeader(doc, dto, pageWidth) {
  const farmer = dto.farmer || {};

  // Background bar
  doc.rect(40, doc.y, pageWidth, 50).fill(COLORS.headerBg);

  doc.fillColor(COLORS.textPrimary).fontSize(16);

  // Use Devanagari font for name if available (may contain Hindi)
  if (hasDevanagariFont) {
    doc.font('NotoDevanagari');
  }
  doc.text(farmer.name || 'Farmer', 50, doc.y + 12, { width: pageWidth - 20 });
  doc.font('Helvetica');

  doc.fontSize(9).fillColor(COLORS.textSecondary);
  doc.text(
    `ID: ${farmer.farmerId || '—'}  |  Village: ${farmer.village || '—'}  |  Snapshot: ${dto.snapshotUuid || '—'}`,
    50,
    doc.y + 2,
    { width: pageWidth - 20 },
  );

  doc.moveDown(1.5);
}

function drawScoreSection(doc, dto, pageWidth) {
  const decision = dto.decision || 'REJECT';
  const color = COLORS[decision] || COLORS.REJECT;

  doc.fontSize(11).fillColor(COLORS.textPrimary).text('TRUST Score', 40);

  // Score number
  doc.fontSize(36).fillColor(color).text(`${dto.score ?? '—'}`, 40, doc.y, { continued: true });
  doc.fontSize(14).fillColor(COLORS.textSecondary).text(' / 1000', { baseline: 'bottom' });

  // Decision badge
  const badgeY = doc.y + 4;
  const badgeText = decision;
  const badgeWidth = doc.widthOfString(badgeText) + 20;
  doc.roundedRect(40, badgeY, badgeWidth, 22, 4).fill(color);
  doc.fontSize(11).fillColor(COLORS.white).text(badgeText, 50, badgeY + 5);

  doc.fillColor(COLORS.textSecondary).fontSize(8);
  doc.text(`Computed: ${dto.computedAt ? new Date(dto.computedAt).toLocaleDateString('en-IN') : '—'}`, 40 + badgeWidth + 12, badgeY + 5);

  doc.moveDown(2);
}

function drawPillarChart(doc, pillars, pageWidth) {
  if (pillars.length === 0) return;

  doc.fontSize(11).fillColor(COLORS.textPrimary).text('Pillar Scores (0–100)', 40);
  doc.moveDown(0.5);

  const barHeight = 16;
  const labelWidth = 120;
  const maxBarWidth = pageWidth - labelWidth - 50;

  for (const p of pillars) {
    const y = doc.y;
    const score = Math.min(100, Math.max(0, p.score || 0));

    // Label
    doc.fontSize(8).fillColor(COLORS.textPrimary);
    doc.text(`${p.code || ''} ${p.name || ''}`, 40, y, { width: labelWidth });

    // Background bar
    const barX = 40 + labelWidth;
    doc.rect(barX, y, maxBarWidth, barHeight).fill(COLORS.pillarBg);

    // Filled bar
    const filledWidth = (score / 100) * maxBarWidth;
    if (filledWidth > 0) {
      doc.rect(barX, y, filledWidth, barHeight).fill(COLORS.pillarBar);
    }

    // Score text
    doc.fontSize(8).fillColor(COLORS.textPrimary);
    doc.text(`${score}`, barX + maxBarWidth + 6, y + 3);

    doc.y = y + barHeight + 6;
  }

  doc.moveDown(1);
}

function drawGroupTable(doc, groups, pageWidth) {
  if (groups.length === 0) return;

  doc.fontSize(11).fillColor(COLORS.textPrimary).text('Group Rollups (Table-2)', 40);
  doc.moveDown(0.5);

  // Table header
  const colWidths = [120, 80, 100];
  const startX = 40;
  let y = doc.y;

  doc.fontSize(8).fillColor(COLORS.textSecondary);
  doc.text('Group', startX, y);
  doc.text('Score', startX + colWidths[0], y);
  doc.text('vs Benchmark', startX + colWidths[0] + colWidths[1], y);
  y += 14;

  doc.moveTo(startX, y).lineTo(startX + pageWidth - 40, y).strokeColor(COLORS.border).stroke();
  y += 4;

  doc.fontSize(9).fillColor(COLORS.textPrimary);
  for (const g of groups) {
    doc.text(g.groupLabel || g.groupCode, startX, y);
    doc.text(`${g.score ?? '—'}`, startX + colWidths[0], y);
    const delta = g.deltaVsBenchmark;
    doc.text(delta != null ? `${delta >= 0 ? '+' : ''}${delta}` : '—', startX + colWidths[0] + colWidths[1], y);
    y += 16;
  }

  doc.y = y;
  doc.moveDown(1);
}

function drawEvidenceSources(doc, evidence, pageWidth) {
  if (evidence.length === 0) return;

  doc.fontSize(11).fillColor(COLORS.textPrimary).text('Evidence Sources', 40);
  doc.moveDown(0.3);

  // Deduplicate by source
  const sourceMap = {};
  for (const e of evidence) {
    const src = e.source || 'UNKNOWN';
    if (!sourceMap[src]) sourceMap[src] = { count: 0, pillars: new Set() };
    sourceMap[src].count += 1;
    if (e.pillarCode) sourceMap[src].pillars.add(e.pillarCode);
  }

  doc.fontSize(8).fillColor(COLORS.textSecondary);
  for (const [source, info] of Object.entries(sourceMap)) {
    doc.text(`• ${source}: ${info.count} items (pillars: ${[...info.pillars].join(', ') || '—'})`, 50, doc.y);
  }

  doc.moveDown(1);
}

function drawCibilWarning(doc, cibil, pageWidth) {
  const y = doc.y;
  doc.rect(40, y, pageWidth, 30).fill('#FEF2F2');
  doc.fontSize(9).fillColor(COLORS.REJECT);
  doc.text(
    `CIBIL Alert: Overdue ${cibil.overdueInr ? `₹${Number(cibil.overdueInr).toLocaleString('en-IN')}` : '—'} ${cibil.issuer ? `(${cibil.issuer})` : ''}`,
    50,
    y + 8,
    { width: pageWidth - 20 },
  );
  doc.moveDown(1);
}

function drawFooter(doc, dto, pageWidth) {
  doc.fontSize(7).fillColor(COLORS.textSecondary);
  doc.text(
    `Generated by FarmerPay TRUST v2 — ${new Date().toISOString()} — Audit trail: /trust/audit/${dto.snapshotUuid || '—'}`,
    40,
    doc.page.height - 60,
    { width: pageWidth, align: 'center' },
  );
}

module.exports = { render };
