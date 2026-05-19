/**
 * Market Risk Scan Service — PULSE Phase 3 → SENTINEL bridge
 *
 * Daily cron-driven scan that translates the PULSE distress-sale signal
 * into a persistent SENTINEL EwsSignal row of type 'market_risk'. The
 * banker dashboard's existing distress_sale_risk panel is in-memory
 * (computed on each /banker/portfolio/early-warnings call), but the
 * SENTINEL feed needs persistent rows for the recovery workflow,
 * historical reporting, and downstream alerting.
 *
 * Logic mirrors bankerAnalyticsService.earlyWarnings() distress branch:
 *   - Active loan + harvestable cycle (harvesting | post_harvest)
 *   - Latest pulse_price_records.modal_price for the linked commodity
 *   - cost_per_qtl from cultivation_cycle_expense_summaries / harvest_records
 *   - Severity: ≤5% loss = weak, 5-15% = moderate, >15% = strong
 *
 * Idempotent — uses a deterministic signal_uuid per (application_id, day)
 * so re-running the scan the same day updates rather than duplicates.
 *
 * Off when config.features.pulse.sentinelScanEnabled is false.
 */

const crypto = require('crypto');
const { Op } = require('sequelize');
const config = require('../../../config');
const logger = require('../../../shared/utils/logger');

let db = null;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const signalUuidFor = (applicationId, dayIso) => {
  const h = crypto
    .createHash('sha1')
    .update(`market_risk|${applicationId}|${dayIso}`)
    .digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    h.slice(12, 16),
    h.slice(16, 20),
    h.slice(20, 32),
  ].join('-');
};

const severityFor = (lossPct) => {
  if (lossPct >= 0.15) return 'strong';
  if (lossPct >= 0.05) return 'moderate';
  return 'weak';
};

// Module-level mutex: prevents concurrent scans stacking if the cron fires
// while a previous run is still executing, or if a future endpoint is added
// that exposes scanAllActive to user callers. Also enforces a minimum
// interval between successful runs to bound CIBIL/Pulse cost if someone
// loops the trigger endpoint.
let scanInFlight = false;
let lastScanCompletedAt = 0;
const MIN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Run a full scan over every active/disbursed loan with a harvestable
 * cycle. Upserts EwsSignal rows. Returns a summary for the cron logger.
 */
const scanAllActive = async () => {
  if (!config.features.pulse.sentinelScanEnabled) {
    return { skipped: true, reason: 'PULSE_SENTINEL_SCAN_ENABLED=false' };
  }

  if (scanInFlight) {
    return { skipped: true, reason: 'scan_in_flight' };
  }
  if (Date.now() - lastScanCompletedAt < MIN_INTERVAL_MS) {
    return { skipped: true, reason: 'rate_limited', nextAllowedAt: lastScanCompletedAt + MIN_INTERVAL_MS };
  }
  scanInFlight = true;

  try {
    return await _scanAllActiveBody();
  } finally {
    lastScanCompletedAt = Date.now();
    scanInFlight = false;
  }
};

const _scanAllActiveBody = async () => {
  const startedAt = Date.now();
  const {
    LoanApplication,
    CultivationCycle,
    CultivationCycleExpenseSummary,
    HarvestRecord,
    CropMaster,
    PulseCommodity,
    PulsePriceRecord,
    EwsSignal,
  } = getDb();

  let scanned = 0;
  let emitted = 0;
  let cleared = 0;
  let skipped = 0;
  const errors = [];
  const today = todayIso();

  const activeLoans = await LoanApplication.findAll({
    where: {
      is_active: true,
      application_status: { [Op.in]: ['disbursed', 'active'] },
    },
    raw: true,
  });

  for (const loan of activeLoans) {
    scanned += 1;
    try {
      // Find any harvestable cycle for this farmer
      const cycle = await CultivationCycle.findOne({
        where: {
          farmer_id: loan.farmer_id,
          cycle_status: { [Op.in]: ['harvesting', 'post_harvest'] },
          is_active: true,
        },
        raw: true,
      });
      if (!cycle) {
        skipped += 1;
        continue;
      }

      const expenseSummary = await CultivationCycleExpenseSummary.findOne({
        where: { cycle_id: cycle.cycle_uuid, is_active: true },
        raw: true,
      });
      const harvestRecord = await HarvestRecord.findOne({
        where: { cycle_id: cycle.cycle_uuid, is_active: true },
        raw: true,
      });
      if (!expenseSummary || !harvestRecord) {
        skipped += 1;
        continue;
      }

      const totalExpenses = parseFloat(expenseSummary.total_expenses || 0);
      const harvestKg = parseFloat(harvestRecord.total_harvest_quantity_kg || 0);
      if (totalExpenses <= 0 || harvestKg <= 0) {
        skipped += 1;
        continue;
      }
      const costPerQtl = totalExpenses / (harvestKg / 100);

      const cropMaster = await CropMaster.findOne({
        where: { crop_id: cycle.crop_id, is_active: true },
        raw: true,
      });
      if (!cropMaster) {
        skipped += 1;
        continue;
      }

      const commodity = await PulseCommodity.findOne({
        where: {
          commodity_name: { [Op.like]: `%${cropMaster.crop_name.split(' ')[0]}%` },
          is_active: true,
        },
        raw: true,
      });
      if (!commodity) {
        skipped += 1;
        continue;
      }

      const latestPrice = await PulsePriceRecord.findOne({
        where: { commodity_id: commodity.commodity_id, is_active: true },
        order: [['record_date', 'DESC']],
        raw: true,
      });
      if (!latestPrice) {
        skipped += 1;
        continue;
      }
      const modalPrice = parseFloat(latestPrice.modal_price || latestPrice.closing_price || 0);
      if (modalPrice <= 0) {
        skipped += 1;
        continue;
      }

      // The signal threshold is 5% under cost. Above that we proactively
      // CLEAR any prior market_risk row from earlier in the day so we
      // don't leave stale signals dangling after prices recover.
      const lossPerQtl = costPerQtl - modalPrice;
      const lossPct = lossPerQtl / costPerQtl;

      const signalUuid = signalUuidFor(loan.id, today);

      if (lossPct < 0.05) {
        // No risk — clear any prior signal for today
        const existing = await EwsSignal.findOne({
          where: { signal_uuid: signalUuid },
          attributes: ['id', 'is_active'],
          raw: true,
        });
        if (existing && existing.is_active) {
          await EwsSignal.update({ is_active: false }, { where: { id: existing.id } });
          cleared += 1;
        }
        continue;
      }

      const signalData = {
        commodityId: commodity.commodity_id,
        commodityName: commodity.commodity_name,
        mandiId: latestPrice.mandi_id,
        modalPrice: Math.round(modalPrice),
        costPerQtl: Math.round(costPerQtl),
        lossPerQtl: Math.round(lossPerQtl),
        lossPct: Math.round(lossPct * 1000) / 10, // %, 1 decimal
        cycleUuid: cycle.cycle_uuid,
        recordDate: latestPrice.record_date,
      };

      const existing = await EwsSignal.findOne({
        where: { signal_uuid: signalUuid },
        attributes: ['id'],
        raw: true,
      });
      if (existing) {
        await EwsSignal.update(
          {
            signal_strength: severityFor(lossPct),
            signal_timestamp: new Date(),
            signal_data: signalData,
            is_active: true,
          },
          { where: { id: existing.id } },
        );
      } else {
        await EwsSignal.create({
          signal_uuid: signalUuid,
          application_id: loan.id,
          signal_type: 'market_risk',
          signal_strength: severityFor(lossPct),
          signal_timestamp: new Date(),
          signal_data: signalData,
          is_active: true,
        });
      }
      emitted += 1;
    } catch (err) {
      errors.push(`loan ${loan.id}: ${err.message}`);
      logger.error(`[marketRiskScanService] scan failed for loan ${loan.id}: ${err.message}`, { stack: err.stack });
    }
  }

  const summary = {
    scanned,
    emitted,
    cleared,
    skipped,
    errors: errors.length,
    durationMs: Date.now() - startedAt,
  };
  logger.info(`[marketRiskScanService] scanAllActive finished: ${JSON.stringify(summary)}`);
  return summary;
};

module.exports = {
  scanAllActive,
  // Exported for tests
  signalUuidFor,
  severityFor,
};
