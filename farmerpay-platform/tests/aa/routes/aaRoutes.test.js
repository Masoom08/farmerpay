/**
 * AA Routes — Integration Tests (~10 tests)
 * Tests API endpoints via supertest with mocked auth and services.
 */

const request = require('supertest');
const express = require('express');

// ─── Mock Auth Middleware ───────────────────────────────────────────

jest.mock('../../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 1, role: 'farmer' };
    next();
  },
}));

jest.mock('../../../src/middleware/roleCheck', () => {
  return (...roles) => (req, res, next) => {
    if (roles.includes(req.user.role) || roles.includes('farmer')) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden' });
  };
});

// ─── Mock Redis ────────────────────────────────────────────────────

jest.mock('../../../src/config/redis', () => ({
  setWithTTL: jest.fn(async () => {}),
  getKey: jest.fn(async () => null),
  deleteKeys: jest.fn(async () => {}),
  getRedisClient: jest.fn(() => ({
    ttl: jest.fn(async () => -2),
    get: jest.fn(async () => null),
    setex: jest.fn(async () => 'OK'),
    incr: jest.fn(async () => 1),
    expire: jest.fn(async () => 1),
  })),
}));

jest.mock('../../../src/config/rabbitmq', () => ({
  publishToQueue: jest.fn(async () => {}),
}));

// ─── Mock AA Provider ──────────────────────────────────────────────

jest.mock('../../../src/integrations/accountAggregator', () => ({
  getProvider: jest.fn(() => ({
    createConsent: jest.fn(async () => ({
      consentHandle: 'handle-123',
      redirectUrl: 'https://setu.co/redirect',
      status: 'PENDING',
    })),
    parseWebhook: jest.fn((payload) => ({
      eventType: 'CONSENT_STATUS_UPDATE',
      consentHandle: payload.consentHandle || 'handle-123',
      status: payload.status || 'APPROVED',
    })),
    revokeConsent: jest.fn(async () => ({})),
  })),
  listProviders: jest.fn(() => [
    { name: 'setu', status: 'active' },
    { name: 'finvu', status: 'available' },
  ]),
  aaConfig: {
    enabled: false,
    activeProvider: 'setu',
    setu: { redirectUrl: 'https://setu.co' },
    dataWindow: { defaultMonths: 12, maxMonths: 24 },
    cache: { consentTTL: 86400, summaryTTL: 43200 },
    retry: { maxAttempts: 3, backoffMs: 10, timeoutMs: 5000 },
  },
}));

// ─── Mock Models ───────────────────────────────────────────────────

jest.mock('../../../src/shared/models', () => {
  const mockUser = { id: 42, user_id: 1, is_active: true, phone: '9876543210' };
  return {
    User: {
      findOne: jest.fn(async () => mockUser),
      findByPk: jest.fn(async () => mockUser),
    },
    AaConsent: {
      // Default: no existing consent. initiateConsent tests create a new
      // one; revokeConsent / check-status tests override per-test with
      // mockResolvedValueOnce. The /aa/analysis path (AA-C3
      // assertActiveConsent) and /aa/bridge path also override.
      findOne: jest.fn(async () => null),
      findByPk: jest.fn(async () => ({
        id: 1, consent_uuid: 'uuid-001', consent_status: 'approved',
        data_from: '2024-01-01', data_to: '2025-01-01',
        aa_provider: 'setu', fetch_count: 0,
        update: jest.fn(),
      })),
      create: jest.fn(async (data) => ({
        id: 1, ...data,
        update: jest.fn(async function (f) { Object.assign(this, f); }),
      })),
    },
    AaBankStatementSummary: {
      findAll: jest.fn(async () => [{
        bank_name: 'SBI', account_type: 'savings',
        avg_monthly_credit: 30000, avg_monthly_debit: 20000, avg_monthly_balance: 50000,
        bounce_count: 0, emi_debit_count: 4, govt_subsidy_credits: 5,
        upi_transaction_count: 20, avg_upi_value: 1500, min_balance: 10000,
        toJSON() { return { ...this, toJSON: undefined }; },
      }]),
      findOne: jest.fn(async () => null),
    },
    AaTransaction: {
      findAndCountAll: jest.fn(async () => ({ count: 0, rows: [] })),
      findAll: jest.fn(async () => []),
      bulkCreate: jest.fn(async (r) => r),
    },
    AaFinancialAnalysis: {
      findOne: jest.fn(async () => null),
      findAndCountAll: jest.fn(async () => ({ count: 0, rows: [] })),
      update: jest.fn(async () => [1]),
      create: jest.fn(async (data) => ({ id: 1, ...data, created_at: new Date() })),
    },
    AaConsentAuditLog: { create: jest.fn(async (d) => d) },
    sequelize: {
      transaction: jest.fn(async () => ({ commit: jest.fn(), rollback: jest.fn() })),
      query: jest.fn(async () => [[{ total_consents: 10, approved: 5 }]]),
    },
  };
});

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn(() => 'uuid-route-test'),
}));

jest.mock('../../../src/shared/utils/paginationHelper', () => ({
  parsePagination: jest.fn((q) => ({ page: 1, limit: 10, offset: 0 })),
  buildMeta: jest.fn(() => ({ page: 1, limit: 10, total: 0 })),
}));

// ─── Build Express App ─────────────────────────────────────────────

const aaRoutes = require('../../../src/modules/aa/routes/aaRoutes');
const { webhookRouter } = require('../../../src/modules/aa/routes/aaRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/aa', aaRoutes);
app.use('/api/v1/aa', webhookRouter);
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    errorCode: err.errorCode,
  });
});

// ═══════════════════════════════════════════════════════════════════

describe('AA Routes', () => {
  describe('POST /aa/consent', () => {
    it('should return 201 with redirect URL', async () => {
      const res = await request(app)
        .post('/api/v1/aa/consent')
        .send({ provider: 'setu', monthsBack: 12 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.consentUuid).toBeDefined();
      expect(res.body.data.redirectUrl).toBeDefined();
      expect(res.body.data.status).toBe('requested');
    });

    it('should return 400 for invalid provider', async () => {
      const res = await request(app)
        .post('/api/v1/aa/consent')
        .send({ provider: 'invalid_provider' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /aa/consent', () => {
    it('should return current consent status', async () => {
      const res = await request(app)
        .get('/api/v1/aa/consent');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /aa/providers', () => {
    it('should list available AA providers', async () => {
      const res = await request(app)
        .get('/api/v1/aa/providers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /aa/webhook/:provider', () => {
    it('should accept webhook without auth', async () => {
      const res = await request(app)
        .post('/api/v1/aa/webhook/setu')
        .send({
          type: 'CONSENT_STATUS_UPDATE',
          consentHandle: 'handle-123',
          status: 'APPROVED',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /aa/analysis', () => {
    it('should return analysis or computed result', async () => {
      // AA-C3 bridge gates reads through assertActiveConsent — give it a
      // live approved consent for this happy-path request.
      const db = require('../../../src/shared/models');
      db.AaConsent.findOne.mockResolvedValueOnce({
        id: 1, farmer_id: 42, consent_status: 'approved', is_active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      const res = await request(app)
        .get('/api/v1/aa/analysis');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /aa/analysis/history', () => {
    it('should return paginated history', async () => {
      const res = await request(app)
        .get('/api/v1/aa/analysis/history');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /aa/analysis/transactions', () => {
    it('should return paginated transactions', async () => {
      const res = await request(app)
        .get('/api/v1/aa/analysis/transactions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept filter query params', async () => {
      const res = await request(app)
        .get('/api/v1/aa/analysis/transactions?type=credit&page=1&limit=20');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /aa/bridge/:module', () => {
    it('should return TRUST bridge data', async () => {
      // AA-C3 bridge assertActiveConsent — give it a live consent.
      const db = require('../../../src/shared/models');
      db.AaConsent.findOne.mockResolvedValueOnce({
        id: 1, farmer_id: 42, consent_status: 'approved', is_active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      const res = await request(app)
        .get('/api/v1/aa/bridge/trust');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for invalid module', async () => {
      const res = await request(app)
        .get('/api/v1/aa/bridge/invalid');

      expect(res.status).toBe(400);
    });
  });
});
