/**
 * TRUST v2 Routes — Integration Tests
 * Tests the 8 B4 endpoints via supertest with mocked auth and services.
 */

const request = require('supertest');
const express = require('express');

// ─── Mock Auth ────────────────────────────────────────────────────

let mockRole = 'banker';

jest.mock('../../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'jwt-user-1', role: mockRole };
    next();
  },
}));

jest.mock('../../../src/middleware/roleCheck', () => {
  return (...allowedRoles) => (req, res, next) => {
    if (allowedRoles.includes(req.user.role)) return next();
    return res.status(403).json({ success: false, message: 'Forbidden' });
  };
});

// ─── Mock Redis ───────────────────────────────────────────────────

jest.mock('../../../src/config/redis', () => ({
  setWithTTL: jest.fn(async () => {}),
  getKey: jest.fn(async () => null),
  deleteKeys: jest.fn(async () => {}),
  // TRUST-C2 added a per-farmer daily recompute rate limit via
  // client.incr + client.expire, so the redis client mock now has to
  // expose those methods (always allow — test covers below-limit case).
  getRedisClient: jest.fn(() => ({
    keys: jest.fn(async () => []),
    del: jest.fn(async () => 0),
    incr: jest.fn(async () => 1),
    expire: jest.fn(async () => 1),
  })),
}));

jest.mock('../../../src/config/rabbitmq', () => ({
  getChannel: jest.fn(async () => ({
    publish: jest.fn(() => true),
  })),
}));

// ─── Mock Models ──────────────────────────────────────────────────

const mockBankerUser = { id: 99, user_id: 'jwt-user-1', is_active: true };

jest.mock('../../../src/shared/models', () => ({
  User: {
    findOne: jest.fn(async () => mockBankerUser),
  },
  sequelize: {
    transaction: jest.fn(async () => ({ commit: jest.fn(), rollback: jest.fn() })),
  },
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn(() => 'test-uuid-1234'),
}));

jest.mock('../../../src/shared/utils/paginationHelper', () => ({
  parsePagination: jest.fn((q) => ({ page: 1, limit: 10, offset: 0 })),
  buildMeta: jest.fn(() => ({ page: 1, limit: 10, total: 0 })),
}));

// ─── Mock Trust Service ───────────────────────────────────────────

const SNAPSHOT_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const INACTIVE_UUID = 'deadbeef-dead-beef-dead-beefdeadbeef';

const mockSnapshot = {
  snapshotUuid: SNAPSHOT_UUID,
  score: 650,
  legacyScore: 65,
  scoreBand: 'good',
  decision: 'SANCTION',
  computedAt: '2026-04-14T00:00:00.000Z',
  pillars: [{ code: 'P1', name: 'Personal', weight: 0.15, score: 70 }],
  groups: [{ groupCode: 'DEMO', groupLabel: 'Demographics', score: 70 }],
};

jest.mock('../../../src/modules/trust/services/trustService', () => ({
  // v1 stubs (needed because trustController requires the full module)
  getSections: jest.fn(async () => []),
  getSectionQuestions: jest.fn(async () => []),
  saveResponses: jest.fn(async () => ({})),
  getProgress: jest.fn(async () => ({})),
  getScore: jest.fn(async () => ({})),
  getScoreHistory: jest.fn(async () => ({ history: [], meta: {} })),
  submitAppeal: jest.fn(async () => ({})),
  getAppeal: jest.fn(async () => ({})),
  getAppealsAdmin: jest.fn(async () => ({ appeals: [], meta: {} })),
  getHome: jest.fn(async () => ({})),
  getActivities: jest.fn(async () => ({})),
  upsertActivities: jest.fn(async () => ({})),
  getLeverage: jest.fn(async () => ({})),
  listLiabilities: jest.fn(async () => ({})),
  createLiability: jest.fn(async () => ({})),
  updateLiability: jest.fn(async () => ({})),
  deleteLiability: jest.fn(async () => ({})),
  listRepayments: jest.fn(async () => ({})),
  logRepayment: jest.fn(async () => ({})),
  listExpenses: jest.fn(async () => ({})),
  getCurrentMonthExpense: jest.fn(async () => ({})),
  getExpenseSummary: jest.fn(async () => ({})),
  upsertMonthlyExpense: jest.fn(async () => ({})),
  // v2 stubs
  getLatestSnapshot: jest.fn(async (farmerId) => {
    if (farmerId === 999) return null;
    return mockSnapshot;
  }),
  computeSnapshot: jest.fn(async () => mockSnapshot),
  recordDecision: jest.fn(async ({ snapshotUuid }) => {
    if (snapshotUuid === INACTIVE_UUID) {
      const err = new Error('Snapshot is no longer active');
      err.statusCode = 410;
      err.errorCode = 'TRUST_SNAPSHOT_INACTIVE';
      throw err;
    }
    return { decisionUuid: 'dec-uuid-1', decision: 'SANCTION' };
  }),
  getPortfolio: jest.fn(async () => ({
    items: [{ farmerId: 1, score: 700, decision: 'SANCTION' }],
    meta: { page: 1, limit: 25, total: 1 },
  })),
  exportPdf: jest.fn(async (uuid) => {
    if (uuid === '00000000-0000-0000-0000-000000000000') {
      const err = new Error('Snapshot not found');
      err.statusCode = 404;
      err.errorCode = 'TRUST_SNAPSHOT_NOT_FOUND';
      throw err;
    }
    return { url: 'https://cdn.farmerpay.in/trust/snapshot.pdf' };
  }),
  getSathiTasks: jest.fn(async () => ({
    items: [{ taskId: 1, taskType: 'VERIFY_LAND', status: 'OPEN' }],
    meta: { page: 1, limit: 10, total: 1 },
  })),
  submitSathiTask: jest.fn(async () => ({ taskId: 1, status: 'DONE' })),
  requestMoreData: jest.fn(async () => ({
    tasksCreated: 2,
    tasks: [{ taskUuid: 'task-1', taskType: 'VERIFY_LAND' }],
  })),
}));

// ─── Build Express App ────────────────────────────────────────────

const trustRoutes = require('../../../src/modules/trust/routes/trustRoutes');
const sathiTaskRoutes = require('../../../src/modules/trust/routes/sathiTaskRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/trust', trustRoutes);
app.use('/api/v1/sathi/trust-tasks', sathiTaskRoutes);
app.use((err, _req, res, _next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    errorCode: err.errorCode || null,
  });
});

// ═══════════════════════════════════════════════════════════════════

describe('TRUST v2 Routes', () => {
  beforeEach(() => { mockRole = 'banker'; });

  // ─── 1. GET /trust/farmer/:farmerId/snapshot ───────────────────

  describe('GET /trust/farmer/:farmerId/snapshot', () => {
    it('200 — returns snapshot DTO', async () => {
      const res = await request(app).get('/api/v1/trust/farmer/42/snapshot');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.snapshotUuid).toBe(SNAPSHOT_UUID);
      expect(res.body.data.score).toBe(650);
    });

    it('404 — farmer with no snapshot', async () => {
      const res = await request(app).get('/api/v1/trust/farmer/999/snapshot');
      expect(res.status).toBe(404);
      expect(res.body.errorCode).toBe('TRUST_SNAPSHOT_NOT_FOUND');
    });

    it('400 — invalid farmerId (non-number)', async () => {
      const res = await request(app).get('/api/v1/trust/farmer/abc/snapshot');
      expect(res.status).toBe(400);
    });
  });

  // ─── 2. POST /trust/farmer/:farmerId/recompute ────────────────

  describe('POST /trust/farmer/:farmerId/recompute', () => {
    it('201 — recomputes snapshot', async () => {
      const res = await request(app)
        .post('/api/v1/trust/farmer/42/recompute')
        .send({ reason: 'Updated CIBIL data' });
      expect(res.status).toBe(201);
      expect(res.body.data.snapshotUuid).toBeDefined();
    });

    it('201 — empty body (reason optional)', async () => {
      const res = await request(app)
        .post('/api/v1/trust/farmer/42/recompute')
        .send({});
      expect(res.status).toBe(201);
    });

    it('403 — farmer role forbidden', async () => {
      mockRole = 'farmer';
      const res = await request(app)
        .post('/api/v1/trust/farmer/42/recompute')
        .send({});
      expect(res.status).toBe(403);
    });

    it('400 — reason too long', async () => {
      const res = await request(app)
        .post('/api/v1/trust/farmer/42/recompute')
        .send({ reason: 'x'.repeat(201) });
      expect(res.status).toBe(400);
    });
  });

  // ─── 3. POST /trust/decisions ─────────────────────────────────

  describe('POST /trust/decisions', () => {
    it('201 — SANCTION decision', async () => {
      const res = await request(app)
        .post('/api/v1/trust/decisions')
        .send({ snapshotUuid: SNAPSHOT_UUID, decision: 'SANCTION' });
      expect(res.status).toBe(201);
      expect(res.body.data.decisionUuid).toBeDefined();
    });

    it('400 — missing snapshotUuid', async () => {
      const res = await request(app)
        .post('/api/v1/trust/decisions')
        .send({ decision: 'SANCTION' });
      expect(res.status).toBe(400);
    });

    it('400 — invalid decision enum', async () => {
      const res = await request(app)
        .post('/api/v1/trust/decisions')
        .send({ snapshotUuid: SNAPSHOT_UUID, decision: 'APPROVE' });
      expect(res.status).toBe(400);
    });

    it('400 — REJECT without reasonCode', async () => {
      const res = await request(app)
        .post('/api/v1/trust/decisions')
        .send({ snapshotUuid: SNAPSHOT_UUID, decision: 'REJECT', reasonText: 'x'.repeat(40) });
      expect(res.status).toBe(400);
    });

    it('400 — REJECT reasonText < 40 chars', async () => {
      const res = await request(app)
        .post('/api/v1/trust/decisions')
        .send({ snapshotUuid: SNAPSHOT_UUID, decision: 'REJECT', reasonCode: 'OTHER', reasonText: 'too short' });
      expect(res.status).toBe(400);
    });

    it('410 — inactive snapshot', async () => {
      const res = await request(app)
        .post('/api/v1/trust/decisions')
        .send({ snapshotUuid: INACTIVE_UUID, decision: 'SANCTION' });
      expect(res.status).toBe(410);
      expect(res.body.errorCode).toBe('TRUST_SNAPSHOT_INACTIVE');
    });

    it('403 — farmer role forbidden', async () => {
      mockRole = 'farmer';
      const res = await request(app)
        .post('/api/v1/trust/decisions')
        .send({ snapshotUuid: SNAPSHOT_UUID, decision: 'SANCTION' });
      expect(res.status).toBe(403);
    });
  });

  // ─── 4. GET /trust/portfolio ──────────────────────────────────

  describe('GET /trust/portfolio', () => {
    it('200 — returns paginated portfolio', async () => {
      const res = await request(app).get('/api/v1/trust/portfolio');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toBeDefined();
    });

    it('200 — with filters', async () => {
      const res = await request(app)
        .get('/api/v1/trust/portfolio?scoreBand=SANCTION&maxDataAgeDays=30&page=1&limit=25');
      expect(res.status).toBe(200);
    });

    it('400 — invalid scoreBand', async () => {
      const res = await request(app).get('/api/v1/trust/portfolio?scoreBand=EXCELLENT');
      expect(res.status).toBe(400);
    });

    it('403 — farmer role forbidden', async () => {
      mockRole = 'farmer';
      const res = await request(app).get('/api/v1/trust/portfolio');
      expect(res.status).toBe(403);
    });
  });

  // ─── 5. POST /trust/export/pdf ────────────────────────────────

  describe('POST /trust/export/pdf', () => {
    it('200 — returns PDF URL', async () => {
      const res = await request(app)
        .post('/api/v1/trust/export/pdf')
        .send({ snapshotUuid: SNAPSHOT_UUID });
      expect(res.status).toBe(200);
      expect(res.body.data.url).toBeDefined();
    });

    it('400 — missing snapshotUuid', async () => {
      const res = await request(app)
        .post('/api/v1/trust/export/pdf')
        .send({});
      expect(res.status).toBe(400);
    });

    it('400 — non-UUID string', async () => {
      const res = await request(app)
        .post('/api/v1/trust/export/pdf')
        .send({ snapshotUuid: 'not-a-uuid' });
      expect(res.status).toBe(400);
    });

    it('404 — unknown snapshot UUID', async () => {
      const res = await request(app)
        .post('/api/v1/trust/export/pdf')
        .send({ snapshotUuid: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(404);
      expect(res.body.errorCode).toBe('TRUST_SNAPSHOT_NOT_FOUND');
    });

    it('403 — farmer role forbidden', async () => {
      mockRole = 'farmer';
      const res = await request(app)
        .post('/api/v1/trust/export/pdf')
        .send({ snapshotUuid: SNAPSHOT_UUID });
      expect(res.status).toBe(403);
    });
  });

  // ─── 6. GET /sathi/trust-tasks ────────────────────────────────

  describe('GET /sathi/trust-tasks', () => {
    it('200 — returns task list for sathi', async () => {
      mockRole = 'sathi';
      const res = await request(app).get('/api/v1/sathi/trust-tasks');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('200 — with query filters', async () => {
      mockRole = 'sathi';
      const res = await request(app)
        .get('/api/v1/sathi/trust-tasks?status=OPEN&taskType=VERIFY_LAND');
      expect(res.status).toBe(200);
    });

    it('400 — invalid status enum', async () => {
      mockRole = 'sathi';
      const res = await request(app).get('/api/v1/sathi/trust-tasks?status=PENDING');
      expect(res.status).toBe(400);
    });

    it('403 — banker role forbidden on sathi endpoint', async () => {
      mockRole = 'banker';
      const res = await request(app).get('/api/v1/sathi/trust-tasks');
      expect(res.status).toBe(403);
    });
  });

  // ─── 7. POST /sathi/trust-tasks/:taskId/submit ───────────────

  describe('POST /sathi/trust-tasks/:taskId/submit', () => {
    it('201 — submits task', async () => {
      mockRole = 'sathi';
      const res = await request(app)
        .post('/api/v1/sathi/trust-tasks/77/submit')
        .send({ answers: { q1: 'yes' } });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DONE');
    });

    it('400 — missing answers', async () => {
      mockRole = 'sathi';
      const res = await request(app)
        .post('/api/v1/sathi/trust-tasks/77/submit')
        .send({});
      expect(res.status).toBe(400);
    });

    it('400 — invalid geotag (lat out of range)', async () => {
      mockRole = 'sathi';
      const res = await request(app)
        .post('/api/v1/sathi/trust-tasks/77/submit')
        .send({ answers: {}, geotag: { lat: 999, lng: 0 } });
      expect(res.status).toBe(400);
    });

    it('403 — banker role forbidden', async () => {
      mockRole = 'banker';
      const res = await request(app)
        .post('/api/v1/sathi/trust-tasks/77/submit')
        .send({ answers: { q1: 'yes' } });
      expect(res.status).toBe(403);
    });
  });

  // ─── 8. POST /trust/farmer/:farmerId/request-data ─────────────

  describe('POST /trust/farmer/:farmerId/request-data', () => {
    it('201 — creates sathi tasks for missing pillars', async () => {
      const res = await request(app)
        .post('/api/v1/trust/farmer/42/request-data')
        .send({ missingPillars: ['P2', 'P4'] });
      expect(res.status).toBe(201);
      expect(res.body.data.tasksCreated).toBe(2);
    });

    it('400 — empty missingPillars', async () => {
      const res = await request(app)
        .post('/api/v1/trust/farmer/42/request-data')
        .send({ missingPillars: [] });
      expect(res.status).toBe(400);
    });

    it('400 — invalid pillar code P7', async () => {
      const res = await request(app)
        .post('/api/v1/trust/farmer/42/request-data')
        .send({ missingPillars: ['P7'] });
      expect(res.status).toBe(400);
    });

    it('403 — farmer role forbidden', async () => {
      mockRole = 'farmer';
      const res = await request(app)
        .post('/api/v1/trust/farmer/42/request-data')
        .send({ missingPillars: ['P2'] });
      expect(res.status).toBe(403);
    });
  });
});
