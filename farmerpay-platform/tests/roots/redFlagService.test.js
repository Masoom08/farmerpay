/**
 * Unit Tests — Red Flag Detection Service
 *
 * Tests all 7 detection methods with mocked DB and RabbitMQ.
 */

const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
const mockChannel = { publish: jest.fn() };

jest.mock('../../src/shared/models', () => ({
  sequelize: {
    transaction: jest.fn().mockResolvedValue(mockTransaction),
    query: jest.fn(),
  },
  Sequelize: { Op: require('sequelize').Op, fn: jest.fn(), col: jest.fn() },
  CultivationCycle: { findOne: jest.fn(), findAll: jest.fn() },
  WorkbandExecution: { findOne: jest.fn(), findAll: jest.fn() },
  TaskExecution: {},
  TaskExecutionInputLog: {},
  PopWorkband: { findAll: jest.fn() },
  HarvestRecord: { findOne: jest.fn() },
  Field: { findByPk: jest.fn() },
  FarmRegister: { findByPk: jest.fn() },
  LoanApplication: { findByPk: jest.fn(), findAll: jest.fn() },
  LoanDisbursement: { findOne: jest.fn() },
  VendorFarmerLink: { findAll: jest.fn() },
  RootsRedFlag: { findOne: jest.fn(), create: jest.fn() },
  RootsLoanUtilizationTracking: { findOrCreate: jest.fn() },
  RootsComplianceSnapshot: { findOrCreate: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn().mockReturnValue('test-flag-uuid'),
}));

jest.mock('../../src/config/rabbitmq', () => ({
  getChannel: jest.fn().mockResolvedValue(mockChannel),
}));

jest.mock('../../src/config', () => ({
  rabbitmq: { exchange: 'farmerpay_exchange' },
}));

// Mock varianceService for detectCostAnomaly
jest.mock('../../src/modules/roots/crop/services/varianceService', () => ({
  computeCycleComplianceScore: jest.fn(),
}));

const redFlagService = require('../../src/modules/roots/crop/services/redFlagService');
const db = require('../../src/shared/models');
const varianceService = require('../../src/modules/roots/crop/services/varianceService');

describe('redFlagService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.commit.mockClear();
    mockTransaction.rollback.mockClear();
    mockChannel.publish.mockClear();
    // Default: no existing open flags
    db.RootsRedFlag.findOne.mockResolvedValue(null);
    db.RootsRedFlag.create.mockImplementation(async (data) => ({ ...data, id: 1, created_at: new Date() }));
  });

  /* ════════════════════════════════════════════════════════════════
   * 1. detectNoDataEntry
   * ════════════════════════════════════════════════════════════════ */

  describe('detectNoDataEntry', () => {
    it('should create HIGH flag when 30-45 days without data', async () => {
      const daysAgo = (n) => new Date(Date.now() - n * 86400000);

      db.CultivationCycle.findOne.mockResolvedValue({
        id: 1, cycle_uuid: 'c-001', cycle_status: 'growing', linked_loan_id: null, created_at: daysAgo(60),
      });
      db.WorkbandExecution.findOne.mockResolvedValue({ updated_at: daysAgo(35) });

      const flag = await redFlagService.detectNoDataEntry(42, 'CROP', 1);

      expect(flag).not.toBeNull();
      expect(flag.flag_type).toBe('NO_DATA_ENTRY');
      expect(flag.severity).toBe('HIGH');
      expect(flag.evidence_json.days_since_last).toBeGreaterThanOrEqual(30);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should create CRITICAL flag when >45 days without data', async () => {
      const daysAgo = (n) => new Date(Date.now() - n * 86400000);

      db.CultivationCycle.findOne.mockResolvedValue({
        id: 1, cycle_uuid: 'c-001', cycle_status: 'growing', linked_loan_id: 5, created_at: daysAgo(90),
      });
      db.WorkbandExecution.findOne.mockResolvedValue({ updated_at: daysAgo(50) });

      const flag = await redFlagService.detectNoDataEntry(42, 'CROP', 1);

      expect(flag.severity).toBe('CRITICAL');
      expect(flag.evidence_json.loan_linked).toBe(true);
    });

    it('should return null when recent data exists (<30 days)', async () => {
      const daysAgo = (n) => new Date(Date.now() - n * 86400000);

      db.CultivationCycle.findOne.mockResolvedValue({ id: 1, cycle_uuid: 'c-001', created_at: daysAgo(10) });
      db.WorkbandExecution.findOne.mockResolvedValue({ updated_at: daysAgo(5) });

      const flag = await redFlagService.detectNoDataEntry(42, 'CROP', 1);
      expect(flag).toBeNull();
    });

    it('should skip if open flag already exists', async () => {
      db.RootsRedFlag.findOne.mockResolvedValue({ id: 99, status: 'OPEN' }); // existing flag

      const flag = await redFlagService.detectNoDataEntry(42, 'CROP', 1);

      expect(flag).toBeNull();
      expect(db.RootsRedFlag.create).not.toHaveBeenCalled();
    });

    it('should return null when cycle not found', async () => {
      db.CultivationCycle.findOne.mockResolvedValue(null);

      const flag = await redFlagService.detectNoDataEntry(42, 'CROP', 999);
      expect(flag).toBeNull();
    });

    it('should publish RabbitMQ event on flag creation via centralized emitter', async () => {
      const daysAgo = (n) => new Date(Date.now() - n * 86400000);
      db.CultivationCycle.findOne.mockResolvedValue({ id: 1, cycle_uuid: 'c-001', cycle_status: 'growing', linked_loan_id: null, created_at: daysAgo(60) });
      db.WorkbandExecution.findOne.mockResolvedValue({ updated_at: daysAgo(35) });

      await redFlagService.detectNoDataEntry(42, 'CROP', 1);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'roots_events',
        'redflag.created',
        expect.any(Buffer),
        expect.objectContaining({ persistent: true, contentType: 'application/json' })
      );
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 2. detectCriticalStageMissed
   * ════════════════════════════════════════════════════════════════ */

  describe('detectCriticalStageMissed', () => {
    const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

    beforeEach(() => {
      db.CultivationCycle.findOne.mockResolvedValue({
        id: 1, cycle_uuid: 'c-001', farmer_id: 42,
        cycle_sowing_date: daysAgo(100), pop_id: 'pop-001',
      });
    });

    it('should flag missed critical stages (sowing, harvest)', async () => {
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Sowing', days_from_sowing_start: 0, days_from_sowing_end: 5 },
        { id: 2, workband_name: 'Weeding', days_from_sowing_start: 20, days_from_sowing_end: 30 },
        { id: 3, workband_name: 'Harvest', days_from_sowing_start: 80, days_from_sowing_end: 90 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([
        { pop_workband_id: 1, workband_status: 'completed' },
        // No execution for weeding or harvest
      ]);

      const flags = await redFlagService.detectCriticalStageMissed(1);

      // Only harvest is critical and missed (weeding is not critical)
      expect(flags.length).toBeGreaterThanOrEqual(1);
      const harvestFlag = flags.find((f) => f.evidence_json.stage_name === 'Harvest');
      expect(harvestFlag).toBeDefined();
      expect(harvestFlag.flag_type).toBe('CRITICAL_STAGE_MISSED');
    });

    it('should not flag non-critical stages', async () => {
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Thinning', days_from_sowing_start: 10, days_from_sowing_end: 15 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([]);

      const flags = await redFlagService.detectCriticalStageMissed(1);
      expect(flags).toHaveLength(0);
    });

    it('should not flag stages still in grace window', async () => {
      db.CultivationCycle.findOne.mockResolvedValue({
        id: 1, cycle_uuid: 'c-001', farmer_id: 42,
        cycle_sowing_date: daysAgo(10), pop_id: 'pop-001',
      });
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Sowing', days_from_sowing_start: 0, days_from_sowing_end: 5 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([]);

      const flags = await redFlagService.detectCriticalStageMissed(1);
      expect(flags).toHaveLength(0); // within 7-day grace
    });

    it('should return empty when cycle has no pop_id', async () => {
      db.CultivationCycle.findOne.mockResolvedValue({
        id: 1, cycle_uuid: 'c-001', farmer_id: 42,
        cycle_sowing_date: daysAgo(100), pop_id: null,
      });

      const flags = await redFlagService.detectCriticalStageMissed(1);
      expect(flags).toHaveLength(0);
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 3. detectCostAnomaly
   * ════════════════════════════════════════════════════════════════ */

  describe('detectCostAnomaly', () => {
    it('should flag HIGH when cost exceeds 200% of benchmark', async () => {
      varianceService.computeCycleComplianceScore.mockResolvedValue({
        farmerId: 42,
        totalActualCost: 45000,
        totalExpectedCost: 15000,
        costVariancePct: 200,
        workbands: [{ workband_name: 'Sowing', scores: { cost_score: 10 }, cost: { classification: 'SEVERE' }, activity_reference_id: 1 }],
      });

      const flag = await redFlagService.detectCostAnomaly('c-001');

      expect(flag).not.toBeNull();
      expect(flag.flag_type).toBe('COST_ANOMALY');
      expect(flag.severity).toBe('HIGH'); // >200% → ratio 3.0 > 2.0
    });

    it('should return MEDIUM for 150-200% variance', async () => {
      varianceService.computeCycleComplianceScore.mockResolvedValue({
        farmerId: 42,
        totalActualCost: 25000,
        totalExpectedCost: 15000,
        costVariancePct: 66.7,
        workbands: [{ workband_name: 'Sowing', scores: { cost_score: 40 }, cost: { classification: 'MODERATE' }, activity_reference_id: 1 }],
      });

      const flag = await redFlagService.detectCostAnomaly('c-001');

      expect(flag).not.toBeNull();
      expect(flag.severity).toBe('MEDIUM');
    });

    it('should not flag when cost is within normal range', async () => {
      varianceService.computeCycleComplianceScore.mockResolvedValue({
        farmerId: 42,
        totalActualCost: 16000,
        totalExpectedCost: 15000,
        costVariancePct: 6.7,
        workbands: [],
      });

      const flag = await redFlagService.detectCostAnomaly('c-001');
      expect(flag).toBeNull();
    });

    it('should flag when cost is <30% of benchmark', async () => {
      varianceService.computeCycleComplianceScore.mockResolvedValue({
        farmerId: 42,
        totalActualCost: 3000,
        totalExpectedCost: 15000,
        costVariancePct: -80,
        workbands: [{ workband_name: 'Sowing', scores: { cost_score: 10 }, cost: { classification: 'SEVERE' }, activity_reference_id: 1 }],
      });

      const flag = await redFlagService.detectCostAnomaly('c-001');
      expect(flag).not.toBeNull();
      expect(flag.severity).toBe('HIGH');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 4. detectYieldAnomaly
   * ════════════════════════════════════════════════════════════════ */

  describe('detectYieldAnomaly', () => {
    beforeEach(() => {
      db.HarvestRecord.findOne.mockResolvedValue({ id: 10, yield_per_hectare_kg: 8000 });
      db.CultivationCycle.findOne.mockResolvedValue({
        id: 1, cycle_uuid: 'c-001', farmer_id: 42, field_id: 5, crop_id: 'rice-001',
      });
      db.Field.findByPk.mockResolvedValue({ farm_register_id: 3 });
      db.FarmRegister.findByPk.mockResolvedValue({ district_id: 12 });
    });

    it('should flag yield >2 std devs above district average', async () => {
      db.sequelize.query.mockResolvedValue([
        [{ avg_yield: 4000, std_dev: 1500, sample_count: 20 }],
      ]);

      const flag = await redFlagService.detectYieldAnomaly(1, 10);

      expect(flag).not.toBeNull();
      expect(flag.flag_type).toBe('YIELD_ANOMALY');
      expect(flag.evidence_json.z_score).toBeGreaterThan(2);
    });

    it('should not flag when within normal range', async () => {
      db.sequelize.query.mockResolvedValue([
        [{ avg_yield: 7000, std_dev: 1500, sample_count: 20 }],
      ]);

      const flag = await redFlagService.detectYieldAnomaly(1, 10);
      expect(flag).toBeNull(); // z_score = (8000-7000)/1500 = 0.67
    });

    it('should not flag with insufficient sample size (<5)', async () => {
      db.sequelize.query.mockResolvedValue([
        [{ avg_yield: 4000, std_dev: 500, sample_count: 3 }],
      ]);

      const flag = await redFlagService.detectYieldAnomaly(1, 10);
      expect(flag).toBeNull();
    });

    it('should return null when no harvest record', async () => {
      db.HarvestRecord.findOne.mockResolvedValue(null);

      const flag = await redFlagService.detectYieldAnomaly(1, 999);
      expect(flag).toBeNull();
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 5. detectBackfillPattern
   * ════════════════════════════════════════════════════════════════ */

  describe('detectBackfillPattern', () => {
    it('should flag when 3+ entries created on same day', async () => {
      db.CultivationCycle.findOne.mockResolvedValue({ id: 1, cycle_uuid: 'c-001' });
      db.sequelize.query.mockResolvedValue([
        [{ entry_date: '2026-04-10', entry_count: 5, stages: 'Sowing, Weeding, Fertilization, Pest, Irrigation' }],
      ]);

      const flag = await redFlagService.detectBackfillPattern(42, 1);

      expect(flag).not.toBeNull();
      expect(flag.flag_type).toBe('BACKFILL_SUSPECTED');
      expect(flag.severity).toBe('MEDIUM');
      expect(flag.evidence_json.entries_on_same_day).toBe(5);
    });

    it('should return null when no backfill pattern', async () => {
      db.CultivationCycle.findOne.mockResolvedValue({ id: 1, cycle_uuid: 'c-001' });
      db.sequelize.query.mockResolvedValue([[]]);

      const flag = await redFlagService.detectBackfillPattern(42, 1);
      expect(flag).toBeNull();
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 6. detectLoanUtilizationMismatch
   * ════════════════════════════════════════════════════════════════ */

  describe('detectLoanUtilizationMismatch', () => {
    const daysAgo = (n) => new Date(Date.now() - n * 86400000);

    beforeEach(() => {
      db.LoanApplication.findByPk.mockResolvedValue({ id: 10 });
      db.LoanDisbursement.findOne.mockResolvedValue({
        disbursement_amount: 100000,
        transferred_at: daysAgo(45),
      });
      db.CultivationCycle.findAll.mockResolvedValue([{ cycle_uuid: 'c-001' }]);
      const mockTracking = { update: jest.fn() };
      db.RootsLoanUtilizationTracking.findOrCreate.mockResolvedValue([mockTracking, true]);
    });

    it('should flag when utilization <20%', async () => {
      db.sequelize.query.mockResolvedValue([[{ total_cost: 5000 }]]);
      db.VendorFarmerLink.findAll.mockResolvedValue([{ totalPurchases: 3000 }]);

      const flag = await redFlagService.detectLoanUtilizationMismatch(42, 10);

      expect(flag).not.toBeNull();
      expect(flag.flag_type).toBe('LOAN_UTILIZATION_MISMATCH');
      expect(flag.severity).toBe('HIGH');
      expect(flag.evidence_json.utilization_pct).toBeLessThan(20);
    });

    it('should not flag when utilization >=20%', async () => {
      db.sequelize.query.mockResolvedValue([[{ total_cost: 50000 }]]);
      db.VendorFarmerLink.findAll.mockResolvedValue([{ totalPurchases: 30000 }]);

      const flag = await redFlagService.detectLoanUtilizationMismatch(42, 10);
      expect(flag).toBeNull();
    });

    it('should not flag when <30 days since disbursement', async () => {
      db.LoanDisbursement.findOne.mockResolvedValue({
        disbursement_amount: 100000,
        transferred_at: daysAgo(15),
      });

      const flag = await redFlagService.detectLoanUtilizationMismatch(42, 10);
      expect(flag).toBeNull();
    });

    it('should upsert loan utilization tracking', async () => {
      db.sequelize.query.mockResolvedValue([[{ total_cost: 5000 }]]);
      db.VendorFarmerLink.findAll.mockResolvedValue([{ totalPurchases: 3000 }]);

      await redFlagService.detectLoanUtilizationMismatch(42, 10);

      expect(db.RootsLoanUtilizationTracking.findOrCreate).toHaveBeenCalledTimes(1);
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 7. runAllDetections
   * ════════════════════════════════════════════════════════════════ */

  describe('runAllDetections', () => {
    it('should run all detections for active cycles', async () => {
      const daysAgo = (n) => new Date(Date.now() - n * 86400000);

      db.CultivationCycle.findAll.mockResolvedValue([
        { id: 1, cycle_uuid: 'c-001', farmer_id: 42, cycle_status: 'growing' },
      ]);
      db.LoanApplication.findAll.mockResolvedValue([]);

      // detectNoDataEntry mocks
      db.CultivationCycle.findOne.mockResolvedValue({
        id: 1, cycle_uuid: 'c-001', cycle_status: 'growing',
        linked_loan_id: null, created_at: daysAgo(10),
        cycle_sowing_date: null, pop_id: null,
      });
      db.WorkbandExecution.findOne.mockResolvedValue({ updated_at: daysAgo(5) });
      db.PopWorkband.findAll.mockResolvedValue([]);
      db.WorkbandExecution.findAll.mockResolvedValue([]);

      varianceService.computeCycleComplianceScore.mockResolvedValue({
        farmerId: 42, totalActualCost: 10000, totalExpectedCost: 10000,
        costVariancePct: 0, workbands: [],
      });
      db.sequelize.query.mockResolvedValue([[]]);

      const flags = await redFlagService.runAllDetections(42);

      expect(Array.isArray(flags)).toBe(true);
    });

    it('should continue processing when one detection fails', async () => {
      db.CultivationCycle.findAll.mockResolvedValue([
        { id: 1, cycle_uuid: 'c-001', farmer_id: 42 },
      ]);
      db.LoanApplication.findAll.mockResolvedValue([]);

      // Make detectNoDataEntry fail
      db.CultivationCycle.findOne.mockRejectedValue(new Error('DB timeout'));

      const flags = await redFlagService.runAllDetections(42);

      // Should not throw, returns empty array
      expect(Array.isArray(flags)).toBe(true);
    });
  });
});
