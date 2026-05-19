/**
 * Recalculate TRUST scores for every farmer who has at least one response.
 *
 * Run this once after seeding new profile-extension questions, so every
 * existing farmer's score reflects the new questions (and the unanswered
 * ones lower their normalized section scores until they fill them).
 *
 * Also clears the per-farmer trust:score:* Redis cache so the next API read
 * sees the new score.
 *
 * Usage: node scripts/recalcTrustScores.js
 */

/* eslint-disable no-console */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const db = require('../src/shared/models');
const { calculateTrustScore } = require('../src/modules/trust/services/scoringEngine');
const { deleteKeys } = require('../src/config/redis');

(async () => {
  try {
    const { TrustResponse } = db;

    const farmerRows = await TrustResponse.findAll({
      where: { is_active: true },
      attributes: [
        [db.sequelize.fn('DISTINCT', db.sequelize.col('farmer_id')), 'farmer_id'],
      ],
      raw: true,
    });

    console.log(`→ Recalculating TRUST score for ${farmerRows.length} farmers...`);

    let ok = 0, failed = 0;
    for (const row of farmerRows) {
      const farmerId = row.farmer_id;
      try {
        const result = await calculateTrustScore(farmerId, db);
        await deleteKeys(`trust:score:${farmerId}`);
        ok++;
        console.log(`   ✓ farmer ${farmerId}: ${result.totalScore} (${result.scoreBand})`);
      } catch (err) {
        failed++;
        console.warn(`   ✗ farmer ${farmerId}: ${err.message}`);
      }
    }

    console.log(`\n✅ Recalc done: ${ok} ok, ${failed} failed`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Recalc failed:', err);
    process.exit(1);
  }
})();
