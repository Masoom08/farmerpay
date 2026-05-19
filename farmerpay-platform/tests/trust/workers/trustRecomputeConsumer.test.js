/**
 * TRUST v2 Recompute Consumer — Unit Tests
 * Tests: success path, incomplete path, retry path, DLQ on permanent failure.
 */

// ─── Mocks ────────────────────────────────────────────────────────

const mockChannel = {
  ack: jest.fn(),
  nack: jest.fn(),
  publish: jest.fn(() => true),
  prefetch: jest.fn(),
  assertQueue: jest.fn(),
  bindQueue: jest.fn(),
  consume: jest.fn(async (queue, handler) => {
    mockChannel._handler = handler;
    return { consumerTag: 'tag-1' };
  }),
  cancel: jest.fn(),
  _handler: null,
};

jest.mock('../../../src/config/rabbitmq', () => ({
  getChannel: jest.fn(async () => mockChannel),
  closeRabbitMQ: jest.fn(async () => {}),
}));

jest.mock('../../../src/config', () => ({
  rabbitmq: { exchange: 'farmerpay_exchange', prefetch: 10 },
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn(() => 'uuid-worker-test'),
}));

// Mock trustService — the key dependency
const mockComputeSnapshot = jest.fn();
jest.mock('../../../src/modules/trust/services/trustService', () => ({
  computeSnapshot: mockComputeSnapshot,
}));

// Mock auditLogger
const mockLogEvent = jest.fn(async () => ({ id: 1 }));
jest.mock('../../../src/modules/trust/services/auditLogger', () => ({
  logEvent: mockLogEvent,
}));

// ─── Helpers ──────────────────────────────────────────────────────

const {
  handleMessage,
  handleRetry,
  QUEUE_NAME,
  DLQ_NAME,
  ROUTING_KEY,
  READY_ROUTING_KEY,
  INCOMPLETE_ROUTING_KEY,
  MAX_RETRIES,
  BACKOFF_DELAYS,
  start,
  publishRecomputeJob,
} = require('../../../src/modules/trust/workers/trustRecomputeConsumer');

const buildMsg = (payload, retryCount = 0) => ({
  content: Buffer.from(JSON.stringify(payload)),
  properties: {
    headers: retryCount > 0 ? { 'x-retry-count': retryCount } : {},
  },
});

const PAYLOAD = { farmerId: 42, reason: 'Test recompute', correlationId: 'corr-123' };

// ─── Tests ────────────────────────────────────────────────────────

describe('trustRecomputeConsumer', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Initialize the consumer so module-scoped `channel` is set
    await start();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ─── Success Path ───────────────────────────────────────────────

  describe('success path', () => {
    it('acks message and publishes trust.snapshot.ready', async () => {
      mockComputeSnapshot.mockResolvedValueOnce({
        snapshotUuid: 'snap-uuid-1',
        score: 720,
        decision: 'SANCTION',
      });

      const msg = buildMsg(PAYLOAD);
      await handleMessage(msg);

      // Should ack the message
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);

      // Should publish ready event
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'farmerpay_exchange',
        READY_ROUTING_KEY,
        expect.any(Buffer),
        { persistent: true },
      );

      // Verify published payload
      const publishedPayload = JSON.parse(mockChannel.publish.mock.calls[0][2].toString());
      expect(publishedPayload).toEqual({
        farmerId: 42,
        snapshotUuid: 'snap-uuid-1',
        score: 720,
        decision: 'SANCTION',
        correlationId: 'corr-123',
      });
    });
  });

  // ─── Incomplete Path ────────────────────────────────────────────

  describe('incomplete path (missing mandatory pillar)', () => {
    it('publishes trust.snapshot.incomplete and does NOT publish ready', async () => {
      mockComputeSnapshot.mockResolvedValueOnce({
        status: 'INCOMPLETE',
        missingPillars: ['P2', 'P4'],
      });

      const msg = buildMsg(PAYLOAD);
      await handleMessage(msg);

      // Should ack
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);

      // Should publish to incomplete routing key
      expect(mockChannel.publish).toHaveBeenCalledTimes(1);
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'farmerpay_exchange',
        INCOMPLETE_ROUTING_KEY,
        expect.any(Buffer),
        { persistent: true },
      );

      const payload = JSON.parse(mockChannel.publish.mock.calls[0][2].toString());
      expect(payload.missingPillars).toEqual(['P2', 'P4']);
      expect(payload.farmerId).toBe(42);

      // Should write audit event
      expect(mockLogEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          farmerId: 42,
          actorType: 'SYSTEM',
          action: 'SNAPSHOT_INCOMPLETE',
          payload: expect.objectContaining({ missingPillars: ['P2', 'P4'] }),
        }),
      );
    });
  });

  // ─── Retry Path ─────────────────────────────────────────────────

  describe('retry path', () => {
    it('republishes with incremented retry count on first failure', async () => {
      mockComputeSnapshot.mockRejectedValueOnce(new Error('DB timeout'));

      const msg = buildMsg(PAYLOAD, 0);
      await handleMessage(msg);

      // Acks original
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);

      // After backoff delay, should republish with retry count = 1
      jest.advanceTimersByTime(BACKOFF_DELAYS[0]);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'farmerpay_exchange',
        ROUTING_KEY,
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          headers: expect.objectContaining({ 'x-retry-count': 1 }),
        }),
      );
    });

    it('uses correct backoff delay for second retry', async () => {
      mockComputeSnapshot.mockRejectedValueOnce(new Error('DB timeout'));

      const msg = buildMsg(PAYLOAD, 1);
      await handleMessage(msg);

      expect(mockChannel.ack).toHaveBeenCalledWith(msg);

      // Should NOT have published yet (backoff hasn't elapsed)
      expect(mockChannel.publish).not.toHaveBeenCalled();

      // After 10s backoff
      jest.advanceTimersByTime(BACKOFF_DELAYS[1]);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'farmerpay_exchange',
        ROUTING_KEY,
        expect.any(Buffer),
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-retry-count': 2 }),
        }),
      );
    });
  });

  // ─── DLQ on Permanent Failure ───────────────────────────────────

  describe('DLQ on permanent failure', () => {
    it('nacks (no requeue) after max retries and writes audit event', async () => {
      mockComputeSnapshot.mockRejectedValueOnce(new Error('Permanent failure'));

      const msg = buildMsg(PAYLOAD, MAX_RETRIES); // Already at max retries
      await handleMessage(msg);

      // Should nack without requeue (→ DLQ via dead-letter policy)
      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);

      // Should NOT ack
      expect(mockChannel.ack).not.toHaveBeenCalled();

      // Should NOT republish
      jest.advanceTimersByTime(120000);
      expect(mockChannel.publish).not.toHaveBeenCalled();

      // Should write audit event
      expect(mockLogEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          farmerId: 42,
          actorType: 'SYSTEM',
          action: 'SNAPSHOT_RECOMPUTE_FAILED',
          payload: expect.objectContaining({
            error: 'Permanent failure',
            retries: MAX_RETRIES,
          }),
        }),
      );
    });
  });

  // ─── Invalid JSON ───────────────────────────────────────────────

  describe('invalid JSON', () => {
    it('nacks invalid JSON to DLQ', async () => {
      const msg = {
        content: Buffer.from('not-json'),
        properties: { headers: {} },
      };
      await handleMessage(msg);

      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });
  });

  // ─── Queue Setup ────────────────────────────────────────────────

  describe('start()', () => {
    it('declares queue, DLQ, and starts consuming', async () => {
      // beforeEach already called start(); verify the calls accumulated
      expect(mockChannel.prefetch).toHaveBeenCalledWith(4);
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(DLQ_NAME, { durable: true });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(QUEUE_NAME, expect.objectContaining({
        durable: true,
        arguments: expect.objectContaining({
          'x-dead-letter-exchange': 'farmerpay_exchange',
        }),
      }));
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(DLQ_NAME, 'farmerpay_exchange', `${ROUTING_KEY}.dlq`);
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(QUEUE_NAME, 'farmerpay_exchange', ROUTING_KEY);
      expect(mockChannel.consume).toHaveBeenCalledWith(QUEUE_NAME, expect.any(Function));
    });
  });

  // ─── publishRecomputeJob ────────────────────────────────────────

  describe('publishRecomputeJob()', () => {
    it('publishes a message with farmerId, reason, correlationId', async () => {
      const corrId = await publishRecomputeJob({ farmerId: 10, reason: 'CIBIL update' });

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'farmerpay_exchange',
        ROUTING_KEY,
        expect.any(Buffer),
        { persistent: true },
      );

      const published = JSON.parse(mockChannel.publish.mock.calls[0][2].toString());
      expect(published.farmerId).toBe(10);
      expect(published.reason).toBe('CIBIL update');
      expect(published.correlationId).toBeDefined();
    });
  });
});
