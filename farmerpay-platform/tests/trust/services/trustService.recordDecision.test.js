/**
 * trustService.recordDecision — tests.
 * Duplicate → 409, SANCTION → domain event, audit row.
 */

jest.mock('../../../src/config/redis', () => ({
  setWithTTL: jest.fn().mockResolvedValue('OK'),
  getKey: jest.fn().mockResolvedValue(null),
  deleteKeys: jest.fn().mockResolvedValue(0),
  getRedisClient: jest.fn(() => ({
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
  })),
}));

const mockPublish = jest.fn();

jest.mock('../../../src/config/rabbitmq', () => ({
  getChannel: jest.fn().mockResolvedValue({ publish: mockPublish }),
}));

jest.mock('../../../src/config', () => ({
  rabbitmq: { exchange: 'fp.exchange' },
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../../../src/shared/models', () => ({
  TrustScoreHistory: {
    findOne: jest.fn().mockResolvedValue({
      id: 99, score_history_uuid: 'snap-1', farmer_id: 42, is_active: true, calculated_at: new Date(),
    }),
  },
  TrustDecision: {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, created_at: new Date() })),
  },
  TrustAuditEvent: {
    create: jest.fn().mockResolvedValue({ id: 1 }),
  },
}));

const { recordDecision } = require('../../../src/modules/trust/services/trustService');

beforeEach(() => {
  jest.clearAllMocks();
  const db = require('../../../src/shared/models');
  db.TrustScoreHistory.findOne.mockResolvedValue({
    id: 99, score_history_uuid: 'snap-1', farmer_id: 42, is_active: true, calculated_at: new Date(),
  });
  db.TrustDecision.findOne.mockResolvedValue(null);
  // Re-wire getChannel to return fresh mock
  const rmq = require('../../../src/config/rabbitmq');
  rmq.getChannel.mockResolvedValue({ publish: mockPublish });
});

describe('recordDecision', () => {
  test('records a SANCTION decision', async () => {
    const result = await recordDecision({
      snapshotUuid: 'snap-1', bankerId: 10, decision: 'SANCTION',
    });
    expect(result.decision).toBe('SANCTION');
    expect(result.snapshotUuid).toBe('snap-1');
  });

  test('duplicate submit returns 409', async () => {
    const db = require('../../../src/shared/models');
    db.TrustDecision.findOne.mockResolvedValueOnce({ id: 1 }); // duplicate
    await expect(recordDecision({
      snapshotUuid: 'snap-1', bankerId: 10, decision: 'SANCTION',
    })).rejects.toMatchObject({ statusCode: 409 });
  });

  test('SANCTION emits trust.decision.sanction domain event', async () => {
    await recordDecision({
      snapshotUuid: 'snap-1', bankerId: 10, decision: 'SANCTION',
    });
    expect(mockPublish).toHaveBeenCalledWith(
      'fp.exchange',
      'trust.decision.sanction',
      expect.any(Buffer),
    );
  });

  test('REJECT does NOT emit domain event', async () => {
    await recordDecision({
      snapshotUuid: 'snap-1', bankerId: 10, decision: 'REJECT',
      reasonCode: 'BELOW_THRESHOLD',
      reasonText: 'Score below threshold, farmer needs additional documentation for review.',
    });
    expect(mockPublish).not.toHaveBeenCalled();
  });

  test('audit row written with DECISION_RECORDED', async () => {
    const db = require('../../../src/shared/models');
    await recordDecision({
      snapshotUuid: 'snap-1', bankerId: 10, decision: 'RECONSIDER',
    });
    expect(db.TrustAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DECISION_RECORDED',
        actor_type: 'BANKER',
        actor_id: 10,
      }),
      expect.anything(),
    );
  });

  test('returns 404 for non-existent snapshot', async () => {
    const db = require('../../../src/shared/models');
    db.TrustScoreHistory.findOne.mockResolvedValueOnce(null);
    await expect(recordDecision({
      snapshotUuid: 'bad-uuid', bankerId: 10, decision: 'SANCTION',
    })).rejects.toMatchObject({ statusCode: 404 });
  });
});
