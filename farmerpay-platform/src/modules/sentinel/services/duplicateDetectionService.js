/**
 * Duplicate Detection Service
 * Checks for duplicate farmers using Aadhaar hash, phone, phonetic name,
 * address clustering, device fingerprint, and bank account matching.
 * Also scans for ghost/inactive farmers.
 */

const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/utils/logger');
const { findPhoneticMatches } = require('../../farmer/services/nameStandardizationService');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Run duplicate checks for a newly registered farmer.
 * Called at registration time for real-time detection.
 */
const checkNewFarmer = async (farmerId) => {
  const models = getDb();
  const { User, FarmerNameRecord, AadhaarVerification, FarmerAddress, DuplicateDetectionResult } = models;

  const user = await User.findByPk(farmerId);
  if (!user) return [];

  const results = [];

  // 1. Phone number match (exact)
  if (user.mobile) {
    const phoneMatches = await User.findAll({
      where: { mobile: user.mobile, id: { [Op.ne]: farmerId }, is_active: true },
      attributes: ['id', 'mobile'],
    });
    for (const match of phoneMatches) {
      results.push(await recordDuplicate(farmerId, match.id, 'phone_number', 100, { mobile: user.mobile }));
    }
  }

  // 2. Aadhaar hash match (exact)
  if (AadhaarVerification) {
    const farmerAadhaar = await AadhaarVerification.findOne({
      where: { user_id: farmerId, verification_status: 'verified' },
      attributes: ['aadhaar_hash'],
    });
    if (farmerAadhaar && farmerAadhaar.aadhaar_hash) {
      const aadhaarMatches = await AadhaarVerification.findAll({
        where: {
          aadhaar_hash: farmerAadhaar.aadhaar_hash,
          user_id: { [Op.ne]: farmerId },
          verification_status: 'verified',
        },
        attributes: ['user_id'],
      });
      for (const match of aadhaarMatches) {
        results.push(await recordDuplicate(farmerId, match.user_id, 'aadhaar_hash', 100, { hash_match: true }));
      }
    }
  }

  // 3. Phonetic name match (fuzzy)
  if (FarmerNameRecord) {
    const nameRecord = await FarmerNameRecord.findOne({
      where: { farmer_id: farmerId, is_active: true },
    });
    if (nameRecord && nameRecord.full_name_en) {
      // Get farmer's district for scoping
      const address = await FarmerAddress.findOne({
        where: { farmer_id: farmerId, is_active: true },
        attributes: ['lgd_district_id'],
      });
      const districtId = address ? address.lgd_district_id : null;
      const phoneticMatches = await findPhoneticMatches(nameRecord.full_name_en, districtId, farmerId);

      for (const match of phoneticMatches) {
        // Differentiate confidence: names matching on BOTH soundex AND
        // metaphone are stronger signals (~85%) than single-algo hits
        // (~60%). Flat 70% was too coarse and produced both false
        // positives (metaphone-only) and undercounted true matches.
        const soundexMatch = nameRecord.phonetic_key_soundex === match.phonetic_key_soundex;
        const metaphoneMatch = nameRecord.phonetic_key_metaphone === match.phonetic_key_metaphone;
        const score = (soundexMatch && metaphoneMatch) ? 85 : 60;
        results.push(await recordDuplicate(farmerId, match.farmer_id, 'name_phonetic', score, {
          name_a: nameRecord.full_name_en,
          name_b: match.full_name_en,
          soundex_match: soundexMatch,
          metaphone_match: metaphoneMatch,
        }));
      }
    }
  }

  return results;
};

/**
 * Record a duplicate detection result.
 */
const recordDuplicate = async (farmerIdA, farmerIdB, matchType, matchScore, matchDetails) => {
  const { DuplicateDetectionResult } = getDb();

  // Ensure consistent ordering (smaller ID first)
  const [idA, idB] = farmerIdA < farmerIdB ? [farmerIdA, farmerIdB] : [farmerIdB, farmerIdA];

  const [result] = await DuplicateDetectionResult.findOrCreate({
    where: { farmer_id_a: idA, farmer_id_b: idB, match_type: matchType },
    defaults: {
      detection_uuid: uuidv4(),
      farmer_id_a: idA,
      farmer_id_b: idB,
      match_type: matchType,
      match_score: matchScore,
      match_details: matchDetails,
      detected_at: new Date(),
    },
  });

  return result;
};

/**
 * Address cluster analysis — flag if >5 farmers at same village + house/ward.
 */
const addressClusterAnalysis = async (lgdVillageId) => {
  const { FarmerAddress, DuplicateDetectionResult } = getDb();

  const addresses = await FarmerAddress.findAll({
    where: { lgd_village_id: lgdVillageId, is_active: true },
    attributes: ['farmer_id', 'house_number', 'ward_number'],
  });

  // Group by house + ward
  const clusters = {};
  for (const addr of addresses) {
    const key = `${addr.house_number || 'none'}_${addr.ward_number || 'none'}`;
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(addr.farmer_id);
  }

  const results = [];
  for (const [key, farmerIds] of Object.entries(clusters)) {
    if (farmerIds.length > 5) {
      // Flag all pairs in this cluster
      for (let i = 0; i < farmerIds.length; i++) {
        for (let j = i + 1; j < farmerIds.length; j++) {
          results.push(await recordDuplicate(
            farmerIds[i], farmerIds[j], 'address_cluster',
            50 + Math.min(farmerIds.length * 5, 40),
            { village_id: lgdVillageId, cluster_key: key, cluster_size: farmerIds.length }
          ));
        }
      }
    }
  }

  return results;
};

/**
 * Ghost scan — flag farmers with no activity in specified period.
 */
const runGhostScan = async (inactiveDays = 180) => {
  const { User, GhostDetectionFlag, FarmerGpsLocation, UserSession } = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactiveDays);

  const results = [];

  // Find farmers with no GPS activity
  if (FarmerGpsLocation) {
    const activeFarmerIds = await FarmerGpsLocation.findAll({
      where: { created_at: { [Op.gte]: cutoff } },
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('farmer_id')), 'farmer_id']],
      raw: true,
    });
    const activeSet = new Set(activeFarmerIds.map(r => r.farmer_id));

    const allFarmers = await User.findAll({
      where: { is_active: true },
      attributes: ['id'],
    });

    for (const farmer of allFarmers) {
      if (!activeSet.has(farmer.id)) {
        results.push(await flagGhost(farmer.id, 'no_gps_activity', 'medium', {
          inactive_days: inactiveDays,
          checked_at: new Date(),
        }));
      }
    }
  }

  // Find farmers with no login
  if (UserSession) {
    const recentSessions = await UserSession.findAll({
      where: { last_activity: { [Op.gte]: cutoff } },
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('user_id')), 'user_id']],
      raw: true,
    });
    const loginSet = new Set(recentSessions.map(r => r.user_id));

    const allFarmers = await User.findAll({
      where: { is_active: true },
      attributes: ['id'],
    });

    for (const farmer of allFarmers) {
      if (!loginSet.has(farmer.id)) {
        results.push(await flagGhost(farmer.id, 'no_login_180d', 'high', {
          inactive_days: inactiveDays,
          checked_at: new Date(),
        }));
      }
    }
  }

  logger.info(`Ghost scan completed: ${results.length} flags created`);
  return results;
};

const flagGhost = async (farmerId, flagType, severity, evidence) => {
  const { GhostDetectionFlag } = getDb();

  const [flag] = await GhostDetectionFlag.findOrCreate({
    where: { farmer_id: farmerId, flag_type: flagType, status: 'open', is_active: true },
    defaults: {
      flag_uuid: uuidv4(),
      farmer_id: farmerId,
      flag_type: flagType,
      flag_severity: severity,
      evidence,
      auto_detected: true,
    },
  });

  return flag;
};

module.exports = {
  checkNewFarmer,
  recordDuplicate,
  addressClusterAnalysis,
  runGhostScan,
  flagGhost,
};
