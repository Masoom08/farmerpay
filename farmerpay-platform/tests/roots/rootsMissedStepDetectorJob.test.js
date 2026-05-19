/**
 * Unit Tests — ROOTS Missed Step Detector Cron Job
 */

const mockChannel = { publish: jest.fn() };

jest.mock('../../src/shared/models', () => ({
  sequelize: { transaction: jest.fn() },
  Sequelize: { Op: require('sequelize').Op },
  CultivationCycle: { findAll: jest.fn() },
  PopWorkband: { findAll: jest.fn() },
  WorkbandExecution: { findAll: jest.fn() },
  SageAdvisory: { create: jest.fn() },
  SathiTask: { create: jest.fn() },
  ChoiceAssignment: { findOne: jest.fn() },
  RootsRedFlag: { findOne: jest.fn(), create: jest.fn() },
  RootsComplianceSnapshot: { findOrCreate: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn().mockReturnValue('test-uuid'),
}));

jest.mock('../../src/config/rabbitmq', () => ({
  getChannel: jest.fn().mockResolvedValue(mockChannel),
}));

jest.mock('../../src/config', () => ({
  rabbitmq: { exchange: 'farmerpay_exchange' },
}));

jest.mock('../../src/modules/roots/crop/services/redFlagService', () => ({
  detectCriticalStageMissed: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/modules/roots/crop/services/varianceService', () => ({
  computeCycleComplianceScore: jest.fn().mockResolvedValue({ overallComplianceScore: 50 }),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

const db = require('../../src/shared/models');
const redFlagService = require('../../src/modules/roots/crop/services/redFlagService');
const varianceService = require('../../src/modules/roots/crop/services/varianceService');
const { runDetection, start, stop } = require('../../src/jobs/rootsMissedStepDetectorJob');

describe('rootsMissedStepDetectorJob', () => {
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

  beforeEach(() => {
    jest.clearAllMocks();
    mockChannel.publish.mockClear();
    // Defaults
    db.SageAdvisory.create.mockResolvedValue({ id: 1 });
    db.SathiTask.create.mockResolvedValue({ id: 1 });
    db.ChoiceAssignment.findOne.mockResolvedValue(null);
  });

  describe('runDetection', () => {
    it('should detect a missed step and return correct metrics', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [{
          id: 1, cycle_uuid: 'c-001', farmer_id: 42,
          cycle_sowing_date: daysAgo(100), pop_id: 'pop-001',
        }];
        return [];
      });
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Sowing', workband_order: 1, days_from_sowing_start: 0, days_from_sowing_end: 5 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([]);

      const metrics = await runDetection();

      expect(metrics.cyclesChecked).toBe(1);
      expect(metrics.missedStepsFound).toBe(1);
      expect(metrics.advisoriesGenerated).toBe(1);
      expect(metrics.errors).toBe(0);
    });

    it('should skip stages with completed executions', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [{
          id: 1, cycle_uuid: 'c-001', farmer_id: 42,
          cycle_sowing_date: daysAgo(100), pop_id: 'pop-001',
        }];
        return [];
      });
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Sowing', workband_order: 1, days_from_sowing_start: 0, days_from_sowing_end: 5 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([
        { pop_workband_id: 1, workband_status: 'completed' },
      ]);

      const metrics = await runDetection();

      expect(metrics.missedStepsFound).toBe(0);
    });

    it('should skip stages still within grace period', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [{
          id: 1, cycle_uuid: 'c-001', farmer_id: 42,
          cycle_sowing_date: daysAgo(10), pop_id: 'pop-001',
        }];
        return [];
      });
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Sowing', workband_order: 1, days_from_sowing_start: 0, days_from_sowing_end: 5 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([]);

      const metrics = await runDetection();
      expect(metrics.missedStepsFound).toBe(0);
    });

    it('should handle per-cycle errors gracefully', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [
          { id: 1, cycle_uuid: 'c-err', farmer_id: 42, cycle_sowing_date: daysAgo(100), pop_id: 'pop-001' },
          { id: 2, cycle_uuid: 'c-ok', farmer_id: 43, cycle_sowing_date: daysAgo(100), pop_id: 'pop-001' },
        ];
        return [];
      });

      let callCount = 0;
      db.PopWorkband.findAll.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) throw new Error('DB error');
        return [{ id: 1, workband_name: 'Sowing', workband_order: 1, days_from_sowing_start: 0, days_from_sowing_end: 5 }];
      });
      db.WorkbandExecution.findAll.mockResolvedValue([]);

      const metrics = await runDetection();

      expect(metrics.errors).toBe(1);
      expect(metrics.cyclesChecked).toBe(1);
      expect(metrics.missedStepsFound).toBe(1);
    });

    it('should create Sathi task when agent is assigned', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [{
          id: 1, cycle_uuid: 'c-001', farmer_id: 42,
          cycle_sowing_date: daysAgo(100), pop_id: 'pop-001',
        }];
        return [];
      });
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Sowing', workband_order: 1, days_from_sowing_start: 0, days_from_sowing_end: 5 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([]);
      db.ChoiceAssignment.findOne.mockResolvedValue({ intermediary_id: 99 });

      await runDetection();

      expect(db.SathiTask.create).toHaveBeenCalledTimes(1);
      expect(db.SathiTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assigned_to_agent_id: 99,
          farmer_id: 42,
          task_type: 'field_visit',
          task_priority: 'high',
          task_status: 'assigned',
        })
      );
    });

    it('should send push notification for missed steps', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [{
          id: 1, cycle_uuid: 'c-001', farmer_id: 42,
          cycle_sowing_date: daysAgo(100), pop_id: 'pop-001',
        }];
        return [];
      });
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Sowing', workband_order: 1, days_from_sowing_start: 0, days_from_sowing_end: 5 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([]);

      await runDetection();

      // Find the push notification call (routing key 'notification.push.farmer')
      const pushCall = mockChannel.publish.mock.calls.find(
        (call) => call[1] === 'notification.push.farmer'
      );
      expect(pushCall).toBeDefined();

      const payload = JSON.parse(pushCall[2].toString());
      expect(payload.farmerId).toBe(42);
      expect(payload.data.screen).toBe('cycle-detail');
      expect(payload.data.cycleId).toBe('c-001');
    });

    it('should call redFlagService and varianceService', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [{
          id: 1, cycle_uuid: 'c-001', farmer_id: 42,
          cycle_sowing_date: daysAgo(100), pop_id: 'pop-001',
        }];
        return [];
      });
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Sowing', workband_order: 1, days_from_sowing_start: 0, days_from_sowing_end: 5 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([]);

      await runDetection();

      expect(redFlagService.detectCriticalStageMissed).toHaveBeenCalledWith(1);
      expect(varianceService.computeCycleComplianceScore).toHaveBeenCalledWith(1);
    });

    it('should process only one missed step per cycle', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [{
          id: 1, cycle_uuid: 'c-001', farmer_id: 42,
          cycle_sowing_date: daysAgo(100), pop_id: 'pop-001',
        }];
        return [];
      });
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Sowing', workband_order: 1, days_from_sowing_start: 0, days_from_sowing_end: 5 },
        { id: 2, workband_name: 'Harvest', workband_order: 8, days_from_sowing_start: 80, days_from_sowing_end: 90 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([]);

      const metrics = await runDetection();

      expect(metrics.missedStepsFound).toBe(1); // breaks after first
      expect(db.SageAdvisory.create).toHaveBeenCalledTimes(1);
    });

    it('should handle empty database', async () => {
      db.CultivationCycle.findAll.mockResolvedValue([]);

      const metrics = await runDetection();

      expect(metrics.cyclesChecked).toBe(0);
      expect(metrics.missedStepsFound).toBe(0);
    });

    it('should generate correct SAGE advisory content', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [{
          id: 1, cycle_uuid: 'c-001', farmer_id: 42,
          cycle_sowing_date: daysAgo(100), pop_id: 'pop-001',
        }];
        return [];
      });
      db.PopWorkband.findAll.mockResolvedValue([
        { id: 1, workband_name: 'Sowing', workband_order: 1, days_from_sowing_start: 0, days_from_sowing_end: 5 },
      ]);
      db.WorkbandExecution.findAll.mockResolvedValue([]);

      await runDetection();

      const advisory = db.SageAdvisory.create.mock.calls[0][0];
      expect(advisory.farmer_id).toBe(42);
      expect(advisory.advisory_urgency).toBe('high');
      expect(advisory.advisory_content).toContain('Sowing');
      expect(advisory.source).toBe('roots_missed_step_detector');
      expect(advisory.advisory_metadata.cycle_uuid).toBe('c-001');
    });

    it('should skip cycles without sowing date', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [{
          id: 1, cycle_uuid: 'c-001', farmer_id: 42,
          cycle_sowing_date: null, pop_id: 'pop-001',
        }];
        return [];
      });

      const metrics = await runDetection();
      expect(metrics.missedStepsFound).toBe(0);
    });

    it('should skip cycles without pop_id', async () => {
      db.CultivationCycle.findAll.mockImplementation(async ({ offset }) => {
        if (offset === 0) return [{
          id: 1, cycle_uuid: 'c-001', farmer_id: 42,
          cycle_sowing_date: daysAgo(100), pop_id: null,
        }];
        return [];
      });

      const metrics = await runDetection();
      expect(metrics.missedStepsFound).toBe(0);
    });
  });

  describe('start / stop lifecycle', () => {
    it('should return null when env flag is not set', () => {
      delete process.env.ROOTS_MISSED_STEP_CRON_ENABLED;
      stop();
      const result = start();
      expect(result).toBeNull();
    });

    it('should schedule cron when enabled', () => {
      process.env.ROOTS_MISSED_STEP_CRON_ENABLED = 'true';
      stop();
      const cronLib = require('node-cron');

      const result = start();
      expect(cronLib.schedule).toHaveBeenCalledWith('30 0 * * *', expect.any(Function));
      expect(result).not.toBeNull();

      stop();
      delete process.env.ROOTS_MISSED_STEP_CRON_ENABLED;
    });

    it('stop should not throw when no task running', () => {
      expect(() => stop()).not.toThrow();
    });
  });
});
