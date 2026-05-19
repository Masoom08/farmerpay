/**
 * Readiness feature gate — tests.
 *
 * Verifies:
 *   1. featureGate middleware blocks/allows based on config
 *   2. readinessFeatureGate (role-aware) maps JWT role to correct flag
 *   3. /readiness/flags endpoint returns all three flags
 *   4. Flag-off returns 404 (clean, not broken), flag-on returns normal data
 */

// ─── Mock config — start with all flags OFF ─────────────────────────

const mockConfig = {
  features: {
    readiness: {
      farmerBadge: false,
      sathiCoachingPriority: false,
      bankerMatrix: false,
    },
  },
};

jest.mock('../../src/config', () => mockConfig);

// ─── featureGate middleware unit tests ──────────────────────────────

const featureGate = require('../../src/middleware/featureGate');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('featureGate middleware', () => {
  it('calls next() when flag is on', () => {
    mockConfig.features.readiness.farmerBadge = true;
    const next = jest.fn();
    const res = mockRes();

    featureGate('readiness.farmerBadge')({}, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 404 when flag is off', () => {
    mockConfig.features.readiness.farmerBadge = false;
    const next = jest.fn();
    const res = mockRes();

    featureGate('readiness.farmerBadge')({}, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'FEATURE_NOT_AVAILABLE' }),
    );
  });

  it('resolves nested dot-paths', () => {
    mockConfig.features.readiness.bankerMatrix = true;
    const next = jest.fn();
    const res = mockRes();

    featureGate('readiness.bankerMatrix')({}, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 404 for non-existent flag path', () => {
    const next = jest.fn();
    const res = mockRes();

    featureGate('readiness.nonExistent')({}, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ─── Role-aware readiness gate integration ──────────────────────────

// Mock all dependencies needed by the readiness routes module
jest.mock('../../src/config/redis', () => ({
  setWithTTL: jest.fn(async () => {}),
  getKey: jest.fn(async () => null),
  deleteKeys: jest.fn(async () => {}),
}));

jest.mock('../../src/modules/trust/services/trustService', () => ({
  getScore: jest.fn(async () => ({
    totalScore: 75, scoreBand: 'B',
    sectionScores: { identity: 80, behavioural: 70, repayment: 75 },
    calculatedAt: new Date('2026-04-01'),
  })),
}));

jest.mock('../../src/modules/aa/services/aaAnalysisOrchestrator', () => ({
  getLatestAnalysis: jest.fn(async () => ({
    score: 68, grade: 'B', components: {},
    analysisMode: 'raw_transactions', transactionCount: 240,
    createdAt: new Date('2026-04-05'),
  })),
}));

const mockFarmerUuid = 'f1111111-1111-1111-1111-111111111111';
const mockBankerUuid = 'b2222222-2222-2222-2222-222222222222';

jest.mock('../../src/shared/models', () => ({
  User: {
    findOne: jest.fn(async ({ where }) => {
      if (where.user_id === mockFarmerUuid) return { id: 1, user_id: mockFarmerUuid };
      if (where.user_id === mockBankerUuid) return { id: 2, user_id: mockBankerUuid };
      return null;
    }),
  },
  ReadinessDecisionAuditLog: { create: jest.fn(async (d) => ({ id: 1, ...d })) },
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => next(),
}));

// Import routes
const express = require('express');
const request = require('supertest');

function buildApp() {
  const app = express();
  app.use(express.json());
  // Inject req.user for tests
  app.use((req, res, next) => {
    req.user = req.headers['x-test-user'] ? JSON.parse(req.headers['x-test-user']) : null;
    next();
  });
  const routes = require('../../src/modules/readiness/routes/readinessRoutes');
  app.use('/readiness', routes);
  return app;
}

describe('Readiness route-level feature gating', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  beforeEach(() => {
    // Reset all flags to OFF
    mockConfig.features.readiness.farmerBadge = false;
    mockConfig.features.readiness.sathiCoachingPriority = false;
    mockConfig.features.readiness.bankerMatrix = false;
  });

  // ─── /readiness/flags endpoint ────────────────────────────

  describe('GET /readiness/flags', () => {
    it('returns all three flags', async () => {
      mockConfig.features.readiness.farmerBadge = true;
      mockConfig.features.readiness.bankerMatrix = false;

      const res = await request(app)
        .get('/readiness/flags')
        .set('x-test-user', JSON.stringify({ id: 'any', role: 'farmer' }));

      expect(res.status).toBe(200);
      expect(res.body.data.farmerBadge).toBe(true);
      expect(res.body.data.sathiCoachingPriority).toBe(false);
      expect(res.body.data.bankerMatrix).toBe(false);
    });
  });

  // ─── Farmer role gating ───────────────────────────────────

  describe('farmer role', () => {
    it('returns 404 when farmerBadge flag is off', async () => {
      const res = await request(app)
        .get(`/readiness/${mockFarmerUuid}`)
        .set('x-test-user', JSON.stringify({ id: mockFarmerUuid, role: 'farmer' }));

      expect(res.status).toBe(404);
      expect(res.body.errorCode).toBe('FEATURE_NOT_AVAILABLE');
    });

    it('returns readiness data when farmerBadge flag is on', async () => {
      mockConfig.features.readiness.farmerBadge = true;

      const res = await request(app)
        .get(`/readiness/${mockFarmerUuid}`)
        .set('x-test-user', JSON.stringify({ id: mockFarmerUuid, role: 'farmer' }));

      expect(res.status).toBe(200);
      expect(res.body.data.state).toBeDefined();
      expect(res.body.data.trust).toBeDefined();
    });

    it('/why returns 404 when farmerBadge flag is off', async () => {
      const res = await request(app)
        .get(`/readiness/${mockFarmerUuid}/why`)
        .set('x-test-user', JSON.stringify({ id: mockFarmerUuid, role: 'farmer' }));

      expect(res.status).toBe(404);
    });
  });

  // ─── Sathi role gating ────────────────────────────────────

  describe('sathi role', () => {
    it('returns 404 when sathiCoachingPriority flag is off', async () => {
      const res = await request(app)
        .get(`/readiness/${mockFarmerUuid}`)
        .set('x-test-user', JSON.stringify({ id: 'sathi-1', role: 'sathi_agent' }));

      expect(res.status).toBe(404);
      expect(res.body.errorCode).toBe('FEATURE_NOT_AVAILABLE');
    });

    it('returns data when sathiCoachingPriority flag is on', async () => {
      mockConfig.features.readiness.sathiCoachingPriority = true;

      const res = await request(app)
        .get(`/readiness/${mockFarmerUuid}`)
        .set('x-test-user', JSON.stringify({ id: 'sathi-1', role: 'sathi_agent' }));

      expect(res.status).toBe(200);
      expect(res.body.data.trust).toBeDefined();
      expect(res.body.data.coachingPriority).toBeDefined();
    });
  });

  // ─── Banker role gating ───────────────────────────────────

  describe('banker role', () => {
    it('returns 404 when bankerMatrix flag is off', async () => {
      const res = await request(app)
        .get(`/readiness/${mockFarmerUuid}`)
        .set('x-test-user', JSON.stringify({ id: mockBankerUuid, role: 'banker' }));

      expect(res.status).toBe(404);
      expect(res.body.errorCode).toBe('FEATURE_NOT_AVAILABLE');
    });

    it('returns full matrix when bankerMatrix flag is on', async () => {
      mockConfig.features.readiness.bankerMatrix = true;

      const res = await request(app)
        .get(`/readiness/${mockFarmerUuid}`)
        .set('x-test-user', JSON.stringify({ id: mockBankerUuid, role: 'banker' }));

      expect(res.status).toBe(200);
      expect(res.body.data.matrixCell).toBeDefined();
      expect(res.body.data.financialHealth).toBeDefined();
    });
  });

  // ─── Admin routes are NOT gated ───────────────────────────

  describe('admin thresholds are not gated by readiness flags', () => {
    it('GET /admin/thresholds works with all flags off', async () => {
      const res = await request(app)
        .get('/readiness/admin/thresholds?bankId=1')
        .set('x-test-user', JSON.stringify({ id: 'admin-1', role: 'admin' }));

      // Should not be 404 FEATURE_NOT_AVAILABLE — may be 200 or other status
      expect(res.body.errorCode).not.toBe('FEATURE_NOT_AVAILABLE');
    });
  });

  // ─── Independent flag isolation ───────────────────────────

  describe('flags are independent — enabling one does not enable another', () => {
    it('farmerBadge ON + bankerMatrix OFF: farmer gets data, banker gets 404', async () => {
      mockConfig.features.readiness.farmerBadge = true;
      mockConfig.features.readiness.bankerMatrix = false;

      const farmerRes = await request(app)
        .get(`/readiness/${mockFarmerUuid}`)
        .set('x-test-user', JSON.stringify({ id: mockFarmerUuid, role: 'farmer' }));

      const bankerRes = await request(app)
        .get(`/readiness/${mockFarmerUuid}`)
        .set('x-test-user', JSON.stringify({ id: mockBankerUuid, role: 'banker' }));

      expect(farmerRes.status).toBe(200);
      expect(bankerRes.status).toBe(404);
    });

    it('bankerMatrix ON + sathiCoachingPriority OFF: banker gets data, sathi gets 404', async () => {
      mockConfig.features.readiness.bankerMatrix = true;
      mockConfig.features.readiness.sathiCoachingPriority = false;

      const bankerRes = await request(app)
        .get(`/readiness/${mockFarmerUuid}`)
        .set('x-test-user', JSON.stringify({ id: mockBankerUuid, role: 'banker' }));

      const sathiRes = await request(app)
        .get(`/readiness/${mockFarmerUuid}`)
        .set('x-test-user', JSON.stringify({ id: 'sathi-1', role: 'sathi_agent' }));

      expect(bankerRes.status).toBe(200);
      expect(sathiRes.status).toBe(404);
    });
  });
});
