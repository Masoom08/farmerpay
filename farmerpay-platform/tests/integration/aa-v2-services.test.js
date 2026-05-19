/**
 * AA V2 Services — Unit Tests
 * Tests aaWebhookVerifier, aaAuditLogger, and aaRateLimiter with mocked dependencies.
 */

const crypto = require('crypto');

// ─── Mock Redis ────────────────────────────────────────────────────

const mockRedisStore = {};
const mockRedisClient = {
  setex: jest.fn(async (key, ttl, value) => { mockRedisStore[key] = value; return 'OK'; }),
  get: jest.fn(async (key) => mockRedisStore[key] || null),
  ttl: jest.fn(async (key) => (key in mockRedisStore ? 3600 : -2)),
  incr: jest.fn(async (key) => {
    mockRedisStore[key] = (parseInt(mockRedisStore[key] || '0', 10) + 1).toString();
    return parseInt(mockRedisStore[key], 10);
  }),
  expire: jest.fn(async () => 1),
  del: jest.fn(async (...keys) => { keys.forEach(k => delete mockRedisStore[k]); return keys.length; }),
};

jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => mockRedisClient),
  setWithTTL: jest.fn(async (key, value, ttl) => {
    mockRedisStore[key] = typeof value === 'object' ? JSON.stringify(value) : value;
    return 'OK';
  }),
  getKey: jest.fn(async (key) => {
    const val = mockRedisStore[key];
    if (!val) return null;
    try { return JSON.parse(val); } catch { return val; }
  }),
  deleteKeys: jest.fn(async (...keys) => { keys.forEach(k => delete mockRedisStore[k]); }),
}));

// ─── Mock shared/models ────────────────────────────────────────────

const mockCreate = jest.fn(async (data) => ({ id: 1, ...data }));

jest.mock('../../src/shared/models', () => ({
  AaConsentAuditLog: { create: mockCreate },
  sequelize: { authenticate: jest.fn(), close: jest.fn() },
}));

// ─── Mock integrations ─────────────────────────────────────────────

jest.mock('../../src/integrations/accountAggregator', () => ({
  aaConfig: { enabled: true, activeProvider: 'setu' },
  getProvider: jest.fn(),
  listProviders: jest.fn(() => []),
}));

// ─── Mock logger ───────────────────────────────────────────────────

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// ─── Load Services Under Test ──────────────────────────────────────

const { verifyWebhook } = require('../../src/modules/aa/services/aaWebhookVerifier');
const { logEvent } = require('../../src/modules/aa/services/aaAuditLogger');
const { canFetch, recordFetch } = require('../../src/modules/aa/services/aaRateLimiter');
const { aaConfig } = require('../../src/integrations/accountAggregator');

// ─── Reset state between tests ────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockRedisStore).forEach(k => delete mockRedisStore[k]);
});

// ═══════════════════════════════════════════════════════════════════
// aaWebhookVerifier
// ═══════════════════════════════════════════════════════════════════

describe('aaWebhookVerifier', () => {
  const SETU_SECRET = 'test-setu-secret-key';
  const body = { eventId: 'evt-001', consentHandle: 'ch-123', status: 'APPROVED' };

  const makeSignature = (secret, payload) =>
    crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

  beforeEach(() => {
    process.env.AA_SETU_WEBHOOK_SECRET = SETU_SECRET;
    process.env.AA_FINVU_WEBHOOK_SECRET = 'test-finvu-secret';
  });

  afterEach(() => {
    delete process.env.AA_SETU_WEBHOOK_SECRET;
    delete process.env.AA_FINVU_WEBHOOK_SECRET;
  });

  it('should accept valid HMAC signature for setu', async () => {
    const sig = makeSignature(SETU_SECRET, body);
    const result = await verifyWebhook('setu', { 'x-setu-signature': sig }, body);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid HMAC signature', async () => {
    const result = await verifyWebhook('setu', { 'x-setu-signature': 'bad-sig' }, body);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('hmac_mismatch');
  });

  it('should reject missing signature header', async () => {
    const result = await verifyWebhook('setu', {}, body);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/missing_header/);
  });

  it('should reject unsupported provider', async () => {
    const result = await verifyWebhook('unknown_provider', {}, body);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/unsupported_provider/);
  });

  it('should skip HMAC when AA_ENABLED is false (dev mode)', async () => {
    aaConfig.enabled = false;
    const result = await verifyWebhook('setu', {}, body);
    expect(result.valid).toBe(true);
    aaConfig.enabled = true;
  });

  it('should detect duplicate events via Redis dedup', async () => {
    const sig = makeSignature(SETU_SECRET, body);
    const headers = { 'x-setu-signature': sig };

    const first = await verifyWebhook('setu', headers, body);
    expect(first.valid).toBe(true);

    const second = await verifyWebhook('setu', headers, body);
    expect(second.valid).toBe(false);
    expect(second.reason).toBe('duplicate_event');
  });

  it('should reject when webhook secret env var is missing', async () => {
    delete process.env.AA_SETU_WEBHOOK_SECRET;
    const result = await verifyWebhook('setu', { 'x-setu-signature': 'any' }, body);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_webhook_secret');
  });
});

// ═══════════════════════════════════════════════════════════════════
// aaAuditLogger
// ═══════════════════════════════════════════════════════════════════

describe('aaAuditLogger', () => {
  it('should create an audit log entry', async () => {
    await logEvent({
      consentId: 1,
      farmerId: 42,
      eventType: 'consent_requested',
      eventSource: 'farmer',
      provider: 'setu',
      metadata: { purposeText: 'credit assessment' },
      ipAddress: '192.168.1.1',
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      consent_id: 1,
      farmer_id: 42,
      event_type: 'consent_requested',
      event_source: 'farmer',
      provider: 'setu',
      metadata: { purposeText: 'credit assessment' },
      ip_address: '192.168.1.1',
    });
  });

  it('should handle null optional fields', async () => {
    await logEvent({
      consentId: 1, farmerId: 42,
      eventType: 'consent_approved', eventSource: 'webhook',
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      provider: null,
      metadata: null,
      ip_address: null,
    }));
  });

  it('should never throw — fire and forget', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB down'));

    // Should not throw
    await expect(logEvent({
      consentId: 1, farmerId: 42,
      eventType: 'data_fetched', eventSource: 'system',
    })).resolves.toBeUndefined();

    const logger = require('../../src/shared/utils/logger');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to log event'),
      expect.any(Object),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// aaRateLimiter
// ═══════════════════════════════════════════════════════════════════

describe('aaRateLimiter', () => {
  describe('canFetch', () => {
    it('should allow fetch when no cooldown and under daily limit', async () => {
      mockRedisClient.ttl.mockResolvedValueOnce(-2); // No cooldown key
      mockRedisClient.get.mockResolvedValueOnce(null); // No daily count

      const result = await canFetch(42);
      expect(result.allowed).toBe(true);
    });

    it('should deny fetch when cooldown is active', async () => {
      mockRedisClient.ttl.mockResolvedValueOnce(1800); // 30 min remaining

      const result = await canFetch(42);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('cooldown_active');
      expect(result.retryAfterSeconds).toBe(1800);
    });

    it('should deny fetch when daily limit exceeded', async () => {
      mockRedisClient.ttl.mockResolvedValueOnce(-2); // No cooldown
      mockRedisClient.get.mockResolvedValueOnce('5'); // At daily limit

      const result = await canFetch(42);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('daily_limit_exceeded');
    });

    it('should allow fetch when under daily limit', async () => {
      mockRedisClient.ttl.mockResolvedValueOnce(-2);
      mockRedisClient.get.mockResolvedValueOnce('3'); // 3 of 5 used

      const result = await canFetch(42);
      expect(result.allowed).toBe(true);
    });
  });

  describe('recordFetch', () => {
    it('should set cooldown and increment daily counter', async () => {
      mockRedisClient.incr.mockResolvedValueOnce(1);

      await recordFetch(42);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining('cooldown:42'),
        3600,
        '1',
      );
      expect(mockRedisClient.incr).toHaveBeenCalledWith(
        expect.stringContaining('daily:42:'),
      );
    });

    it('should set expiry on first daily increment', async () => {
      mockRedisClient.incr.mockResolvedValueOnce(1);

      await recordFetch(42);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        expect.stringContaining('daily:42:'),
        86400,
      );
    });

    it('should not set expiry on the farmer-daily counter after the first increment', async () => {
      // Farmer-daily counter is on its third increment, so its expiry
      // was set earlier. The new provider-level counter (AA-H8) is a
      // separate key — its own first-increment may fire an expire, so
      // the assertion is narrowed to the farmer-daily key.
      mockRedisClient.incr.mockResolvedValueOnce(3);

      await recordFetch(42);

      expect(mockRedisClient.expire).not.toHaveBeenCalledWith(
        expect.stringContaining('daily:42:'),
        86400,
      );
    });
  });
});
