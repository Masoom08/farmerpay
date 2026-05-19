/**
 * Backfill farmer_activity_subscriptions from existing FarmerIncomeStream rows.
 *
 * For every farmer with active income streams, create one ACTIVE subscription
 * per distinct stream_type. Priority rank is derived from annual_income DESC
 * (highest-earning activity → rank 1), matching what the onboarding wizard
 * would have assigned.
 *
 * Idempotent: keyed on (farmer_id, activity_code). Existing subscriptions are
 * left alone — we don't touch rows that were already created via the wizard.
 *
 * Mapping (stream_type → activity_code):
 *   crop          → CROP
 *   dairy         → DAIRY
 *   fisheries     → FISHERY
 *   horticulture  → HORTI
 *   poultry       → POULTRY
 *   goatery       → GOATERY
 *   labour        → LABOUR_WAGE
 *   shop / business → SHOP_BUSINESS
 *   remittance    → REMITTANCE
 *   shg           → OTHER   (SHG = Self Help Group, not a distinct enum yet)
 *   (anything else) → OTHER
 *
 * Usage:  node scripts/backfillActivitySubscriptions.js
 */

/* eslint-disable no-console */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const db = require('../src/shared/models');

const STREAM_TO_CODE = {
  crop: 'CROP',
  dairy: 'DAIRY',
  fishery: 'FISHERY',
  fisheries: 'FISHERY',
  horti: 'HORTI',
  horticulture: 'HORTI',
  poultry: 'POULTRY',
  goatery: 'GOATERY',
  goat: 'GOATERY',
  labour: 'LABOUR_WAGE',
  labor: 'LABOUR_WAGE',
  labour_wage: 'LABOUR_WAGE',
  wage: 'LABOUR_WAGE',
  shop: 'SHOP_BUSINESS',
  business: 'SHOP_BUSINESS',
  shop_business: 'SHOP_BUSINESS',
  remittance: 'REMITTANCE',
  shg: 'OTHER',
};

const mapStreamType = (streamType) => {
  if (!streamType) return 'OTHER';
  const normalized = streamType.toString().trim().toLowerCase();
  return STREAM_TO_CODE[normalized] || 'OTHER';
};

(async () => {
  const { FarmerIncomeStream, FarmerActivitySubscription, sequelize } = db;

  if (!FarmerIncomeStream) {
    console.error('FarmerIncomeStream model not loaded. Aborting.');
    process.exit(1);
  }

  const stats = {
    farmersProcessed: 0,
    streamsRead: 0,
    subsCreated: 0,
    subsSkipped: 0,
    unknownStreams: {},
  };

  try {
    // Pull all active income streams, grouped by farmer in memory.
    const rows = await FarmerIncomeStream.findAll({
      where: { is_active: true },
      order: [['farmer_id', 'ASC'], ['annual_income', 'DESC']],
    });
    stats.streamsRead = rows.length;

    const byFarmer = new Map();
    for (const r of rows) {
      if (!byFarmer.has(r.farmer_id)) byFarmer.set(r.farmer_id, []);
      byFarmer.get(r.farmer_id).push(r);
    }

    for (const [farmerId, streams] of byFarmer.entries()) {
      stats.farmersProcessed += 1;

      // Collapse duplicate stream_types to the highest-income row so the
      // priority order makes sense (a farmer with two "crop" rows gets one
      // CROP subscription, ranked by the bigger income).
      const bestByCode = new Map();
      for (const s of streams) {
        const code = mapStreamType(s.stream_type);
        const income = parseFloat(s.annual_income || 0);
        if (code === 'OTHER' && !STREAM_TO_CODE[(s.stream_type || '').toLowerCase()]) {
          const k = (s.stream_type || 'unknown').toLowerCase();
          stats.unknownStreams[k] = (stats.unknownStreams[k] || 0) + 1;
        }
        if (!bestByCode.has(code) || bestByCode.get(code).income < income) {
          bestByCode.set(code, { code, income, stream: s });
        }
      }

      // Rank by income DESC
      const ranked = Array.from(bestByCode.values()).sort((a, b) => b.income - a.income);

      await sequelize.transaction(async (t) => {
        for (let i = 0; i < ranked.length; i++) {
          const { code, income, stream } = ranked[i];
          const [, created] = await FarmerActivitySubscription.findOrCreate({
            where: { farmer_id: farmerId, activity_code: code },
            defaults: {
              farmer_id: farmerId,
              activity_code: code,
              status: 'ACTIVE',
              subscribed_at: stream.created_at || new Date(),
              priority_rank: i + 1,
              source: 'BACKFILL',
              notes: income > 0 ? `Backfilled from income stream · ₹${income.toFixed(0)}/yr` : 'Backfilled from income stream',
            },
            transaction: t,
          });
          if (created) stats.subsCreated += 1;
          else stats.subsSkipped += 1;
        }
      });
    }

    console.log('\n───────────────────────────────────────────────');
    console.log('Activity Subscription Backfill Complete');
    console.log('───────────────────────────────────────────────');
    console.log(`  Farmers processed:     ${stats.farmersProcessed}`);
    console.log(`  Income streams read:   ${stats.streamsRead}`);
    console.log(`  Subscriptions created: ${stats.subsCreated}`);
    console.log(`  Already existed:       ${stats.subsSkipped}`);
    if (Object.keys(stats.unknownStreams).length > 0) {
      console.log(`  Mapped to OTHER:       ${JSON.stringify(stats.unknownStreams)}`);
    }
    console.log('───────────────────────────────────────────────\n');
    process.exit(0);
  } catch (e) {
    console.error('\nBackfill FAILED:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
