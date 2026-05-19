/**
 * Fishery Aggregate Service — Persona phase save-and-lock
 *
 * Supports the setup-fishery.tsx screen in the farmer app. The farmer enters
 * aggregate counts ({ ponds, vessels, species, waterSource }) and we create
 * N placeholder rows in `fishery_ponds` + `fishery_vessels` so the downstream
 * per-unit screens (fishery-ponds, fishery-vessels, fishery-trip, etc.) have
 * something to render without forcing the farmer through N individual add
 * forms on day one.
 *
 * Idempotent reconciliation — same pattern as dairyAggregateService.
 * On successful save, flips the farmer's FISHERY activity subscription
 * setup_complete = true via activitySubscriptionService.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

/**
 * @param {number} farmerId
 * @param {{ ponds?: number, vessels?: number, species?: string, waterSource?: string }} aggregates
 */
const saveAggregateUnits = async (farmerId, aggregates) => {
  const { FisheryPond, FisheryVessel, sequelize } = getDb();

  const targetPonds = Math.max(0, parseInt(aggregates.ponds || 0, 10));
  const targetVessels = Math.max(0, parseInt(aggregates.vessels || 0, 10));
  const species = aggregates.species || null;
  const waterSource = aggregates.waterSource || null;

  const results = { ponds: { created: 0, kept: 0, softDeleted: 0 }, vessels: { created: 0, kept: 0, softDeleted: 0 } };

  await sequelize.transaction(async (t) => {
    // ─── Ponds ────────────────────────────────────────────────────
    const existingPonds = await FisheryPond.findAll({
      where: { farmer_id: farmerId, is_active: true },
      order: [
        [sequelize.literal('CASE WHEN pond_name IS NULL THEN 0 ELSE 1 END'), 'ASC'],
        ['id', 'ASC'],
      ],
      transaction: t,
    });

    if (existingPonds.length < targetPonds) {
      const toCreate = targetPonds - existingPonds.length;
      for (let i = 1; i <= toCreate; i++) {
        await FisheryPond.create({
          pond_uuid: uuidv4(),
          farmer_id: farmerId,
          pond_name: null, // placeholder
          water_source: waterSource,
          current_species: species,
          status: 'ACTIVE',
          is_active: true,
        }, { transaction: t });
        results.ponds.created += 1;
      }
      results.ponds.kept += existingPonds.length;
    } else if (existingPonds.length > targetPonds) {
      const toSoftDelete = existingPonds.slice(targetPonds).filter((r) => !r.pond_name);
      for (const row of toSoftDelete) {
        row.is_active = false;
        row.exit_date = new Date();
        row.exit_reason = 'aggregate_fishery_reconciliation';
        await row.save({ transaction: t });
        results.ponds.softDeleted += 1;
      }
      results.ponds.kept += existingPonds.length - toSoftDelete.length;
    } else {
      results.ponds.kept += existingPonds.length;
    }

    // ─── Vessels ──────────────────────────────────────────────────
    const existingVessels = await FisheryVessel.findAll({
      where: { farmer_id: farmerId, is_active: true },
      order: [
        [sequelize.literal('CASE WHEN vessel_name IS NULL THEN 0 ELSE 1 END'), 'ASC'],
        ['id', 'ASC'],
      ],
      transaction: t,
    });

    if (existingVessels.length < targetVessels) {
      const toCreate = targetVessels - existingVessels.length;
      for (let i = 1; i <= toCreate; i++) {
        await FisheryVessel.create({
          vessel_uuid: uuidv4(),
          farmer_id: farmerId,
          vessel_name: null,
          is_active: true,
        }, { transaction: t });
        results.vessels.created += 1;
      }
      results.vessels.kept += existingVessels.length;
    } else if (existingVessels.length > targetVessels) {
      const toSoftDelete = existingVessels.slice(targetVessels).filter((r) => !r.vessel_name);
      for (const row of toSoftDelete) {
        row.is_active = false;
        await row.save({ transaction: t });
        results.vessels.softDeleted += 1;
      }
      results.vessels.kept += existingVessels.length - toSoftDelete.length;
    } else {
      results.vessels.kept += existingVessels.length;
    }
  });

  // Flip the FISHERY activity subscription setup_complete flag
  try {
    const activitySubscriptionService = require('../../../farmer/services/activitySubscriptionService');
    await activitySubscriptionService.markActivitySetupComplete(farmerId, 'FISHERY');
  } catch (err) {
    logger.warn(`markActivitySetupComplete(FISHERY) failed for farmer ${farmerId}: ${err.message}`);
  }

  logger.info(`Fishery aggregate saved for farmer ${farmerId}: ponds=${targetPonds} vessels=${targetVessels}`);

  return {
    counts: { ponds: targetPonds, vessels: targetVessels },
    species,
    waterSource,
    reconciliation: results,
  };
};

module.exports = { saveAggregateUnits };
