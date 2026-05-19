/**
 * Backfill trust_farmer_activities from existing module profiles.
 *
 *   - Every farmer with a row in farmer_dairy_profiles  → DAIRY activity
 *   - Every farmer with a row in farmer_fishery_profiles → FISHERY activity
 *
 * Activity mix is intentionally LEFT BLANK — farmers fill % during onboarding.
 * Idempotent: keyed on (farmer_id, activity_type).
 *
 * Usage: node scripts/backfillTrustActivities.js
 */

/* eslint-disable no-console */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const { v4: uuidv4 } = require('uuid');
const db = require('../src/shared/models');

(async () => {
  try {
    const { TrustFarmerActivity, FarmerDairyProfile, FarmerFisheryProfile } = db;

    let dairyCount = 0;
    let fisheryCount = 0;

    if (FarmerDairyProfile) {
      const dairyProfiles = await FarmerDairyProfile.findAll({
        where: { is_active: true },
        attributes: ['farmer_id'],
      });
      for (const p of dairyProfiles) {
        const [, created] = await TrustFarmerActivity.findOrCreate({
          where: { farmer_id: p.farmer_id, activity_type: 'DAIRY' },
          defaults: {
            activity_uuid: uuidv4(),
            farmer_id: p.farmer_id,
            activity_type: 'DAIRY',
            is_primary: false,
            source: 'BACKFILL',
            is_active: true,
          },
        });
        if (created) dairyCount++;
      }
    }

    if (FarmerFisheryProfile) {
      const fisheryProfiles = await FarmerFisheryProfile.findAll({
        where: { is_active: true },
        attributes: ['farmer_id'],
      });
      for (const p of fisheryProfiles) {
        const [, created] = await TrustFarmerActivity.findOrCreate({
          where: { farmer_id: p.farmer_id, activity_type: 'FISHERY' },
          defaults: {
            activity_uuid: uuidv4(),
            farmer_id: p.farmer_id,
            activity_type: 'FISHERY',
            is_primary: false,
            source: 'BACKFILL',
            is_active: true,
          },
        });
        if (created) fisheryCount++;
      }
    }

    console.log(`✅ Trust farmer activities backfilled:`);
    console.log(`   DAIRY  : ${dairyCount} new`);
    console.log(`   FISHERY: ${fisheryCount} new`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  }
})();
