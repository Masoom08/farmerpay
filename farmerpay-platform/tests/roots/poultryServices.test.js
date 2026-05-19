/**
 * Unit Tests — Poultry Services (flock, dailyLog, batchAnalytics, alerts)
 */

const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

jest.mock('../../src/shared/models', () => ({
  sequelize: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
  Sequelize: { Op: require('sequelize').Op },
  PoultryFlock: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
  PoultryDailyLog: { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn() },
  PoultryBatchSummary: { create: jest.fn(), findOne: jest.fn() },
  PoultryHealthEvent: { create: jest.fn(), findAll: jest.fn() },
  PoultryCostEvent: { create: jest.fn(), findAll: jest.fn() },
  PoultryRevenueEvent: { create: jest.fn(), findAll: jest.fn() },
  PoultryPopTemplate: { findOne: jest.fn() },
  User: { findOne: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn().mockReturnValue('test-uuid'),
}));

const db = require('../../src/shared/models');
const flockService = require('../../src/modules/roots/poultry/services/flockService');
const dailyLogService = require('../../src/modules/roots/poultry/services/dailyLogService');
const batchAnalytics = require('../../src/modules/roots/poultry/services/batchAnalyticsService');
const alertService = require('../../src/modules/roots/poultry/services/alertService');

describe('Poultry Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.commit.mockClear();
    mockTransaction.rollback.mockClear();
  });

  describe('flockService', () => {
    it('should create a flock with initial_count = current_count', async () => {
      db.PoultryFlock.create.mockResolvedValue({
        id: 1, uuid: 'test-uuid', farmer_id: 42, batch_name: 'Batch 1',
        bird_type: 'BROILER', breed: 'Cobb 400', placement_date: '2026-04-01',
        initial_count: 500, current_count: 500, status: 'ACTIVE',
        avg_initial_weight_g: 45, shed_type: 'open', notes: null,
        created_at: new Date(),
      });

      const result = await flockService.createFlock(42, {
        batchName: 'Batch 1', birdType: 'BROILER', breed: 'Cobb 400',
        placementDate: '2026-04-01', initialCount: 500, avgInitialWeightG: 45,
      });

      expect(result.flockId).toBe(1);
      expect(result.initialCount).toBe(500);
      expect(result.currentCount).toBe(500);
      expect(result.birdType).toBe('BROILER');
    });

    it('should list farmer flocks', async () => {
      db.PoultryFlock.findAll.mockResolvedValue([
        { id: 1, uuid: 'u-1', farmer_id: 42, batch_name: 'B1', bird_type: 'BROILER',
          initial_count: 500, current_count: 480, status: 'ACTIVE',
          placement_date: '2026-04-01', created_at: new Date(), batchSummaries: [] },
      ]);

      const result = await flockService.listFarmerFlocks(42);
      expect(result).toHaveLength(1);
      expect(result[0].batchName).toBe('B1');
    });

    it('should throw 404 for missing flock', async () => {
      db.PoultryFlock.findByPk.mockResolvedValue(null);
      await expect(flockService.getFlockById(999)).rejects.toThrow('Flock not found');
    });
  });

  describe('dailyLogService', () => {
    it('should create log and update flock current_count', async () => {
      const mockFlock = { id: 1, current_count: 500, status: 'ACTIVE', is_active: true, update: jest.fn() };
      db.PoultryFlock.findByPk.mockResolvedValue(mockFlock);
      db.PoultryDailyLog.create.mockResolvedValue({
        id: 10, uuid: 'test-uuid', flock_id: 1, log_date: '2026-04-15',
        mortality_count: 3, feed_consumed_kg: 120, egg_count: null,
      });
      // Mock post-log analytics
      db.PoultryDailyLog.findAll.mockResolvedValue([]);
      db.PoultryCostEvent.findAll.mockResolvedValue([]);
      db.PoultryRevenueEvent.findAll.mockResolvedValue([]);
      db.PoultryBatchSummary.findOne.mockResolvedValue(null);
      db.PoultryBatchSummary.create.mockResolvedValue({});
      db.PoultryPopTemplate.findOne.mockResolvedValue(null);

      const result = await dailyLogService.createDailyLog(1, {
        logDate: '2026-04-15', mortalityCount: 3, feedConsumedKg: 120,
      });

      expect(result.mortalityCount).toBe(3);
      expect(mockFlock.update).toHaveBeenCalledWith(
        expect.objectContaining({ current_count: 497 }),
        expect.any(Object)
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should reject mortality exceeding current count', async () => {
      db.PoultryFlock.findByPk.mockResolvedValue({ id: 1, current_count: 10, status: 'ACTIVE', is_active: true });

      await expect(
        dailyLogService.createDailyLog(1, { logDate: '2026-04-15', mortalityCount: 15 })
      ).rejects.toThrow('Mortality count exceeds');
    });
  });

  describe('batchAnalyticsService', () => {
    it('should compute mortality rate', async () => {
      db.PoultryFlock.findByPk.mockResolvedValue({ id: 1, initial_count: 500 });
      db.PoultryDailyLog.findAll.mockResolvedValue([
        { mortality_count: 5 }, { mortality_count: 3 }, { mortality_count: 2 },
      ]);

      const rate = await batchAnalytics.computeMortalityRate(1);
      expect(rate).toBe(2); // 10/500 * 100
    });

    it('should generate batch summary', async () => {
      db.PoultryFlock.findByPk.mockResolvedValue({
        id: 1, initial_count: 500, current_count: 490, avg_initial_weight_g: 45,
      });
      db.PoultryDailyLog.findAll.mockResolvedValue([
        { mortality_count: 5, feed_consumed_kg: 100, egg_count: 0, sample_weight_g: 1200, log_date: '2026-04-15' },
        { mortality_count: 5, feed_consumed_kg: 110, egg_count: 0, sample_weight_g: null, log_date: '2026-04-14' },
      ]);
      db.PoultryCostEvent.findAll.mockResolvedValue([{ amount: 5000 }, { amount: 3000 }]);
      db.PoultryRevenueEvent.findAll.mockResolvedValue([{ total_amount: 12000 }]);
      db.PoultryBatchSummary.findOne.mockResolvedValue(null);
      db.PoultryBatchSummary.create.mockImplementation(async (data) => data);

      const summary = await batchAnalytics.generateBatchSummary(1);

      expect(summary.cumulative_mortality).toBe(10);
      expect(summary.cumulative_feed_kg).toBe(210);
      expect(summary.total_cost).toBe(8000);
      expect(summary.total_revenue).toBe(12000);
      expect(summary.profit_per_bird).toBe(8); // (12000-8000)/500
    });
  });

  describe('alertService', () => {
    it('should detect mortality spike when daily rate >1%', async () => {
      db.PoultryFlock.findByPk.mockResolvedValue({ id: 1, initial_count: 500, current_count: 490 });
      db.PoultryDailyLog.findOne.mockResolvedValue({ mortality_count: 8 }); // 8/498 = 1.6%
      db.PoultryDailyLog.findAll.mockResolvedValue([{ mortality_count: 8 }, { mortality_count: 2 }]);

      const alert = await alertService.checkMortalitySpike(1);

      expect(alert).not.toBeNull();
      expect(alert.type).toBe('MORTALITY_SPIKE');
      expect(alert.severity).toBe('RED');
    });

    it('should return null when no mortality issue', async () => {
      db.PoultryFlock.findByPk.mockResolvedValue({ id: 1, initial_count: 500, current_count: 498 });
      db.PoultryDailyLog.findOne.mockResolvedValue({ mortality_count: 1 }); // 1/499 = 0.2%
      db.PoultryDailyLog.findAll.mockResolvedValue([{ mortality_count: 1 }, { mortality_count: 1 }]);

      const alert = await alertService.checkMortalitySpike(1);
      expect(alert).toBeNull();
    });

    it('should run all checks and return array of alerts', async () => {
      db.PoultryFlock.findByPk.mockResolvedValue({
        id: 1, initial_count: 500, current_count: 450, bird_type: 'BROILER',
        placement_date: '2026-01-01', avg_initial_weight_g: 45,
      });
      db.PoultryDailyLog.findOne.mockResolvedValue({ mortality_count: 10, sample_weight_g: 800, log_date: '2026-04-15' });
      db.PoultryDailyLog.findAll.mockResolvedValue([
        { mortality_count: 10, feed_consumed_kg: 100, sample_weight_g: 800, log_date: '2026-04-15' },
      ]);
      db.PoultryPopTemplate.findOne.mockResolvedValue({ expected_weight_g: 2000 });

      const alerts = await alertService.runAllChecks(1);

      expect(Array.isArray(alerts)).toBe(true);
      // Should find mortality spike and weight lag
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });
  });
});
