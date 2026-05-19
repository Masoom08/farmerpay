/**
 * Sathi shadow release — telemetry endpoint + field-access classification.
 *
 * Verifies:
 *   1. POST /readiness/telemetry returns 404 when sathiShadowLog is off
 *   2. POST /readiness/telemetry accepts entries when flag is on
 *   3. FHS fields are classified as "unexpected" and logged at WARN level
 *   4. TRUST-only fields are classified as "expected"
 *   5. Empty/missing entries return accepted: 0
 */

const mockConfig = {
  features: {
    readiness: {
      farmerBadge: false,
      sathiCoachingPriority: false,
      bankerMatrix: false,
      sathiShadowLog: false,
    },
  },
};

jest.mock('../../src/config', () => mockConfig);

jest.mock('../../src/config/redis', () => ({
  setWithTTL: jest.fn(async () => {}),
  getKey: jest.fn(async () => null),
  deleteKeys: jest.fn(async () => {}),
}));

jest.mock('../../src/modules/trust/services/trustService', () => ({
  getScore: jest.fn(async () => null),
}));

jest.mock('../../src/modules/aa/services/aaAnalysisOrchestrator', () => ({
  getLatestAnalysis: jest.fn(async () => null),
}));

jest.mock('../../src/shared/models', () => ({
  User: { findOne: jest.fn(async () => null) },
  ReadinessDecisionAuditLog: { create: jest.fn(async (d) => d) },
}));

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
jest.mock('../../src/shared/utils/logger', () => mockLogger);

jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => next(),
}));

const express = require('express');
const request = require('supertest');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = req.headers['x-test-user'] ? JSON.parse(req.headers['x-test-user']) : { id: 'test', role: 'sathi' };
    next();
  });
  const routes = require('../../src/modules/readiness/routes/readinessRoutes');
  app.use('/readiness', routes);
  return app;
}

describe('Sathi shadow release telemetry', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.features.readiness.sathiShadowLog = false;
  });

  // ─── Flag off → 404 ──────────────────────────────────────────

  it('returns 404 when sathiShadowLog flag is off', async () => {
    const res = await request(app)
      .post('/readiness/telemetry')
      .send({ entries: [{ field: 'state', path: 'state', source: 'test', ts: Date.now() }] });

    expect(res.status).toBe(404);
  });

  // ─── Flag on → accepts entries ────────────────────────────────

  it('accepts entries when flag is on', async () => {
    mockConfig.features.readiness.sathiShadowLog = true;

    const entries = [
      { field: 'state', path: 'state', source: 'farmer-detail', ts: Date.now() },
      { field: 'trust', path: 'trust', source: 'farmer-detail', ts: Date.now() },
      { field: 'band', path: 'trust.band', source: 'farmer-detail', ts: Date.now() },
      { field: 'coachingPriority', path: 'coachingPriority', source: 'farmer-detail', ts: Date.now() },
    ];

    const res = await request(app)
      .post('/readiness/telemetry')
      .send({ entries });

    expect(res.status).toBe(200);
    expect(res.body.data.accepted).toBe(4);
    expect(res.body.data.expected).toBe(4);
    expect(res.body.data.unexpected).toBe(0);
  });

  // ─── FHS fields → classified as unexpected ────────────────────

  it('classifies FHS fields as unexpected and logs WARN', async () => {
    mockConfig.features.readiness.sathiShadowLog = true;

    const entries = [
      { field: 'state', path: 'state', source: 'test', ts: 1 },
      { field: 'financialHealth', path: 'financialHealth', source: 'test', ts: 2 },
      { field: 'fhsScore', path: 'fhsScore', source: 'test', ts: 3 },
      { field: 'cashFlowStability', path: 'financialHealth.components.cashFlowStability', source: 'test', ts: 4 },
      { field: 'transactionCount', path: 'financialHealth.transactionCount', source: 'test', ts: 5 },
    ];

    const res = await request(app)
      .post('/readiness/telemetry')
      .send({ entries });

    expect(res.body.data.accepted).toBe(5);
    expect(res.body.data.expected).toBe(1); // only 'state'
    expect(res.body.data.unexpected).toBe(4); // financialHealth, fhsScore, cashFlowStability, transactionCount

    // Verify logger.warn was called with FHS_ACCESS_DETECTED
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'readiness:telemetry:sathi:FHS_ACCESS_DETECTED',
      expect.objectContaining({
        count: 4,
        fields: expect.arrayContaining(['financialHealth', 'fhsScore', 'cashFlowStability', 'transactionCount']),
      }),
    );
  });

  // ─── TRUST-only → all expected ────────────────────────────────

  it('classifies TRUST-only fields as all expected', async () => {
    mockConfig.features.readiness.sathiShadowLog = true;

    const entries = [
      { field: 'state', path: 'state', source: 'test', ts: 1 },
      { field: 'trust', path: 'trust', source: 'test', ts: 2 },
      { field: 'band', path: 'trust.band', source: 'test', ts: 3 },
      { field: 'score', path: 'trust.score', source: 'test', ts: 4 },
      { field: 'coachingPriority', path: 'coachingPriority', source: 'test', ts: 5 },
      { field: 'reasons', path: 'reasons', source: 'test', ts: 6 },
    ];

    const res = await request(app)
      .post('/readiness/telemetry')
      .send({ entries });

    expect(res.body.data.expected).toBe(6);
    expect(res.body.data.unexpected).toBe(0);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  // ─── Empty entries → accepted: 0 ─────────────────────────────

  it('returns accepted 0 for empty entries', async () => {
    mockConfig.features.readiness.sathiShadowLog = true;

    const res = await request(app)
      .post('/readiness/telemetry')
      .send({ entries: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.accepted).toBe(0);
  });

  it('returns accepted 0 for missing entries', async () => {
    mockConfig.features.readiness.sathiShadowLog = true;

    const res = await request(app)
      .post('/readiness/telemetry')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.accepted).toBe(0);
  });

  // ─── /flags returns sathiShadowLog ────────────────────────────

  it('flags endpoint returns sathiShadowLog', async () => {
    mockConfig.features.readiness.sathiShadowLog = true;

    const res = await request(app)
      .get('/readiness/flags')
      .set('x-test-user', JSON.stringify({ id: 'sathi-1', role: 'sathi' }));

    expect(res.body.data.sathiShadowLog).toBe(true);
  });
});
