/**
 * BankProductConfigService — Tests
 *
 * Covers: getThresholds resolution order, updateThresholds versioning,
 * getHistory, cache invalidation, and immutable version trail.
 */

// ─── Mock Redis ────────────────────────────────────────────────────

const mockRedisStore = {};
jest.mock('../../../src/config/redis', () => ({
  setWithTTL: jest.fn(async (key, value) => { mockRedisStore[key] = value; }),
  getKey: jest.fn(async (key) => mockRedisStore[key] || null),
  deleteKeys: jest.fn(async (keys) => { keys.forEach(k => delete mockRedisStore[k]); }),
}));

// ─── Mock UUID ─────────────────────────────────────────────────────

let mockUumockIdCounter = 0;
jest.mock('../../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn(() => `uuid-${++mockUumockIdCounter}`),
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

// ─── Mock DB ───────────────────────────────────────────────────────

const mockConfigRows = [];
let mockIdCounter = 0;

const mockBankProductConfig = {
  findOne: jest.fn(async ({ where, order, transaction }) => {
    const matches = mockConfigRows.filter(r => {
      if (r.bank_id !== where.bank_id) return false;
      if ('product_id' in where) {
        if (where.product_id === null && r.product_id !== null) return false;
        if (where.product_id !== null && r.product_id !== where.product_id) return false;
      }
      if ('is_active' in where && r.is_active !== where.is_active) return false;
      return true;
    });
    // Sort by version DESC
    matches.sort((a, b) => b.version - a.version);
    return matches[0] || null;
  }),

  findAll: jest.fn(async ({ where, order, limit }) => {
    const matches = mockConfigRows.filter(r => {
      if (r.bank_id !== where.bank_id) return false;
      if (where.product_id === null && r.product_id !== null) return false;
      if (where.product_id && r.product_id !== where.product_id) return false;
      return true;
    });
    matches.sort((a, b) => b.version - a.version);
    return matches.slice(0, limit || 50);
  }),

  create: jest.fn(async (data, opts) => {
    const row = { id: ++mockIdCounter, ...data, created_at: new Date(), updated_at: new Date() };
    mockConfigRows.push(row);
    return row;
  }),

  update: jest.fn(async (values, { where, transaction }) => {
    const row = mockConfigRows.find(r => r.id === where.id);
    if (row) Object.assign(row, values);
    return [1];
  }),
};

const mockTransaction = {
  commit: jest.fn(),
  rollback: jest.fn(),
};

jest.mock('../../../src/shared/models', () => ({
  BankProductConfig: mockBankProductConfig,
  sequelize: {
    transaction: jest.fn(async () => mockTransaction),
  },
}));

// ─── Import SUT ────────────────────────────────────────────────────

const service = require('../../../src/modules/readiness/services/bankProductConfigService');

beforeEach(() => {
  jest.clearAllMocks();
  mockConfigRows.length = 0;
  mockIdCounter = 0;
  uumockIdCounter = 0;
  Object.keys(mockRedisStore).forEach(k => delete mockRedisStore[k]);
  mockTransaction.commit.mockClear();
  mockTransaction.rollback.mockClear();
});

// ═══════════════════════════════════════════════════════════════════

describe('bankProductConfigService', () => {
  // ─── getThresholds ─────────────────────────────────────────

  describe('getThresholds', () => {
    it('returns system defaults when no config exists', async () => {
      const result = await service.getThresholds(1, null);

      expect(result.trustCutoff).toBe(60);
      expect(result.fhsCutoff).toBe(50);
      expect(result.source).toBe('system');
    });

    it('returns bank-wide config when it exists', async () => {
      mockConfigRows.push({
        id: 1, config_uuid: 'cfg-1', bank_id: 1, product_id: null,
        trust_cutoff: 65, fhs_cutoff: 55, version: 1,
        is_active: true, effective_from: new Date(),
      });

      const result = await service.getThresholds(1, null);

      expect(result.trustCutoff).toBe(65);
      expect(result.fhsCutoff).toBe(55);
      expect(result.source).toBe('bank');
      expect(result.version).toBe(1);
    });

    it('returns product-specific config over bank-wide', async () => {
      // Bank-wide
      mockConfigRows.push({
        id: 1, config_uuid: 'cfg-1', bank_id: 1, product_id: null,
        trust_cutoff: 65, fhs_cutoff: 55, version: 1,
        is_active: true, effective_from: new Date(),
      });
      // Product-specific
      mockConfigRows.push({
        id: 2, config_uuid: 'cfg-2', bank_id: 1, product_id: 10,
        trust_cutoff: 70, fhs_cutoff: 45, version: 1,
        is_active: true, effective_from: new Date(),
      });

      const result = await service.getThresholds(1, 10);

      expect(result.trustCutoff).toBe(70);
      expect(result.fhsCutoff).toBe(45);
      expect(result.source).toBe('product');
    });

    it('falls back to bank-wide when product-specific not found', async () => {
      mockConfigRows.push({
        id: 1, config_uuid: 'cfg-1', bank_id: 1, product_id: null,
        trust_cutoff: 65, fhs_cutoff: 55, version: 1,
        is_active: true, effective_from: new Date(),
      });

      const result = await service.getThresholds(1, 99);

      expect(result.trustCutoff).toBe(65);
      expect(result.source).toBe('bank');
    });

    it('caches result in Redis', async () => {
      mockConfigRows.push({
        id: 1, config_uuid: 'cfg-1', bank_id: 1, product_id: null,
        trust_cutoff: 65, fhs_cutoff: 55, version: 1,
        is_active: true, effective_from: new Date(),
      });

      await service.getThresholds(1, null);

      expect(mockRedisStore['bpc:thresholds:1:default']).toBeDefined();
      const cached = JSON.parse(mockRedisStore['bpc:thresholds:1:default']);
      expect(cached.trustCutoff).toBe(65);
    });
  });

  // ─── updateThresholds ──────────────────────────────────────

  describe('updateThresholds', () => {
    it('creates first version when no config exists', async () => {
      const result = await service.updateThresholds({
        bankId: 1,
        productId: null,
        trustCutoff: 70,
        fhsCutoff: 55,
        reason: 'Policy review Q2',
        updatedBy: 5,
      });

      expect(result.version).toBe(1);
      expect(result.trustCutoff).toBe(70);
      expect(result.fhsCutoff).toBe(55);
      expect(result.changeReason).toBe('Policy review Q2');
      expect(result.isActive).toBe(true);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('increments version and deactivates previous row', async () => {
      // First version
      await service.updateThresholds({
        bankId: 1, productId: null,
        trustCutoff: 70, fhsCutoff: 55,
        reason: 'Initial', updatedBy: 5,
      });

      // Second version
      const result = await service.updateThresholds({
        bankId: 1, productId: null,
        trustCutoff: 75, fhsCutoff: 60,
        reason: 'Tightened', updatedBy: 5,
      });

      expect(result.version).toBe(2);
      expect(result.trustCutoff).toBe(75);

      // Previous row should be deactivated
      const v1 = mockConfigRows.find(r => r.version === 1);
      expect(v1.is_active).toBe(false);
    });

    it('invalidates Redis cache on update', async () => {
      // Seed cache
      mockRedisStore['bpc:thresholds:1:default'] = JSON.stringify({ trustCutoff: 60 });

      await service.updateThresholds({
        bankId: 1, productId: null,
        trustCutoff: 70, fhsCutoff: 55,
        reason: 'Update', updatedBy: 5,
      });

      // Cache should be cleared
      const { deleteKeys } = require('../../../src/config/redis');
      expect(deleteKeys).toHaveBeenCalledWith(
        expect.arrayContaining(['bpc:thresholds:1:default']),
      );
    });

    it('rolls back transaction on error', async () => {
      mockBankProductConfig.create.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.updateThresholds({
        bankId: 1, productId: null,
        trustCutoff: 70, fhsCutoff: 55,
        reason: 'Fail', updatedBy: 5,
      })).rejects.toThrow('DB error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ─── getHistory ────────────────────────────────────────────

  describe('getHistory', () => {
    it('returns version history sorted DESC', async () => {
      mockConfigRows.push(
        { id: 1, config_uuid: 'a', bank_id: 1, product_id: null, trust_cutoff: 60, fhs_cutoff: 50, version: 1, is_active: false, change_reason: 'Initial', updated_by: 5, effective_from: new Date(), created_at: new Date() },
        { id: 2, config_uuid: 'b', bank_id: 1, product_id: null, trust_cutoff: 65, fhs_cutoff: 55, version: 2, is_active: true, change_reason: 'Revised', updated_by: 5, effective_from: new Date(), created_at: new Date() },
      );

      const history = await service.getHistory(1, null);

      expect(history).toHaveLength(2);
      expect(history[0].version).toBe(2);
      expect(history[1].version).toBe(1);
    });

    it('returns empty array when no history', async () => {
      const history = await service.getHistory(999, null);
      expect(history).toEqual([]);
    });
  });

  // ─── getActiveConfig ───────────────────────────────────────

  describe('getActiveConfig', () => {
    it('returns active config', async () => {
      mockConfigRows.push({
        id: 1, config_uuid: 'cfg-1', bank_id: 1, product_id: null,
        trust_cutoff: 65, fhs_cutoff: 55, version: 1,
        is_active: true, change_reason: null, updated_by: 5,
        effective_from: new Date(), created_at: new Date(),
      });

      const config = await service.getActiveConfig(1, null);

      expect(config).not.toBeNull();
      expect(config.trustCutoff).toBe(65);
    });

    it('returns null when no active config', async () => {
      const config = await service.getActiveConfig(999, null);
      expect(config).toBeNull();
    });
  });
});
