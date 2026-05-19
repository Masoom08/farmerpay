/**
 * PULSE demo "stress mode" — force the distress_sale_risk + nudge
 * pipeline to fire on the demo data.
 *
 * Phase 3's regenerated mock prices (~₹2275/qtl for wheat) sit well
 * above Ramesh's seeded cost-per-qtl (~₹1458/qtl), so the distress
 * pipeline correctly stays quiet by default. This script pegs the most
 * recent N days of wheat modal_price to 80% of his cost so:
 *
 *   - bankerAnalyticsService.earlyWarnings() emits distress_sale_risk
 *   - nudgeService.getActiveNudges() emits the price_window_closing /
 *     emi_pressure nudges with the harvest banner
 *   - marketRiskScanService.scanAllActive() will emit a market_risk
 *     EwsSignal on the next cron run
 *
 * Idempotent — re-running just refreshes the same N days. Reverse it
 * by re-running `node scripts/pulse-backfill.js` which restores the
 * deterministic mock walk.
 *
 * Usage:
 *   node scripts/pulse-demo-stress.js               # default 7 days
 *   node scripts/pulse-demo-stress.js --days=14
 *   node scripts/pulse-demo-stress.js --restore     # alias for backfill
 */

/* eslint-disable no-console */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const db = require('../src/shared/models');
const pulseIngestionService = require('../src/modules/pulse/services/pulseIngestionService');

const RAMESH_USER_ID = 1;

const parseArgs = () => {
  const out = { days: 7, restore: false };
  for (const a of process.argv.slice(2)) {
    const m = /^--days=(\d+)$/.exec(a);
    if (m) out.days = parseInt(m[1], 10);
    if (a === '--restore') out.restore = true;
  }
  return out;
};

const subDaysIso = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

(async () => {
  const { days, restore } = parseArgs();

  if (restore) {
    console.log('[pulse-demo-stress] --restore — running pulse-backfill instead');
    const summary = await pulseIngestionService.runBackfill({ days: 45 });
    console.log('[pulse-demo-stress] restored:', JSON.stringify(summary, null, 2));
    await db.sequelize.close();
    process.exit(0);
  }

  try {
    const {
      CultivationCycle,
      CultivationCycleExpenseSummary,
      HarvestRecord,
      PulseCommodity,
      PulsePriceRecord,
    } = db;

    // Find Ramesh's most-recent harvestable wheat cycle
    const cycle = await CultivationCycle.findOne({
      where: {
        farmer_id: RAMESH_USER_ID,
        cycle_status: ['harvesting', 'post_harvest'],
        is_active: true,
      },
      order: [['created_at', 'DESC']],
      raw: true,
    });
    if (!cycle) {
      console.error(`[pulse-demo-stress] no harvestable cycle for farmer ${RAMESH_USER_ID}`);
      console.error('  → re-run any Phase 1 demo seeder that flips a wheat cycle to post_harvest first');
      await db.sequelize.close();
      process.exit(1);
    }
    console.log(`[pulse-demo-stress] cycle ${cycle.cycle_uuid} (${cycle.cycle_status})`);

    const expenseSummary = await CultivationCycleExpenseSummary.findOne({
      where: { cycle_id: cycle.cycle_uuid, is_active: true },
      raw: true,
    });
    const harvestRecord = await HarvestRecord.findOne({
      where: { cycle_id: cycle.cycle_uuid, is_active: true },
      raw: true,
    });
    if (!expenseSummary || !harvestRecord) {
      console.error('[pulse-demo-stress] cycle has no expense summary or harvest record');
      console.error('  → run the Phase 1 harvest seeder first');
      await db.sequelize.close();
      process.exit(1);
    }

    const totalExpenses = parseFloat(expenseSummary.total_expenses || 0);
    const harvestKg = parseFloat(harvestRecord.total_harvest_quantity_kg || 0);
    const costPerQtl = totalExpenses / (harvestKg / 100);
    console.log(`[pulse-demo-stress] cost/qtl = Rs ${Math.round(costPerQtl)} (Rs ${totalExpenses} / ${harvestKg / 100} qtl)`);

    // Find the wheat commodity
    const wheat = await PulseCommodity.findOne({
      where: { commodity_name: { [db.Sequelize.Op.like]: '%Wheat%' }, is_active: true },
      raw: true,
    });
    if (!wheat) {
      console.error('[pulse-demo-stress] no wheat commodity in pulse_commodities');
      await db.sequelize.close();
      process.exit(1);
    }

    // Peg the last N days of wheat modal_price to 80% of cost — clearly
    // distress territory, ~20% loss per qtl.
    const targetModal = Math.round(costPerQtl * 0.80);
    const targetMin = Math.round(targetModal * 0.97);
    const targetMax = Math.round(targetModal * 1.03);
    const cutoff = subDaysIso(days);
    console.log(`[pulse-demo-stress] pegging wheat modal_price to Rs ${targetModal}/qtl for last ${days} days (since ${cutoff})`);

    const [updated] = await PulsePriceRecord.update(
      {
        modal_price: targetModal,
        opening_price: targetMin,
        lowest_price: targetMin,
        closing_price: targetMax,
        highest_price: targetMax,
        price_trend: 'falling',
        quality_flag: 'clean',
      },
      {
        where: {
          commodity_id: wheat.commodity_id,
          record_date: { [db.Sequelize.Op.gte]: cutoff },
          is_active: true,
        },
      },
    );
    console.log(`[pulse-demo-stress] updated ${updated} price rows`);

    if (updated === 0) {
      console.warn('[pulse-demo-stress] no price rows matched — run pulse-backfill first to seed the records');
    } else {
      const lossPerQtl = Math.round(costPerQtl - targetModal);
      const lossPct = Math.round(((costPerQtl - targetModal) / costPerQtl) * 100);
      console.log('');
      console.log(`  ✓ Distress scenario armed:`);
      console.log(`    cost/qtl     : Rs ${Math.round(costPerQtl)}`);
      console.log(`    mandi price  : Rs ${targetModal}`);
      console.log(`    loss/qtl     : Rs ${lossPerQtl} (${lossPct}%)`);
      console.log('');
      console.log('  → Banker dashboard /banker/portfolio/early-warnings will now show');
      console.log(`    Ramesh as distress_sale_risk (high).`);
      console.log('  → Persona home /pulse/nudges/me will show the price_window_closing nudge.');
      console.log('');
      console.log('  Reverse with: node scripts/pulse-demo-stress.js --restore');
    }

    await db.sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('[pulse-demo-stress] FAILED:', err.message);
    console.error(err.stack);
    try { await db.sequelize.close(); } catch (_) { /* noop */ }
    process.exit(1);
  }
})();
