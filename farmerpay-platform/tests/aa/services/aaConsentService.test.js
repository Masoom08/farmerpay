/**
 * AA Consent Service — Unit Tests (~15 tests)
 * Tests consent lifecycle: initiate, webhook, revoke, status check.
 */

// ─── Mock Redis ────────────────────────────────────────────────────

const mockRedisStore = {};

jest.mock('../../../src/config/redis', () => ({
  setWithTTL: jest.fn(async (key, value) => { mockRedisStore[key] = value; }),
  getKey: jest.fn(async (key) => mockRedisStore[key] || null),
  deleteKeys: jest.fn(async () => {}),
  getRedisClient: jest.fn(() => ({})),
}));

// ─── Mock RabbitMQ ─────────────────────────────────────────────────

jest.mock('../../../src/config/rabbitmq', () => ({
  publishToQueue: jest.fn(async () => {}),
}));

// ─── Mock AA Provider Client ───────────────────────────────────────

const mockClient = {
  createConsent: jest.fn(async () => ({
    consentHandle: 'setu-handle-123',
    redirectUrl: 'https://setu.co/redirect?id=123',
    status: 'PENDING',
  })),
  getConsentStatus: jest.fn(async () => ({ status: 'APPROVED' })),
  revokeConsent: jest.fn(async () => ({ status: 'REVOKED' })),
  parseWebhook: jest.fn((payload) => ({
    eventType: payload.type || 'CONSENT_STATUS_UPDATE',
    consentHandle: payload.consentHandle || 'setu-handle-123',
    status: payload.status || 'APPROVED',
    providerConsentId: payload.consentId || 'provider-123',
  })),
};

jest.mock('../../../src/integrations/accountAggregator', () => ({
  getProvider: jest.fn(() => mockClient),
  listProviders: jest.fn(() => ['setu', 'finvu']),
  aaConfig: {
    enabled: false,
    activeProvider: 'setu',
    setu: { redirectUrl: 'https://setu.co/redirect' },
    dataWindow: { defaultMonths: 12, maxMonths: 24 },
    cache: { consentTTL: 86400 },
  },
}));

// ─── Mock Models ───────────────────────────────────────────────────

const mockConsent = {
  id: 1,
  consent_uuid: 'test-uuid-001',
  farmer_id: 42,
  aa_provider: 'setu',
  consent_status: 'approved',
  consent_purpose: 'Agricultural credit assessment',
  data_from: '2024-01-01',
  data_to: '2025-01-01',
  consent_handle: null,
  redirect_url: null,
  fetch_count: 0,
  is_active: true,
  update: jest.fn(async function (fields) {
    Object.assign(this, fields);
  }),
};

jest.mock('../../../src/shared/models', () => {
  const consentFindOneMock = jest.fn();
  return {
    AaConsent: {
      findOne: consentFindOneMock,
      findByPk: jest.fn(async () => ({ ...mockConsent, update: jest.fn() })),
      create: jest.fn(async (data) => ({
        id: 1,
        ...data,
        update: jest.fn(async function (fields) { Object.assign(this, fields); }),
      })),
    },
    // AA-H7: revokeConsent now hard-deletes derived rows inline to meet
    // RBI purge-on-revoke semantics. Tests need these destroy stubs.
    AaTransaction: { destroy: jest.fn(async () => 0) },
    AaFinancialAnalysis: { destroy: jest.fn(async () => 0) },
    AaBankStatementSummary: { destroy: jest.fn(async () => 0) },
    AaConsentAuditLog: { create: jest.fn(async (d) => ({ id: 1, ...d })) },
    User: { findByPk: jest.fn(async () => ({ id: 42, phone: '9876543210' })) },
    sequelize: {
      transaction: jest.fn(async () => ({
        commit: jest.fn(),
        rollback: jest.fn(),
      })),
    },
  };
});

// ─── Mock Logger ───────────────────────────────────────────────────

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn(() => 'test-uuid-001'),
}));

// ─── Load Service ──────────────────────────────────────────────────

const consentService = require('../../../src/modules/aa/services/aaConsentService');
const db = require('../../../src/shared/models');
const { publishToQueue } = require('../../../src/config/rabbitmq');
const { setWithTTL, getKey, deleteKeys } = require('../../../src/config/redis');

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockRedisStore).forEach(k => delete mockRedisStore[k]);
});

// ═══════════════════════════════════════════════════════════════════

describe('aaConsentService', () => {
  // ─── initiateConsent ────────────────────────────────────────

  describe('initiateConsent', () => {
    it('should create consent record and return redirect URL', async () => {
      db.AaConsent.findOne.mockResolvedValueOnce(null); // No existing

      const result = await consentService.initiateConsent(42, { provider: 'setu' });

      expect(result.consentUuid).toBe('test-uuid-001');
      expect(result.consentHandle).toBeDefined();
      expect(result.redirectUrl).toBeDefined();
      expect(result.status).toBe('requested');
      expect(result.provider).toBe('setu');
    });

    it('should create DB record via AaConsent.create', async () => {
      db.AaConsent.findOne.mockResolvedValueOnce(null);

      await consentService.initiateConsent(42, {});

      expect(db.AaConsent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          consent_uuid: 'test-uuid-001',
          farmer_id: 42,
          consent_status: 'requested',
          is_active: true,
        }),
        expect.any(Object),
      );
    });

    it('should return already_active when consent exists', async () => {
      db.AaConsent.findOne.mockResolvedValueOnce({
        consent_uuid: 'existing-uuid',
        consent_status: 'approved',
      });

      const result = await consentService.initiateConsent(42, {});

      expect(result.status).toBe('already_active');
      expect(result.consentUuid).toBe('existing-uuid');
      expect(db.AaConsent.create).not.toHaveBeenCalled();
    });

    it('should throw 404 when farmer not found', async () => {
      db.User.findByPk.mockResolvedValueOnce(null);

      await expect(consentService.initiateConsent(999, {})).rejects.toThrow('Farmer not found');
    });

    it('should cache consent handle mapping in Redis', async () => {
      db.AaConsent.findOne.mockResolvedValueOnce(null);

      await consentService.initiateConsent(42, {});

      // AA-H6 capped handle-cache TTL at 1h (was 24h). Webhook callbacks
      // arrive within minutes; a longer-lived mapping was a leak vector.
      expect(setWithTTL).toHaveBeenCalledWith(
        expect.stringContaining('aa:handle:'),
        expect.any(String),
        3600,
      );
    });

    it('should log audit event for consent_requested', async () => {
      db.AaConsent.findOne.mockResolvedValueOnce(null);

      await consentService.initiateConsent(42, {});

      expect(db.AaConsentAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'consent_requested',
          event_source: 'farmer',
        }),
      );
    });
  });

  // ─── processWebhook ────────────────────────────────────────

  describe('processWebhook', () => {
    beforeEach(() => {
      // Pre-populate Redis with consent handle mapping
      mockRedisStore['aa:handle:setu-handle-123'] = JSON.stringify({
        consentId: 1, consentUuid: 'test-uuid-001', farmerId: 42,
      });
    });

    it('should update consent status on webhook', async () => {
      const result = await consentService.processWebhook('setu', {
        type: 'CONSENT_STATUS_UPDATE',
        consentHandle: 'setu-handle-123',
        status: 'APPROVED',
      }, {});

      expect(result.processed).toBe(true);
      expect(result.status).toBe('approved');
    });

    it('should queue data fetch on approval', async () => {
      await consentService.processWebhook('setu', {
        consentHandle: 'setu-handle-123',
        status: 'APPROVED',
      }, {});

      expect(publishToQueue).toHaveBeenCalledWith('aa.data.fetch', expect.objectContaining({
        consentId: 1,
        farmerId: 42,
        provider: 'setu',
      }));
    });

    it('should invalidate cache on status change', async () => {
      await consentService.processWebhook('setu', {
        consentHandle: 'setu-handle-123',
        status: 'APPROVED',
      }, {});

      expect(deleteKeys).toHaveBeenCalled();
    });

    it('should return not processed for unknown consent handle', async () => {
      const result = await consentService.processWebhook('setu', {
        consentHandle: 'unknown-handle',
        status: 'APPROVED',
      }, {});

      expect(result.processed).toBe(false);
      expect(result.reason).toBe('unknown_consent_handle');
    });

    it('should log audit event for consent status change', async () => {
      await consentService.processWebhook('setu', {
        consentHandle: 'setu-handle-123',
        status: 'APPROVED',
      }, {});

      expect(db.AaConsentAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'consent_approved',
          event_source: 'webhook',
        }),
      );
    });
  });

  // ─── revokeConsent ──────────────────────────────────────────

  describe('revokeConsent', () => {
    it('should revoke consent and clear cache', async () => {
      const mockActiveConsent = {
        ...mockConsent,
        update: jest.fn(async function (fields) { Object.assign(this, fields); }),
      };
      db.AaConsent.findOne.mockResolvedValueOnce(mockActiveConsent);

      const result = await consentService.revokeConsent(42);

      expect(result.status).toBe('revoked');
      expect(mockActiveConsent.update).toHaveBeenCalledWith(
        expect.objectContaining({ consent_status: 'revoked', is_active: false }),
      );
      expect(deleteKeys).toHaveBeenCalled();
    });

    it('should throw 404 when no active consent to revoke', async () => {
      db.AaConsent.findOne.mockResolvedValueOnce(null);

      await expect(consentService.revokeConsent(42)).rejects.toThrow('No active consent to revoke');
    });

    it('should log audit event for consent_revoked', async () => {
      db.AaConsent.findOne.mockResolvedValueOnce({
        ...mockConsent,
        update: jest.fn(),
      });

      await consentService.revokeConsent(42);

      expect(db.AaConsentAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'consent_revoked',
          event_source: 'farmer',
        }),
      );
    });
  });
});
