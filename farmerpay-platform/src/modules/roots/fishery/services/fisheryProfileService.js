/**
 * Fishery Profile Service
 * Manages the per-farmer fishery profile. operation_type (INLAND/SEA/BOTH)
 * gates what screens the farmer sees in the mobile app; tier (driven by pond
 * area or vessel count) drives entry_mode (transactional vs bulk).
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

/**
 * Tier derivation: inland uses pond area; sea uses vessel count. For BOTH we
 * pick the larger tier between inland and sea.
 */
const deriveInlandTier = (totalHectares) => {
  if (totalHectares == null) return 'SMALL';
  if (totalHectares < 1) return 'SMALL';
  if (totalHectares <= 5) return 'MEDIUM';
  return 'LARGE';
};
const deriveSeaTier = (vesselCount) => {
  if (!vesselCount) return 'SMALL';
  if (vesselCount === 1) return 'SMALL';
  if (vesselCount <= 2) return 'MEDIUM';
  return 'LARGE';
};
const maxTier = (a, b) => {
  const order = { SMALL: 0, MEDIUM: 1, LARGE: 2 };
  return order[a] >= order[b] ? a : b;
};
const deriveEntryMode = (tier) => (tier === 'LARGE' ? 'WEEKLY_BULK' : 'TRANSACTIONAL');

const upsertProfile = async (farmerId, data) => {
  const { FarmerFisheryProfile } = getDb();

  let profile = await FarmerFisheryProfile.findOne({ where: { farmer_id: farmerId } });

  // Partial-patch friendly: on update we preserve existing values for any
  // field not explicitly sent. On create we fall back to sensible defaults
  // (INLAND / SMALL) so the in-context micro-prompt in farm.tsx can upsert
  // with just `{ tier }` without clobbering unrelated fields.
  const opType = data.operationType || profile?.operation_type || 'INLAND';
  const tier = data.tier || profile?.tier || 'SMALL';
  const entryMode = data.entryMode || profile?.entry_mode || deriveEntryMode(tier);

  if (profile) {
    await profile.update({
      operation_type: opType,
      tier,
      entry_mode: entryMode,
      cooperative_name: data.cooperativeName ?? profile.cooperative_name,
      cooperative_member_id: data.cooperativeMemberId ?? profile.cooperative_member_id,
      primary_market: data.primaryMarket ?? profile.primary_market,
      default_payment_mode: data.defaultPaymentMode ?? profile.default_payment_mode,
      currency: data.currency ?? profile.currency,
      last_active_at: new Date(),
    });
  } else {
    profile = await FarmerFisheryProfile.create({
      profile_uuid: uuidv4(),
      farmer_id: farmerId,
      operation_type: opType,
      tier,
      entry_mode: entryMode,
      cooperative_name: data.cooperativeName || null,
      cooperative_member_id: data.cooperativeMemberId || null,
      primary_market: data.primaryMarket || null,
      default_payment_mode: data.defaultPaymentMode || 'CASH',
      currency: data.currency || 'INR',
      onboarded_at: new Date(),
    });
    logger.info(`Fishery profile created for farmer ${farmerId} (op=${opType} tier=${tier})`);
  }

  return profile;
};

const getProfile = async (farmerId) => {
  const { FarmerFisheryProfile } = getDb();
  return FarmerFisheryProfile.findOne({ where: { farmer_id: farmerId } });
};

/**
 * Recomputes tier based on current inland pond area and vessel count.
 * Called after pond/vessel CRUD to keep entry_mode in sync with reality.
 */
const recomputeTier = async (farmerId) => {
  const { FarmerFisheryProfile, FisheryPond, FisheryVessel } = getDb();
  const profile = await FarmerFisheryProfile.findOne({ where: { farmer_id: farmerId } });
  if (!profile) return null;

  const ponds = await FisheryPond.findAll({
    where: { farmer_id: farmerId, is_active: true },
  });
  const totalHa = ponds.reduce((s, p) => s + parseFloat(p.pond_area_hectares || 0), 0);
  const vesselCount = await FisheryVessel.count({
    where: { farmer_id: farmerId, status: 'ACTIVE', is_active: true },
  });

  let tier;
  if (profile.operation_type === 'INLAND') tier = deriveInlandTier(totalHa);
  else if (profile.operation_type === 'SEA') tier = deriveSeaTier(vesselCount);
  else tier = maxTier(deriveInlandTier(totalHa), deriveSeaTier(vesselCount));

  if (profile.tier !== tier) {
    await profile.update({ tier, entry_mode: deriveEntryMode(tier) });
    logger.info(`Fishery tier recomputed for farmer ${farmerId}: ${tier} (ha=${totalHa} vessels=${vesselCount})`);
  }
  return { tier, totalHectares: totalHa, vesselCount };
};

module.exports = {
  upsertProfile, getProfile, recomputeTier,
  deriveInlandTier, deriveSeaTier,
};
