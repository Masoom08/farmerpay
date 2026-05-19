/**
 * TRUST v2 Cache Helpers
 * Redis read/write/invalidation for snapshot and portfolio caches.
 */

const { setWithTTL, getKey, deleteKeys, getRedisClient } = require('../../../config/redis');
const { CACHE_TTL, CACHE_PREFIX } = require('../constants');
const logger = require('../../../shared/utils/logger');

/**
 * Reads a cached snapshot DTO for a farmer.
 * @param {number} farmerId
 * @returns {Promise<Object|null>}
 */
const getSnapshot = async (farmerId) => {
  try {
    return await getKey(`${CACHE_PREFIX.SNAPSHOT}${farmerId}`);
  } catch (err) {
    logger.warn(`[TRUST/cache] snapshot read failed for farmer ${farmerId}: ${err.message}`);
    return null;
  }
};

/**
 * Writes a snapshot DTO to cache with 24h TTL.
 * @param {number} farmerId
 * @param {Object} dto
 */
const setSnapshot = async (farmerId, dto) => {
  try {
    await setWithTTL(`${CACHE_PREFIX.SNAPSHOT}${farmerId}`, JSON.stringify(dto), CACHE_TTL);
  } catch (err) {
    logger.warn(`[TRUST/cache] snapshot write failed for farmer ${farmerId}: ${err.message}`);
  }
};

/**
 * Invalidates all TRUST caches for a farmer after recomputation or decision.
 * @param {number} farmerId
 */
const invalidateForFarmer = async (farmerId) => {
  try {
    // Direct key deletion
    await deleteKeys(`${CACHE_PREFIX.SNAPSHOT}${farmerId}`);

    // Pattern-based deletion for portfolio keys
    const client = getRedisClient();
    const pattern = `fp:${CACHE_PREFIX.PORTFOLIO}*:farmer:${farmerId}`;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      // keys already include the fp: prefix from the scan, but deleteKeys adds it again.
      // Use raw client.del to avoid double-prefix.
      await client.del(...keys);
    }
  } catch (err) {
    logger.warn(`[TRUST/cache] invalidation failed for farmer ${farmerId}: ${err.message}`);
  }
};

/**
 * Invalidates portfolio-level cache (used after banker decisions).
 */
const invalidatePortfolio = async () => {
  try {
    const client = getRedisClient();
    const keys = await client.keys('fp:trust:portfolio:*');
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    logger.warn(`[TRUST/cache] portfolio invalidation failed: ${err.message}`);
  }
};

module.exports = { getSnapshot, setSnapshot, invalidateForFarmer, invalidatePortfolio };
