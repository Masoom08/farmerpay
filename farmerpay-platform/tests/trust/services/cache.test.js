/**
 * Cache — tests for TTL enforcement and key invalidation.
 */

jest.mock('../../../src/config/redis', () => {
  const store = {};
  const ttls = {};
  return {
    setWithTTL: jest.fn(async (key, value, ttl) => {
      store[key] = value;
      ttls[key] = ttl;
      return 'OK';
    }),
    getKey: jest.fn(async (key) => {
      const val = store[key];
      if (!val) return null;
      try { return JSON.parse(val); } catch { return val; }
    }),
    deleteKeys: jest.fn(async (...keys) => {
      keys.forEach((k) => { delete store[k]; delete ttls[k]; });
      return keys.length;
    }),
    getRedisClient: jest.fn(() => ({
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(0),
    })),
    __store: store,
    __ttls: ttls,
  };
});

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

const cache = require('../../../src/modules/trust/services/cache');
const redis = require('../../../src/config/redis');
const { CACHE_TTL } = require('../../../src/modules/trust/constants');

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(redis.__store).forEach((k) => delete redis.__store[k]);
  Object.keys(redis.__ttls).forEach((k) => delete redis.__ttls[k]);
});

describe('cache', () => {
  test('setSnapshot stores with 24h TTL', async () => {
    await cache.setSnapshot(42, { score: 650 });
    expect(redis.setWithTTL).toHaveBeenCalledWith(
      'trust:snapshot:farmer:42',
      JSON.stringify({ score: 650 }),
      CACHE_TTL,
    );
  });

  test('getSnapshot returns cached DTO', async () => {
    redis.__store['trust:snapshot:farmer:42'] = JSON.stringify({ score: 650 });
    const result = await cache.getSnapshot(42);
    expect(result).toEqual({ score: 650 });
  });

  test('getSnapshot returns null on miss', async () => {
    const result = await cache.getSnapshot(999);
    expect(result).toBeNull();
  });

  test('invalidateForFarmer deletes the snapshot key', async () => {
    await cache.invalidateForFarmer(42);
    expect(redis.deleteKeys).toHaveBeenCalledWith('trust:snapshot:farmer:42');
  });

  test('TTL is 86400 seconds (24h)', () => {
    expect(CACHE_TTL).toBe(86400);
  });
});
