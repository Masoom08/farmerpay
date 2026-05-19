/**
 * Unit Tests — Dairy PoP Engine
 */

jest.mock('../../src/shared/models', () => ({
  sequelize: {},
  Sequelize: { Op: require('sequelize').Op },
  DairyHerdRegister: { findByPk: jest.fn() },
  DairyAnimal: { findByPk: jest.fn(), findAll: jest.fn() },
  DairyMilkProductionLog: { findAll: jest.fn() },
  DairyFeedUsageLog: { findAll: jest.fn() },
  DairyBreedingEvent: { findOne: jest.fn(), findAll: jest.fn() },
  DairyAnimalHealthRecord: { findAll: jest.fn() },
  DairyPopTemplate: { findOne: jest.fn() },
  RootsComplianceSnapshot: { findOrCreate: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../src/shared/utils/uuidHelper', () => ({ generateUUID: jest.fn().mockReturnValue('test-uuid') }));

const db = require('../../src/shared/models');
const engine = require('../../src/modules/roots/dairy/services/dairyPopEngine');

describe('Dairy PoP Engine', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('computeYieldVariance', () => {
    it('should compare actual yield vs breed benchmark', async () => {
      db.DairyAnimal.findByPk.mockResolvedValue({
        id: 1, animal_uuid: 'a-001', breed: 'HF Crossbred', current_lifecycle_stage: 'PEAK_LACTATION',
      });
      db.DairyBreedingEvent.findOne.mockResolvedValue(null);
      db.DairyPopTemplate.findOne.mockResolvedValue({
        expected_daily_yield_liters: 10,
      });
      db.DairyMilkProductionLog.findAll.mockResolvedValue([
        { total_daily_milk: 8 }, { total_daily_milk: 9 }, { total_daily_milk: 7 },
      ]);

      const result = await engine.computeYieldVariance(1, {});

      expect(result.actualAvg).toBe(8);
      expect(result.expectedAvg).toBe(10);
      expect(result.variancePct).toBe(-20);
      expect(result.lactationStage).toBe('MID');
      expect(result.status).toBe('ON_TRACK'); // -20% = within 25%
    });

    it('should flag CRITICAL when yield is very low', async () => {
      db.DairyAnimal.findByPk.mockResolvedValue({ id: 1, animal_uuid: 'a-001', breed: 'Gir', current_lifecycle_stage: 'EARLY_LACTATION' });
      db.DairyBreedingEvent.findOne.mockResolvedValue(null);
      db.DairyPopTemplate.findOne.mockResolvedValue({ expected_daily_yield_liters: 5 });
      db.DairyMilkProductionLog.findAll.mockResolvedValue([{ total_daily_milk: 1 }, { total_daily_milk: 1.5 }]);

      const result = await engine.computeYieldVariance(1, {});

      expect(result.status).toBe('CRITICAL'); // -75%
    });
  });

  describe('computeFeedEfficiency', () => {
    it('should compute cost per liter and compare to benchmark', async () => {
      db.DairyHerdRegister.findByPk.mockResolvedValue({ id: 1, farmer_id: 42 });
      db.DairyAnimal.findAll.mockResolvedValue([{ animal_uuid: 'a-001' }]);
      db.DairyFeedUsageLog.findAll.mockResolvedValue([{ feed_cost: 200 }, { feed_cost: 180 }]);
      db.DairyMilkProductionLog.findAll.mockResolvedValue([
        { total_daily_milk: 10 }, { total_daily_milk: 9 }, { total_daily_milk: 11 },
      ]);
      db.DairyPopTemplate.findOne.mockResolvedValue({
        expected_feed_cost_per_day: 150, expected_daily_yield_liters: 10,
      });

      const result = await engine.computeFeedEfficiency(1, {});

      expect(result.totalFeedCost).toBe(380);
      expect(result.totalMilkLiters).toBe(30);
      expect(result.costPerLiter).toBe(12.67); // 380/30
      expect(result.benchmark).toBe(15); // 150/10
    });
  });

  describe('checkVaccinationCompliance', () => {
    it('should detect overdue vaccinations', async () => {
      db.DairyHerdRegister.findByPk.mockResolvedValue({ id: 1, farmer_id: 42 });
      db.DairyAnimal.findAll.mockResolvedValue([{ animal_uuid: 'a-001' }]);
      // No health records → all vaccinations overdue
      db.DairyAnimalHealthRecord.findAll.mockResolvedValue([]);
      db.DairyPopTemplate.findOne.mockResolvedValue(null);

      const result = await engine.checkVaccinationCompliance(1);

      expect(result.overdue.length).toBeGreaterThan(0);
      expect(result.compliancePct).toBeLessThan(100);
    });
  });

  describe('checkReproductiveEfficiency', () => {
    it('should compute conception rate and calving interval', async () => {
      db.DairyHerdRegister.findByPk.mockResolvedValue({ id: 1, farmer_id: 42 });
      db.DairyAnimal.findAll.mockResolvedValue([{ animal_uuid: 'a-001' }]);
      db.DairyBreedingEvent.findAll.mockResolvedValue([
        { animal_id: 'a-001', ai_date: '2025-01-01', pregnancy_confirmed: 'YES', actual_calving_date: '2025-10-01', calving_outcome: 'LIVE' },
        { animal_id: 'a-001', ai_date: '2024-01-01', pregnancy_confirmed: 'YES', actual_calving_date: '2024-10-01', calving_outcome: 'LIVE' },
        { animal_id: 'a-001', ai_date: '2025-06-01', pregnancy_confirmed: 'NO', actual_calving_date: null, calving_outcome: null },
      ]);
      db.DairyPopTemplate.findOne.mockResolvedValue({ expected_calving_interval_days: 400 });

      const result = await engine.checkReproductiveEfficiency(1);

      expect(result.totalAttempts).toBe(3);
      expect(result.confirmed).toBe(2);
      expect(result.conceptionRate).toBe(67); // 2/3
      expect(result.avgCalvingInterval).toBeDefined();
    });
  });

  describe('computeDairyComplianceScore', () => {
    it('should compute weighted compliance and upsert snapshot', async () => {
      db.DairyHerdRegister.findByPk.mockResolvedValue({ id: 1, farmer_id: 42 });
      db.DairyAnimal.findAll.mockResolvedValue([{ animal_uuid: 'a-001' }]);
      db.DairyFeedUsageLog.findAll.mockResolvedValue([{ feed_cost: 300 }]);
      db.DairyMilkProductionLog.findAll.mockResolvedValue([{ total_daily_milk: 10 }]);
      db.DairyPopTemplate.findOne.mockResolvedValue({
        expected_feed_cost_per_day: 150, expected_daily_yield_liters: 10,
        expected_calving_interval_days: 400,
      });
      db.DairyAnimalHealthRecord.findAll.mockResolvedValue([]);
      db.DairyBreedingEvent.findOne.mockResolvedValue(null);
      db.DairyBreedingEvent.findAll.mockResolvedValue([]);

      const mockSnapshot = { update: jest.fn() };
      db.RootsComplianceSnapshot.findOrCreate.mockResolvedValue([mockSnapshot, true]);

      const result = await engine.computeDairyComplianceScore(1);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.breakdown.feedCompliance.weight).toBe(25);
      expect(result.breakdown.healthCompliance.weight).toBe(30);
      expect(result.breakdown.reproductiveCompliance.weight).toBe(20);
      expect(result.breakdown.productionEfficiency.weight).toBe(25);
      expect(db.RootsComplianceSnapshot.findOrCreate).toHaveBeenCalled();
    });
  });

  describe('generateDairyAlerts', () => {
    it('should detect yield drop alert', async () => {
      db.DairyHerdRegister.findByPk.mockResolvedValue({ id: 1, farmer_id: 42 });
      db.DairyAnimal.findAll.mockResolvedValue([{ animal_uuid: 'a-001', tag_id: 'T-001' }]);

      // 7-day avg = 10, last 3 = 5 each (50% drop)
      db.DairyMilkProductionLog.findAll.mockResolvedValue([
        { total_daily_milk: 5 }, { total_daily_milk: 5 }, { total_daily_milk: 5 },
        { total_daily_milk: 10 }, { total_daily_milk: 12 }, { total_daily_milk: 11 },
        { total_daily_milk: 10 }, { total_daily_milk: 9 }, { total_daily_milk: 10 },
        { total_daily_milk: 11 },
      ]);

      db.DairyAnimalHealthRecord.findAll.mockResolvedValue([]);
      db.DairyPopTemplate.findOne.mockResolvedValue(null);
      db.DairyFeedUsageLog.findAll.mockResolvedValue([]);
      db.DairyBreedingEvent.findOne.mockResolvedValue(null);

      const alerts = await engine.generateDairyAlerts(1);

      const yieldAlert = alerts.find((a) => a.type === 'YIELD_DROP');
      expect(yieldAlert).toBeDefined();
      expect(yieldAlert.severity).toBe('HIGH');
    });
  });
});
