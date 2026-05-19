/**
 * Unit Tests — Variance Computation Service
 *
 * Tests all 7 methods of the core Variance Engine in isolation.
 * Uses mocked Sequelize models (no real DB).
 */

const { v4: uuidv4 } = require('uuid');

// ── Mock shared/models before requiring the service ──
const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

jest.mock('../../src/shared/models', () => ({
  sequelize: {
    transaction: jest.fn().mockResolvedValue(mockTransaction),
  },
  Sequelize: { Op: require('sequelize').Op },
  CultivationCycle: { findOne: jest.fn() },
  WorkbandExecution: { findAll: jest.fn() },
  PopWorkband: { findAll: jest.fn() },
  PopTask: {},
  PopTaskInput: {},
  PopCostBenchmark: { findAll: jest.fn() },
  TaskExecution: {},
  TaskExecutionInputLog: {},
  InputItem: {},
  InputUnit: {},
  Field: { findByPk: jest.fn() },
  SoilHealthRecord: { findOne: jest.fn() },
  RootsComplianceSnapshot: { findOrCreate: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn().mockReturnValue('test-uuid-1234'),
}));

const varianceService = require('../../src/modules/roots/crop/services/varianceService');
const db = require('../../src/shared/models');

/* ════════════════════════════════════════════════════════════════
 * 1. computeTimingVariance
 * ════════════════════════════════════════════════════════════════ */

describe('varianceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('computeTimingVariance', () => {
    const popWorkband = {
      days_from_sowing_start: 20,
      days_from_sowing_end: 30,
    };
    const sowingDate = '2026-01-01';

    it('should return ON_TIME when execution is within the window', () => {
      const exec = { workband_start_date: '2026-01-25' }; // day 24, within 20-30
      const result = varianceService.computeTimingVariance(exec, popWorkband, sowingDate);

      expect(result.type).toBe('timing');
      expect(result.classification).toBe('ON_TIME');
      expect(result.score).toBe(100);
      expect(result.days_off).toBe(0);
      expect(result.direction).toBe('on_time');
    });

    it('should return ON_TIME at window boundaries', () => {
      // Exactly on start day
      const execStart = { workband_start_date: '2026-01-21' }; // day 20
      expect(varianceService.computeTimingVariance(execStart, popWorkband, sowingDate).classification).toBe('ON_TIME');

      // Exactly on end day
      const execEnd = { workband_start_date: '2026-01-31' }; // day 30
      expect(varianceService.computeTimingVariance(execEnd, popWorkband, sowingDate).classification).toBe('ON_TIME');
    });

    it('should return SLIGHT for 1-7 days off', () => {
      const exec = { workband_start_date: '2026-02-04' }; // day 34, 4 days after window end
      const result = varianceService.computeTimingVariance(exec, popWorkband, sowingDate);

      expect(result.classification).toBe('SLIGHT');
      expect(result.score).toBe(75);
      expect(result.direction).toBe('late');
      expect(result.days_off).toBeLessThanOrEqual(7);
    });

    it('should return MODERATE for 8-14 days off', () => {
      const exec = { workband_start_date: '2026-02-10' }; // day 40, 10 days after window end
      const result = varianceService.computeTimingVariance(exec, popWorkband, sowingDate);

      expect(result.classification).toBe('MODERATE');
      expect(result.score).toBe(40);
      expect(result.direction).toBe('late');
    });

    it('should return SEVERE for >14 days off', () => {
      const exec = { workband_start_date: '2026-03-01' }; // way past window
      const result = varianceService.computeTimingVariance(exec, popWorkband, sowingDate);

      expect(result.classification).toBe('SEVERE');
      expect(result.score).toBe(10);
      expect(result.direction).toBe('late');
    });

    it('should detect early execution', () => {
      const exec = { workband_start_date: '2026-01-10' }; // day 9, 11 days before window start at day 20
      const result = varianceService.computeTimingVariance(exec, popWorkband, sowingDate);

      expect(result.direction).toBe('early');
      expect(result.score).toBeLessThan(100);
    });

    it('should return MISSED when no execution and past grace period', () => {
      // Mock today to be well past the window_end + 14
      const distantPast = {
        days_from_sowing_start: 5,
        days_from_sowing_end: 10,
      };
      const oldSowing = '2025-01-01'; // Over a year ago

      const result = varianceService.computeTimingVariance(null, distantPast, oldSowing);

      expect(result.classification).toBe('MISSED');
      expect(result.score).toBe(0);
      expect(result.direction).toBe('missed');
    });

    it('should return PENDING when no execution but still within grace', () => {
      // Use dates far in the future so grace period hasn't elapsed
      const futurePop = { days_from_sowing_start: 300, days_from_sowing_end: 310 };
      const result = varianceService.computeTimingVariance(null, futurePop, sowingDate);

      // Either PENDING (still within grace) or MISSED (past grace) — depends on current date
      expect(['PENDING', 'MISSED']).toContain(result.classification);
    });

    it('should handle null sowingDate gracefully', () => {
      const exec = { workband_start_date: '2026-01-25' };
      const result = varianceService.computeTimingVariance(exec, popWorkband, null);

      expect(result.classification).toBe('UNKNOWN');
      expect(result.score).toBe(0);
    });

    it('should handle null popWorkband gracefully', () => {
      const exec = { workband_start_date: '2026-01-25' };
      const result = varianceService.computeTimingVariance(exec, null, sowingDate);

      expect(result.classification).toBe('UNKNOWN');
      expect(result.score).toBe(0);
    });

    it('should handle execution with no start_date', () => {
      const exec = { workband_start_date: null };
      const distantPast = { days_from_sowing_start: 5, days_from_sowing_end: 10 };
      const result = varianceService.computeTimingVariance(exec, distantPast, '2025-01-01');

      // Treated same as no execution
      expect(['MISSED', 'PENDING']).toContain(result.classification);
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 2. computeQuantityVariance
   * ════════════════════════════════════════════════════════════════ */

  describe('computeQuantityVariance', () => {
    const popInputs = [
      { input_item_id: 'urea-001', input_quantity: 100, inputItem: { item_name: 'Urea' } },
      { input_item_id: 'dap-001', input_quantity: 50, inputItem: { item_name: 'DAP' } },
      { input_item_id: 'ssp-001', input_quantity: 80, inputItem: { item_name: 'SSP' } },
    ];

    it('should return COMPLIANT for <10% variance', () => {
      const logs = [
        { input_item_id: 'urea-001', quantity_used: 105 },  // 5% over
        { input_item_id: 'dap-001', quantity_used: 48 },    // 4% under
        { input_item_id: 'ssp-001', quantity_used: 82 },    // 2.5% over
      ];
      const result = varianceService.computeQuantityVariance(logs, popInputs);

      expect(result).toHaveLength(3);
      result.forEach((r) => {
        expect(r.classification).toBe('COMPLIANT');
        expect(r.score).toBe(100);
      });
    });

    it('should return MILD for 10-25% variance', () => {
      const logs = [{ input_item_id: 'urea-001', quantity_used: 120 }]; // 20% over
      const result = varianceService.computeQuantityVariance(logs, [popInputs[0]]);

      expect(result[0].classification).toBe('MILD');
      expect(result[0].score).toBe(75);
      expect(result[0].variance_pct).toBe(20);
    });

    it('should return MODERATE for 25-50% variance', () => {
      const logs = [{ input_item_id: 'urea-001', quantity_used: 140 }]; // 40% over
      const result = varianceService.computeQuantityVariance(logs, [popInputs[0]]);

      expect(result[0].classification).toBe('MODERATE');
      expect(result[0].score).toBe(40);
    });

    it('should return SEVERE for >50% variance', () => {
      const logs = [{ input_item_id: 'urea-001', quantity_used: 200 }]; // 100% over
      const result = varianceService.computeQuantityVariance(logs, [popInputs[0]]);

      expect(result[0].classification).toBe('SEVERE');
      expect(result[0].score).toBe(10);
    });

    it('should return MISSING for inputs with no logs', () => {
      const result = varianceService.computeQuantityVariance([], popInputs);

      expect(result).toHaveLength(3);
      result.forEach((r) => {
        expect(r.classification).toBe('MISSING');
        expect(r.score).toBe(0);
      });
    });

    it('should aggregate multiple logs for the same input', () => {
      const logs = [
        { input_item_id: 'urea-001', quantity_used: 50 },
        { input_item_id: 'urea-001', quantity_used: 55 },  // total 105, 5% over
      ];
      const result = varianceService.computeQuantityVariance(logs, [popInputs[0]]);

      expect(result[0].classification).toBe('COMPLIANT');
      expect(result[0].score).toBe(100);
    });

    it('should handle empty popInputs', () => {
      const result = varianceService.computeQuantityVariance([{ input_item_id: 'x', quantity_used: 10 }], []);
      expect(result).toHaveLength(0);
    });

    it('should handle null inputs gracefully', () => {
      expect(varianceService.computeQuantityVariance(null, null)).toEqual([]);
      expect(varianceService.computeQuantityVariance([], null)).toEqual([]);
    });

    it('should detect under-application (negative variance)', () => {
      const logs = [{ input_item_id: 'urea-001', quantity_used: 60 }]; // -40%
      const result = varianceService.computeQuantityVariance(logs, [popInputs[0]]);

      expect(result[0].variance_pct).toBeLessThan(0);
      expect(result[0].classification).toBe('MODERATE'); // abs(40%) = 25-50% band
    });

    it('should return NO_BENCHMARK when recommended qty is 0', () => {
      const zeroPop = [{ input_item_id: 'x', input_quantity: 0, inputItem: { item_name: 'X' } }];
      const logs = [{ input_item_id: 'x', quantity_used: 10 }];
      const result = varianceService.computeQuantityVariance(logs, zeroPop);

      expect(result[0].classification).toBe('NO_BENCHMARK');
      expect(result[0].score).toBe(50);
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 3. computeCostVariance
   * ════════════════════════════════════════════════════════════════ */

  describe('computeCostVariance', () => {
    const benchmark = { estimated_cost_per_hectare: 10000 };
    const areaHectares = 2; // benchmark total = 20000

    it('should return COMPLIANT for <10% variance', () => {
      const result = varianceService.computeCostVariance(21000, benchmark, areaHectares); // 5% over
      expect(result.classification).toBe('COMPLIANT');
      expect(result.score).toBe(100);
      expect(result.actual).toBe(21000);
      expect(result.benchmark).toBe(20000);
    });

    it('should return MILD for 10-25% variance', () => {
      const result = varianceService.computeCostVariance(24000, benchmark, areaHectares); // 20% over
      expect(result.classification).toBe('MILD');
      expect(result.score).toBe(75);
    });

    it('should return MODERATE for 25-50% variance', () => {
      const result = varianceService.computeCostVariance(28000, benchmark, areaHectares); // 40% over
      expect(result.classification).toBe('MODERATE');
      expect(result.score).toBe(40);
    });

    it('should return SEVERE for >50% variance', () => {
      const result = varianceService.computeCostVariance(40000, benchmark, areaHectares); // 100% over
      expect(result.classification).toBe('SEVERE');
      expect(result.score).toBe(10);
    });

    it('should return NO_BENCHMARK when benchmark is null', () => {
      const result = varianceService.computeCostVariance(5000, null, 2);
      expect(result.classification).toBe('NO_BENCHMARK');
      expect(result.score).toBe(50);
    });

    it('should return NO_BENCHMARK when area is null', () => {
      const result = varianceService.computeCostVariance(5000, benchmark, null);
      expect(result.classification).toBe('NO_BENCHMARK');
    });

    it('should handle zero actual costs', () => {
      const result = varianceService.computeCostVariance(0, benchmark, areaHectares);
      expect(result.score).toBeGreaterThanOrEqual(10);
      expect(result.type).toBe('cost');
    });

    it('should handle under-budget correctly (negative variance)', () => {
      const result = varianceService.computeCostVariance(15000, benchmark, areaHectares); // 25% under
      expect(result.variance_pct).toBeLessThan(0);
      // Under budget within 10-25% band
      expect(result.classification).toBe('MILD');
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 4. computePracticeVariance
   * ════════════════════════════════════════════════════════════════ */

  describe('computePracticeVariance', () => {
    const popTasks = [
      { id: 1, task_name: 'Sowing', is_optional: false, popTaskInputs: [{ input_item_id: 'seed-001' }] },
      { id: 2, task_name: 'Weeding', is_optional: false, popTaskInputs: [] },
      { id: 3, task_name: 'Mulching', is_optional: true, popTaskInputs: [] },
    ];

    it('should return COMPLIANT for completed tasks', () => {
      const execs = [
        { pop_task_id: 1, task_status: 'completed', task_completion_percentage: 100, taskExecutionInputLogs: [{ input_item_id: 'seed-001' }] },
        { pop_task_id: 2, task_status: 'completed', task_completion_percentage: 100, taskExecutionInputLogs: [] },
        { pop_task_id: 3, task_status: 'completed', task_completion_percentage: 100, taskExecutionInputLogs: [] },
      ];
      const result = varianceService.computePracticeVariance(execs, popTasks);

      expect(result).toHaveLength(3);
      result.forEach((r) => {
        expect(r.status).toBe('COMPLIANT');
        expect(r.score).toBe(100);
      });
    });

    it('should return MISSED for non-executed mandatory tasks', () => {
      const result = varianceService.computePracticeVariance([], popTasks);

      const mandatory = result.filter((r) => !r.task_name.includes('Mulching'));
      mandatory.forEach((r) => {
        expect(r.status).toBe('MISSED');
        expect(r.score).toBe(0);
      });
    });

    it('should return SKIPPED with higher score for non-executed optional tasks', () => {
      const result = varianceService.computePracticeVariance([], popTasks);

      const optional = result.find((r) => r.task_name === 'Mulching');
      expect(optional.status).toBe('SKIPPED');
      expect(optional.score).toBeGreaterThan(0); // 60 for optional
    });

    it('should detect PARTIAL for in-progress tasks', () => {
      const execs = [
        { pop_task_id: 1, task_status: 'in_progress', task_completion_percentage: 50, taskExecutionInputLogs: [] },
      ];
      const result = varianceService.computePracticeVariance(execs, popTasks);

      expect(result[0].status).toBe('PARTIAL');
      expect(result[0].score).toBe(50); // clamped from completion_percentage
    });

    it('should detect SUBSTITUTED when different input used', () => {
      const execs = [{
        pop_task_id: 1, task_status: 'completed', task_completion_percentage: 100,
        taskExecutionInputLogs: [{ input_item_id: 'different-seed-999', input_name: 'Other Seed' }],
      }];
      const result = varianceService.computePracticeVariance(execs, popTasks);

      expect(result[0].status).toBe('SUBSTITUTED');
      expect(result[0].score).toBe(60);
      expect(result[0].substitutions.length).toBeGreaterThan(0);
    });

    it('should handle empty popTasks', () => {
      const result = varianceService.computePracticeVariance([{ pop_task_id: 1 }], []);
      expect(result).toHaveLength(0);
    });

    it('should handle skipped status for mandatory tasks', () => {
      const execs = [{ pop_task_id: 1, task_status: 'skipped', taskExecutionInputLogs: [] }];
      const result = varianceService.computePracticeVariance(execs, popTasks);

      expect(result[0].status).toBe('SKIPPED');
      expect(result[0].score).toBe(10); // mandatory skipped = 10
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 5. computeWorkbandScore
   * ════════════════════════════════════════════════════════════════ */

  describe('computeWorkbandScore', () => {
    it('should compute weighted score from all dimensions', () => {
      const timing = { score: 100 };
      const quantity = [{ score: 80 }, { score: 60 }]; // avg 70
      const cost = { score: 90 };
      const practice = [{ score: 100 }, { score: 50 }]; // avg 75

      const result = varianceService.computeWorkbandScore(timing, quantity, cost, practice);

      expect(result.timing_score).toBe(100);
      expect(result.quantity_score).toBe(70);
      expect(result.cost_score).toBe(90);
      expect(result.practice_score).toBe(75);
      expect(result.workband_score).toBeGreaterThan(0);
      expect(result.workband_score).toBeLessThanOrEqual(100);

      // Verify weighted: 100*0.3 + 70*0.25 + 90*0.15 + 75*0.3 = 30+17.5+13.5+22.5 = 83.5
      expect(result.workband_score).toBe(83.5);
    });

    it('should redistribute weight when dimensions are null', () => {
      const timing = { score: 100 };
      const quantity = []; // no data → null avg
      const cost = { score: 80 };
      const practice = [{ score: 60 }];

      const result = varianceService.computeWorkbandScore(timing, quantity, cost, practice);

      expect(result.quantity_score).toBeNull();
      expect(result.workband_score).not.toBeNull();
      // Available weight: timing(0.3) + cost(0.15) + practice(0.3) = 0.75
      // Score: (100*0.3 + 80*0.15 + 60*0.3) / 0.75 = (30+12+18)/0.75 = 80
      expect(result.workband_score).toBe(80);
    });

    it('should return all nulls when no dimensions have data', () => {
      const result = varianceService.computeWorkbandScore({ score: null }, [], null, []);

      expect(result.workband_score).toBeNull();
      expect(result.timing_score).toBeNull();
      expect(result.quantity_score).toBeNull();
      expect(result.cost_score).toBeNull();
      expect(result.practice_score).toBeNull();
    });

    it('should ignore MISSING classifications in quantity average', () => {
      const quantity = [
        { score: 80, classification: 'MILD' },
        { score: 0, classification: 'MISSING' },
      ];
      const result = varianceService.computeWorkbandScore({ score: 100 }, quantity, { score: 100 }, [{ score: 100 }]);

      // MISSING should be excluded from average
      expect(result.quantity_score).toBe(80); // only the MILD entry counts
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 6. computeCycleComplianceScore
   * ════════════════════════════════════════════════════════════════ */

  describe('computeCycleComplianceScore', () => {
    const mockCycle = {
      id: 1,
      cycle_uuid: 'cycle-uuid-001',
      cycle_sowing_date: '2025-06-15',
      farmer_id: 42,
      field_id: 10,
      pop_id: 'pop-uuid-001',
      cycle_season: 'kharif',
      cycle_year: 2025,
    };

    const mockPopWorkband = {
      id: 1,
      workband_name: 'Sowing',
      workband_order: 1,
      days_from_sowing_start: 0,
      days_from_sowing_end: 5,
      popTasks: [{
        id: 101,
        task_name: 'Seed sowing',
        is_optional: false,
        popTaskInputs: [{
          input_item_id: 'seed-001',
          input_quantity: 20,
          inputItem: { item_name: 'Paddy Seed' },
        }],
      }],
    };

    const mockWorkbandExec = {
      id: 1,
      pop_workband_id: 1,
      workband_status: 'completed',
      workband_start_date: '2025-06-16',
      popWorkband: mockPopWorkband,
      taskExecutions: [{
        id: 201,
        pop_task_id: 101,
        task_status: 'completed',
        task_completion_percentage: 100,
        execution_photo_count: 2,
        popTask: mockPopWorkband.popTasks[0],
        taskExecutionInputLogs: [{
          input_item_id: 'seed-001',
          quantity_used: 21,
          input_cost: 500,
        }],
      }],
    };

    const mockSnapshot = {
      uuid: 'snap-uuid-001',
      update: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      db.CultivationCycle.findOne.mockResolvedValue(mockCycle);
      db.WorkbandExecution.findAll.mockResolvedValue([mockWorkbandExec]);
      db.PopCostBenchmark.findAll.mockResolvedValue([{ estimated_cost_per_hectare: 5000, is_active: true }]);
      db.Field.findByPk.mockResolvedValue({ field_size_hectares: 1.5 });
      db.SoilHealthRecord.findOne.mockResolvedValue(null);
      db.PopWorkband.findAll.mockResolvedValue([mockPopWorkband]);
      db.RootsComplianceSnapshot.findOrCreate.mockResolvedValue([mockSnapshot, true]);
    });

    it('should compute full cycle compliance and return snapshot', async () => {
      const result = await varianceService.computeCycleComplianceScore('cycle-uuid-001');

      expect(result).toBeDefined();
      expect(result.cycleId).toBe('cycle-uuid-001');
      expect(result.farmerId).toBe(42);
      expect(result.activityType).toBe('CROP');
      expect(result.overallComplianceScore).toBeGreaterThanOrEqual(0);
      expect(result.totalStages).toBe(1);
      expect(result.completedStages).toBe(1);
      expect(result.workbands).toHaveLength(1);
      expect(result.snapshotId).toBeDefined();
    });

    it('should persist snapshot via findOrCreate', async () => {
      await varianceService.computeCycleComplianceScore('cycle-uuid-001');

      expect(db.RootsComplianceSnapshot.findOrCreate).toHaveBeenCalledTimes(1);
      const callArgs = db.RootsComplianceSnapshot.findOrCreate.mock.calls[0][0];
      expect(callArgs.where.farmer_id).toBe(42);
      expect(callArgs.where.activity_type).toBe('CROP');
      expect(callArgs.defaults.uuid).toBe('test-uuid-1234');
    });

    it('should update existing snapshot when one already exists for today', async () => {
      db.RootsComplianceSnapshot.findOrCreate.mockResolvedValue([mockSnapshot, false]); // created = false

      await varianceService.computeCycleComplianceScore('cycle-uuid-001');

      expect(mockSnapshot.update).toHaveBeenCalledTimes(1);
    });

    it('should commit transaction on success', async () => {
      await varianceService.computeCycleComplianceScore('cycle-uuid-001');

      expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      db.CultivationCycle.findOne.mockResolvedValue(null); // cycle not found

      await expect(
        varianceService.computeCycleComplianceScore('nonexistent')
      ).rejects.toThrow('Cultivation cycle not found');

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should handle cycle with no workband executions (all missed)', async () => {
      db.WorkbandExecution.findAll.mockResolvedValue([]); // no executions

      const result = await varianceService.computeCycleComplianceScore('cycle-uuid-001');

      expect(result.completedStages).toBe(0);
      expect(result.dataCompletenessPct).toBe(0);
    });

    it('should apply soil adjustment when soil record exists', async () => {
      db.SoilHealthRecord.findOne.mockResolvedValue({
        nitrogen_kg_per_hectare: 200, // low N → +20%
        phosphorus_kg_per_hectare: 25,
        potassium_kg_per_hectare: 150,
        organic_carbon_percent: 0.8,
        ph: 6.5,
        zinc_ppm: 1.0,
      });

      const result = await varianceService.computeCycleComplianceScore('cycle-uuid-001');

      expect(result).toBeDefined();
      expect(db.SoilHealthRecord.findOne).toHaveBeenCalledTimes(1);
    });

    it('should set season from cycle_season and cycle_year', async () => {
      const result = await varianceService.computeCycleComplianceScore('cycle-uuid-001');

      expect(result.season).toBe('kharif_2025');
    });

    it('should accept numeric cycle id', async () => {
      db.CultivationCycle.findOne.mockResolvedValue(mockCycle);

      await varianceService.computeCycleComplianceScore(1);

      const callArgs = db.CultivationCycle.findOne.mock.calls[0][0];
      expect(callArgs.where.id).toBe(1);
    });
  });

  /* ════════════════════════════════════════════════════════════════
   * 7. applySoilAdjustment
   * ════════════════════════════════════════════════════════════════ */

  describe('applySoilAdjustment', () => {
    const baseSoil = {
      nitrogen_kg_per_hectare: 300,
      phosphorus_kg_per_hectare: 15,
      potassium_kg_per_hectare: 200,
      organic_carbon_percent: 0.8,
      ph: 6.5,
      zinc_ppm: 1.0,
    };

    const mkInput = (name, qty) => ({
      input_item_id: `${name}-001`,
      input_quantity: qty,
      inputItem: { item_name: name },
    });

    it('should not modify inputs when soil values are normal', () => {
      const inputs = [mkInput('Urea', 100), mkInput('SSP', 50)];
      const result = varianceService.applySoilAdjustment(inputs, baseSoil);

      result.forEach((r) => {
        expect(r._soil_adjusted).toBeUndefined();
        expect(r.input_quantity).toBe(inputs.find((i) => i.input_item_id === r.input_item_id).input_quantity);
      });
    });

    it('should increase nitrogen inputs when N is low (<250)', () => {
      const lowNSoil = { ...baseSoil, nitrogen_kg_per_hectare: 200 };
      const inputs = [mkInput('Urea', 100)];

      const result = varianceService.applySoilAdjustment(inputs, lowNSoil);

      expect(result[0]._soil_adjusted).toBe(true);
      expect(result[0].input_quantity).toBe(120); // +20%
      expect(result[0]._soil_multiplier).toBe(1.2);
    });

    it('should decrease nitrogen inputs when N is high (>500)', () => {
      const highNSoil = { ...baseSoil, nitrogen_kg_per_hectare: 600 };
      const inputs = [mkInput('Urea', 100)];

      const result = varianceService.applySoilAdjustment(inputs, highNSoil);

      expect(result[0]._soil_adjusted).toBe(true);
      expect(result[0].input_quantity).toBe(85); // -15%
    });

    it('should increase phosphatic inputs when P is low (<11)', () => {
      const lowPSoil = { ...baseSoil, phosphorus_kg_per_hectare: 8 };
      const inputs = [mkInput('SSP', 100)];

      const result = varianceService.applySoilAdjustment(inputs, lowPSoil);

      expect(result[0]._soil_adjusted).toBe(true);
      expect(result[0].input_quantity).toBe(125); // +25%
    });

    it('should decrease potassic inputs when K is high (>280)', () => {
      const highKSoil = { ...baseSoil, potassium_kg_per_hectare: 300 };
      const inputs = [mkInput('MOP', 100)];

      const result = varianceService.applySoilAdjustment(inputs, highKSoil);

      expect(result[0]._soil_adjusted).toBe(true);
      expect(result[0].input_quantity).toBe(85); // -15%
    });

    it('should increase FYM when organic carbon is low (<0.5%)', () => {
      const lowOCSoil = { ...baseSoil, organic_carbon_percent: 0.3 };
      const inputs = [mkInput('FYM', 1000)];

      const result = varianceService.applySoilAdjustment(inputs, lowOCSoil);

      expect(result[0]._soil_adjusted).toBe(true);
      expect(result[0].input_quantity).toBe(1300); // +30%
    });

    it('should boost lime in acidic soils (pH < 5.5)', () => {
      const acidSoil = { ...baseSoil, ph: 4.8 };
      const inputs = [mkInput('Lime', 200)];

      const result = varianceService.applySoilAdjustment(inputs, acidSoil);

      expect(result[0]._soil_adjusted).toBe(true);
      expect(result[0].input_quantity).toBe(240); // +20%
    });

    it('should boost gypsum in alkaline soils (pH > 8.5)', () => {
      const alkalineSoil = { ...baseSoil, ph: 9.0 };
      const inputs = [mkInput('Gypsum', 300)];

      const result = varianceService.applySoilAdjustment(inputs, alkalineSoil);

      expect(result[0]._soil_adjusted).toBe(true);
      expect(result[0].input_quantity).toBe(360); // +20%
    });

    it('should boost ZnSO4 when zinc is deficient (<0.6 ppm)', () => {
      const lowZnSoil = { ...baseSoil, zinc_ppm: 0.3 };
      const inputs = [mkInput('ZnSO4', 10)];

      const result = varianceService.applySoilAdjustment(inputs, lowZnSoil);

      expect(result[0]._soil_adjusted).toBe(true);
      expect(result[0].input_quantity).toBe(12.5); // +25%
    });

    it('should not modify non-matching inputs', () => {
      const lowNSoil = { ...baseSoil, nitrogen_kg_per_hectare: 200 };
      const inputs = [mkInput('Pesticide X', 5)];

      const result = varianceService.applySoilAdjustment(inputs, lowNSoil);

      expect(result[0]._soil_adjusted).toBeUndefined();
      expect(result[0].input_quantity).toBe(5);
    });

    it('should return original array when soilRecord is null', () => {
      const inputs = [mkInput('Urea', 100)];
      const result = varianceService.applySoilAdjustment(inputs, null);

      expect(result).toEqual(inputs);
    });

    it('should return empty array when inputs are empty', () => {
      const result = varianceService.applySoilAdjustment([], baseSoil);
      expect(result).toEqual([]);
    });

    it('should not mutate original input objects', () => {
      const lowNSoil = { ...baseSoil, nitrogen_kg_per_hectare: 200 };
      const inputs = [mkInput('Urea', 100)];
      const originalQty = inputs[0].input_quantity;

      varianceService.applySoilAdjustment(inputs, lowNSoil);

      expect(inputs[0].input_quantity).toBe(originalQty); // original unchanged
    });
  });
});
