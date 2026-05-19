/**
 * Unit Tests — ROOTS Compliance Event Emitter
 *
 * Tests all 4 emit methods, exchange assertion, and error resilience.
 */

const mockChannel = {
  publish: jest.fn(),
  assertExchange: jest.fn().mockResolvedValue(true),
};

jest.mock('../../src/config/rabbitmq', () => ({
  getChannel: jest.fn().mockResolvedValue(mockChannel),
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn(),
}));

jest.mock('../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn().mockReturnValue('corr-id-001'),
}));

const emitter = require('../../src/modules/roots/crop/services/complianceEventEmitter');
const { getChannel } = require('../../src/config/rabbitmq');

describe('complianceEventEmitter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChannel.publish.mockClear();
    mockChannel.assertExchange.mockClear();
  });

  describe('emitComplianceUpdate', () => {
    it('should publish compliance.updated event with correct payload', async () => {
      const snapshot = {
        overallComplianceScore: 85.5,
        timingComplianceScore: 90,
        quantityComplianceScore: 80,
        costComplianceScore: 75,
        practiceComplianceScore: 95,
        dataCompletenessPct: 88,
        snapshotDate: '2026-04-16',
        season: 'kharif_2026',
      };

      const result = await emitter.emitComplianceUpdate(42, 'CROP', 1, snapshot);

      expect(result).toBe(true);
      expect(mockChannel.publish).toHaveBeenCalledTimes(1);

      const [exchange, routingKey, buffer, options] = mockChannel.publish.mock.calls[0];
      expect(exchange).toBe('roots_events');
      expect(routingKey).toBe('compliance.updated');
      expect(options.persistent).toBe(true);
      expect(options.contentType).toBe('application/json');
      expect(options.correlationId).toBe('corr-id-001');

      const payload = JSON.parse(buffer.toString());
      expect(payload.farmerId).toBe(42);
      expect(payload.activityType).toBe('CROP');
      expect(payload.overallScore).toBe(85.5);
      expect(payload.timingScore).toBe(90);
      expect(payload.quantityScore).toBe(80);
      expect(payload.costScore).toBe(75);
      expect(payload.practiceScore).toBe(95);
      expect(payload.dataCompleteness).toBe(88);
      expect(payload.snapshotDate).toBe('2026-04-16');
      expect(payload.season).toBe('kharif_2026');
      expect(payload.emittedAt).toBeDefined();
    });

    it('should handle snake_case snapshot fields', async () => {
      const snapshot = {
        overall_compliance_score: 70,
        timing_compliance_score: 60,
        quantity_compliance_score: 80,
        cost_compliance_score: 50,
        practice_compliance_score: 90,
        data_completeness_pct: 75,
        snapshot_date: '2026-04-16',
        season: 'rabi_2026',
      };

      await emitter.emitComplianceUpdate(42, 'DAIRY', 5, snapshot);

      const payload = JSON.parse(mockChannel.publish.mock.calls[0][2].toString());
      expect(payload.overallScore).toBe(70);
      expect(payload.timingScore).toBe(60);
      expect(payload.dataCompleteness).toBe(75);
    });
  });

  describe('emitRedFlagCreated', () => {
    it('should publish redflag.created event', async () => {
      const flag = {
        uuid: 'flag-uuid-001',
        farmer_id: 42,
        flag_type: 'COST_ANOMALY',
        severity: 'HIGH',
        activity_type: 'CROP',
        description: 'Cost anomaly detected',
        loan_application_id: 10,
      };

      const result = await emitter.emitRedFlagCreated(flag);

      expect(result).toBe(true);
      const [exchange, routingKey] = mockChannel.publish.mock.calls[0];
      expect(exchange).toBe('roots_events');
      expect(routingKey).toBe('redflag.created');

      const payload = JSON.parse(mockChannel.publish.mock.calls[0][2].toString());
      expect(payload.flagId).toBe('flag-uuid-001');
      expect(payload.farmerId).toBe(42);
      expect(payload.flagType).toBe('COST_ANOMALY');
      expect(payload.severity).toBe('HIGH');
      expect(payload.loanApplicationId).toBe(10);
    });

    it('should handle null loan_application_id', async () => {
      const flag = {
        uuid: 'flag-uuid-002',
        farmer_id: 42,
        flag_type: 'NO_DATA_ENTRY',
        severity: 'CRITICAL',
        activity_type: 'CROP',
        description: 'No data entry for 50 days',
        loan_application_id: null,
      };

      await emitter.emitRedFlagCreated(flag);

      const payload = JSON.parse(mockChannel.publish.mock.calls[0][2].toString());
      expect(payload.loanApplicationId).toBeNull();
    });
  });

  describe('emitStageCompleted', () => {
    it('should publish stage.completed event', async () => {
      const result = await emitter.emitStageCompleted(42, 'cycle-uuid-001', 'Sowing', 95);

      expect(result).toBe(true);
      const [exchange, routingKey] = mockChannel.publish.mock.calls[0];
      expect(exchange).toBe('roots_events');
      expect(routingKey).toBe('stage.completed');

      const payload = JSON.parse(mockChannel.publish.mock.calls[0][2].toString());
      expect(payload.farmerId).toBe(42);
      expect(payload.cycleId).toBe('cycle-uuid-001');
      expect(payload.workbandName).toBe('Sowing');
      expect(payload.stageScore).toBe(95);
      expect(payload.completedAt).toBeDefined();
    });
  });

  describe('emitStageMissed', () => {
    it('should publish stage.missed event', async () => {
      const result = await emitter.emitStageMissed(42, 'cycle-uuid-001', 'Harvest', 90);

      expect(result).toBe(true);
      const [exchange, routingKey] = mockChannel.publish.mock.calls[0];
      expect(exchange).toBe('roots_events');
      expect(routingKey).toBe('stage.missed');

      const payload = JSON.parse(mockChannel.publish.mock.calls[0][2].toString());
      expect(payload.farmerId).toBe(42);
      expect(payload.cycleId).toBe('cycle-uuid-001');
      expect(payload.workbandName).toBe('Harvest');
      expect(payload.windowEnd).toBe(90);
      expect(payload.missedAt).toBeDefined();
    });

    it('should handle null windowEnd', async () => {
      await emitter.emitStageMissed(42, 'c-001', 'Weeding', null);

      const payload = JSON.parse(mockChannel.publish.mock.calls[0][2].toString());
      expect(payload.windowEnd).toBeNull();
    });
  });

  describe('exchange name', () => {
    it('should use roots_events exchange for all events', async () => {
      await emitter.emitStageCompleted(1, 'c-001', 'Test', 100);

      const [exchange] = mockChannel.publish.mock.calls[0];
      expect(exchange).toBe('roots_events');
    });
  });

  describe('error resilience', () => {
    it('should return false when no channel available', async () => {
      getChannel.mockResolvedValueOnce(null);

      const result = await emitter.emitStageCompleted(1, 'c-001', 'Test', 100);

      expect(result).toBe(false);
    });

    it('should return false when publish throws', async () => {
      mockChannel.publish.mockImplementationOnce(() => { throw new Error('Channel closed'); });

      const result = await emitter.emitStageCompleted(1, 'c-001', 'Test', 100);

      expect(result).toBe(false);
    });

    it('should not throw when channel.publish fails', async () => {
      mockChannel.publish.mockImplementationOnce(() => { throw new Error('Connection lost'); });

      await expect(
        emitter.emitComplianceUpdate(1, 'CROP', 1, { overallComplianceScore: 50 })
      ).resolves.toBe(false);
    });
  });

  describe('EXCHANGE constant', () => {
    it('should export the exchange name', () => {
      expect(emitter.EXCHANGE).toBe('roots_events');
    });
  });
});
