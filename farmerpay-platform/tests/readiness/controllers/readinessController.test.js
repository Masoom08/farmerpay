/**
 * Readiness Controller — Integration Tests
 * Tests UUID-based routes, role projections, self-query guard, and /why endpoint.
 */

// ─── Mock Redis ────────────────────────────────────────────────────

const mockRedisStore = {};

jest.mock('../../../src/config/redis', () => ({
  setWithTTL: jest.fn(async (key, value) => { mockRedisStore[key] = value; }),
  getKey: jest.fn(async (key) => {
    const val = mockRedisStore[key];
    if (!val) return null;
    try { return JSON.parse(val); } catch { return val; }
  }),
  deleteKeys: jest.fn(async () => {}),
}));

// ─── Mock TRUST service ───────────────────────────────────────────

const mockTrustScore = {
  totalScore: 75,
  scoreBand: 'B',
  sectionScores: { identity: 80, behavioural: 70, repayment: 75 },
  calculatedAt: new Date('2026-04-01'),
  nextReviewDate: new Date('2026-07-01'),
};

jest.mock('../../../src/modules/trust/services/trustService', () => ({
  getScore: jest.fn(async () => ({ ...mockTrustScore })),
}));

// ─── Mock AA Orchestrator ─────────────────────────────────────────

const mockFhsAnalysis = {
  analysisUuid: 'aa-uuid-123',
  score: 68,
  grade: 'B',
  components: {
    cashFlowStability: { score: 72, details: {} },
    balanceAdequacy: { score: 65, details: {} },
    incomeDiversity: { score: 60, details: {} },
    debtDiscipline: { score: 80, details: {} },
    govtTransferAccess: { score: 50, details: {} },
    digitalAdoption: { score: 55, details: {} },
  },
  analysisMode: 'raw_transactions',
  transactionCount: 240,
  createdAt: new Date('2026-04-05'),
};

jest.mock('../../../src/modules/aa/services/aaAnalysisOrchestrator', () => ({
  getLatestAnalysis: jest.fn(async () => ({ ...mockFhsAnalysis })),
}));

// ─── Mock User model ─────────────────────────────────────────────

const FARMER_UUID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_UUID = '660e8400-e29b-41d4-a716-446655440001';
const BANKER_UUID = '770e8400-e29b-41d4-a716-446655440002';
const FARMER_INTERNAL_ID = 42;
const BANKER_INTERNAL_ID = 77;

const mockAuditCreate = jest.fn(async (data) => ({ id: 1, ...data }));

jest.mock('../../../src/shared/models', () => ({
  User: {
    findOne: jest.fn(async ({ where }) => {
      if (where.user_id === FARMER_UUID && where.is_active) {
        return { id: FARMER_INTERNAL_ID, user_id: FARMER_UUID };
      }
      if (where.user_id === OTHER_UUID && where.is_active) {
        return { id: 99, user_id: OTHER_UUID };
      }
      if (where.user_id === BANKER_UUID && where.is_active) {
        return { id: BANKER_INTERNAL_ID, user_id: BANKER_UUID };
      }
      return null;
    }),
  },
  ReadinessDecisionAuditLog: {
    create: mockAuditCreate,
  },
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

// ─── Import SUT ───────────────────────────────────────────────────

const controller = require('../../../src/modules/readiness/controllers/readinessController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockRedisStore).forEach(k => delete mockRedisStore[k]);
  mockNext.mockClear();
});

// ═══════════════════════════════════════════════════════════════════

describe('readinessController', () => {
  // ─── getReadiness ──────────────────────────────────────────

  describe('GET /:farmerUuid (getReadiness)', () => {
    describe('farmer role — self-query', () => {
      it('should return readiness for farmer querying own UUID', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          query: {},
          user: { id: FARMER_UUID, role: 'farmer' },
        };
        const res = mockRes();

        await controller.getReadiness(req, res, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
        const body = res.json.mock.calls[0][0];
        expect(body.data.state).toBeDefined();
        expect(body.data.trust).toBeDefined();
        expect(body.data.financialHealth).toBeDefined();
        expect(body.data.reasons).toBeDefined();
      });

      it('should include bands but not numeric scores by default', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          query: {},
          user: { id: FARMER_UUID, role: 'farmer' },
        };
        const res = mockRes();

        await controller.getReadiness(req, res, mockNext);

        const body = res.json.mock.calls[0][0];
        expect(body.data.trust.band).toBeDefined();
        expect(body.data.trust.score).toBeUndefined();
        expect(body.data.financialHealth.band).toBeDefined();
        expect(body.data.financialHealth.score).toBeUndefined();
      });

      it('should include numeric scores when showNumericScores=true', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          query: { showNumericScores: 'true' },
          user: { id: FARMER_UUID, role: 'farmer' },
        };
        const res = mockRes();

        await controller.getReadiness(req, res, mockNext);

        const body = res.json.mock.calls[0][0];
        expect(body.data.trust.score).toBe(75);
        expect(body.data.financialHealth.score).toBe(68);
      });
    });

    describe('farmer role — cross-query guard', () => {
      it('should 403 when farmer queries another farmer UUID', async () => {
        const req = {
          params: { farmerUuid: OTHER_UUID },
          query: {},
          user: { id: FARMER_UUID, role: 'farmer' },
        };
        const res = mockRes();

        await controller.getReadiness(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const err = mockNext.mock.calls[0][0];
        expect(err.statusCode).toBe(403);
        expect(err.errorCode).toBe('READINESS_SELF_ONLY');
      });
    });

    describe('sathi role', () => {
      it('should return TRUST-only with coaching priority, no FHS', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          query: {},
          user: { id: 'sathi-uuid-1', role: 'sathi_agent' },
        };
        const res = mockRes();

        await controller.getReadiness(req, res, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        const body = res.json.mock.calls[0][0];
        expect(body.data.state).toBeDefined();
        expect(body.data.trust).toBeDefined();
        expect(body.data.trust.score).toBe(75); // sathi sees TRUST score
        expect(body.data.coachingPriority).toBeDefined();
        expect(body.data.financialHealth).toBeUndefined();
        expect(body.data.matrixCell).toBeUndefined();
      });

      it('should work for sathi role string too', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          query: {},
          user: { id: 'sathi-uuid-2', role: 'sathi' },
        };
        const res = mockRes();

        await controller.getReadiness(req, res, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        const body = res.json.mock.calls[0][0];
        expect(body.data.coachingPriority).toBeDefined();
        expect(body.data.financialHealth).toBeUndefined();
      });
    });

    describe('banker role', () => {
      it('should return full 2x2 matrix with both scores and bands', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          query: {},
          user: { id: 'banker-uuid-1', role: 'banker' },
        };
        const res = mockRes();

        await controller.getReadiness(req, res, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        const body = res.json.mock.calls[0][0];
        expect(body.data.state).toBeDefined();
        expect(body.data.trust).toBeDefined();
        expect(body.data.trust.score).toBe(75);
        expect(body.data.trust.band).toBeDefined();
        expect(body.data.trust.sectionScores).toBeDefined();
        expect(body.data.financialHealth).toBeDefined();
        expect(body.data.financialHealth.score).toBe(68);
        expect(body.data.financialHealth.band).toBeDefined();
        expect(body.data.financialHealth.grade).toBe('B');
        expect(body.data.matrixCell).toBeDefined();
        expect(['approve', 'conditional', 'refer', 'decline']).toContain(body.data.matrixCell);
        expect(body.data.recommendedAction).toBeDefined();
        expect(body.data.thresholds).toBeDefined();
      });

      it('should work for admin role', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          query: {},
          user: { id: 'admin-uuid-1', role: 'admin' },
        };
        const res = mockRes();

        await controller.getReadiness(req, res, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        const body = res.json.mock.calls[0][0];
        expect(body.data.matrixCell).toBeDefined();
      });
    });

    describe('unknown farmer UUID', () => {
      it('should 404 when farmer UUID not found', async () => {
        const req = {
          params: { farmerUuid: '00000000-0000-0000-0000-000000000000' },
          query: {},
          user: { id: 'banker-uuid-1', role: 'banker' },
        };
        const res = mockRes();

        await controller.getReadiness(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const err = mockNext.mock.calls[0][0];
        expect(err.statusCode).toBe(404);
        expect(err.errorCode).toBe('READINESS_FARMER_NOT_FOUND');
      });
    });
  });

  // ─── getReadinessWhy ───────────────────────────────────────

  describe('GET /:farmerUuid/why (getReadinessWhy)', () => {
    describe('farmer role', () => {
      it('should return drill-down with reasons, components, nextSteps', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          user: { id: FARMER_UUID, role: 'farmer' },
        };
        const res = mockRes();

        await controller.getReadinessWhy(req, res, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        const body = res.json.mock.calls[0][0];
        expect(body.data.state).toBeDefined();
        expect(body.data.reasons).toBeDefined();
        expect(Array.isArray(body.data.reasons)).toBe(true);
        expect(body.data.components).toBeDefined();
        expect(body.data.components.trust).toBeDefined();
        expect(body.data.components.financialHealth).toBeDefined();
        expect(body.data.nextSteps).toBeDefined();
        expect(Array.isArray(body.data.nextSteps)).toBe(true);
      });

      it('should include component met/threshold but not numeric score for farmer', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          user: { id: FARMER_UUID, role: 'farmer' },
        };
        const res = mockRes();

        await controller.getReadinessWhy(req, res, mockNext);

        const body = res.json.mock.calls[0][0];
        expect(body.data.components.trust.band).toBeDefined();
        expect(body.data.components.trust.met).toBeDefined();
        expect(body.data.components.trust.threshold).toBeDefined();
        expect(body.data.components.trust.score).toBeUndefined();
      });

      it('should 403 when farmer queries another UUID on /why', async () => {
        const req = {
          params: { farmerUuid: OTHER_UUID },
          user: { id: FARMER_UUID, role: 'farmer' },
        };
        const res = mockRes();

        await controller.getReadinessWhy(req, res, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const err = mockNext.mock.calls[0][0];
        expect(err.statusCode).toBe(403);
        expect(err.errorCode).toBe('READINESS_SELF_ONLY');
      });
    });

    describe('sathi role', () => {
      it('should return TRUST-only components with coaching priority', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          user: { id: 'sathi-uuid-1', role: 'sathi_agent' },
        };
        const res = mockRes();

        await controller.getReadinessWhy(req, res, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        const body = res.json.mock.calls[0][0];
        expect(body.data.components.trust).toBeDefined();
        expect(body.data.components.financialHealth).toBeUndefined();
        expect(body.data.coachingPriority).toBeDefined();
        // Reasons should only contain trust, not fhs
        body.data.reasons.forEach(r => {
          expect(r.field).not.toBe('fhs');
        });
      });

      it('should include role-appropriate nextSteps', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          user: { id: 'sathi-uuid-1', role: 'sathi' },
        };
        const res = mockRes();

        await controller.getReadinessWhy(req, res, mockNext);

        const body = res.json.mock.calls[0][0];
        expect(body.data.nextSteps.length).toBeGreaterThan(0);
        body.data.nextSteps.forEach(step => {
          expect(step.labelKey).toMatch(/readiness\.next\.sathi/);
        });
      });
    });

    describe('banker role', () => {
      it('should return full components with matrixCell and thresholds', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          user: { id: 'banker-uuid-1', role: 'banker' },
        };
        const res = mockRes();

        await controller.getReadinessWhy(req, res, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        const body = res.json.mock.calls[0][0];
        expect(body.data.components.trust).toBeDefined();
        expect(body.data.components.trust.score).toBe(75);
        expect(body.data.components.trust.sectionScores).toBeDefined();
        expect(body.data.components.financialHealth).toBeDefined();
        expect(body.data.components.financialHealth.score).toBe(68);
        expect(body.data.components.financialHealth.breakdown).toBeDefined();
        expect(body.data.matrixCell).toBeDefined();
        expect(body.data.thresholds).toBeDefined();
        expect(body.data.thresholds.trustCutoff).toBe(60);
        expect(body.data.thresholds.fhsCutoff).toBe(50);
      });

      it('should include banker-specific nextSteps', async () => {
        const req = {
          params: { farmerUuid: FARMER_UUID },
          user: { id: 'banker-uuid-1', role: 'banker' },
        };
        const res = mockRes();

        await controller.getReadinessWhy(req, res, mockNext);

        const body = res.json.mock.calls[0][0];
        body.data.nextSteps.forEach(step => {
          expect(step.labelKey).toMatch(/readiness\.next\.banker/);
        });
      });
    });
  });

  // ─── Sathi FHS isolation contract ──────────────────────────

  describe('Sathi FHS isolation — readiness API never returns FHS fields', () => {
    const SATHI_ROLES = ['sathi', 'sathi_agent'];

    const FHS_FORBIDDEN_KEYS = [
      'financialHealth',
      'fhsScore',
      'fhsGrade',
      'fhsBreakdown',
    ];

    /**
     * Recursively check that an object does not contain any forbidden keys.
     * Returns an array of paths where forbidden keys were found.
     */
    function findForbiddenKeys(obj, path = '') {
      const violations = [];
      if (!obj || typeof obj !== 'object') return violations;

      for (const key of Object.keys(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        if (FHS_FORBIDDEN_KEYS.includes(key)) {
          violations.push(fullPath);
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          violations.push(...findForbiddenKeys(obj[key], fullPath));
        }
      }
      return violations;
    }

    /**
     * Check that reasons array never contains field: 'fhs'.
     */
    function findFhsReasons(reasons) {
      if (!Array.isArray(reasons)) return [];
      return reasons.filter(r => r.field === 'fhs');
    }

    for (const role of SATHI_ROLES) {
      describe(`GET /:farmerUuid — role=${role}`, () => {
        it(`should not contain any FHS keys in response`, async () => {
          const req = {
            params: { farmerUuid: FARMER_UUID },
            query: {},
            user: { id: 'sathi-test-uuid', role },
          };
          const res = mockRes();

          await controller.getReadiness(req, res, mockNext);

          expect(mockNext).not.toHaveBeenCalled();
          const body = res.json.mock.calls[0][0];
          const violations = findForbiddenKeys(body.data);
          expect(violations).toEqual([]);
        });

        it(`should not contain fhs reasons`, async () => {
          const req = {
            params: { farmerUuid: FARMER_UUID },
            query: {},
            user: { id: 'sathi-test-uuid', role },
          };
          const res = mockRes();

          await controller.getReadiness(req, res, mockNext);

          const body = res.json.mock.calls[0][0];
          const fhsReasons = findFhsReasons(body.data.reasons);
          expect(fhsReasons).toEqual([]);
        });
      });

      describe(`GET /:farmerUuid/why — role=${role}`, () => {
        it(`should not contain any FHS keys in /why response`, async () => {
          const req = {
            params: { farmerUuid: FARMER_UUID },
            user: { id: 'sathi-test-uuid', role },
          };
          const res = mockRes();

          await controller.getReadinessWhy(req, res, mockNext);

          expect(mockNext).not.toHaveBeenCalled();
          const body = res.json.mock.calls[0][0];
          const violations = findForbiddenKeys(body.data);
          expect(violations).toEqual([]);
        });

        it(`should not contain fhs reasons in /why response`, async () => {
          const req = {
            params: { farmerUuid: FARMER_UUID },
            user: { id: 'sathi-test-uuid', role },
          };
          const res = mockRes();

          await controller.getReadinessWhy(req, res, mockNext);

          const body = res.json.mock.calls[0][0];
          const fhsReasons = findFhsReasons(body.data.reasons);
          expect(fhsReasons).toEqual([]);
        });

        it(`should include coachingPriority`, async () => {
          const req = {
            params: { farmerUuid: FARMER_UUID },
            user: { id: 'sathi-test-uuid', role },
          };
          const res = mockRes();

          await controller.getReadinessWhy(req, res, mockNext);

          const body = res.json.mock.calls[0][0];
          expect(body.data.coachingPriority).toBeDefined();
          expect(['high', 'medium', 'low']).toContain(body.data.coachingPriority);
        });
      });
    }
  });

  // ─── Decision audit log ─────────────────────────────────────

  describe('Decision audit log', () => {
    it('creates exactly one audit row on banker GET /readiness/:farmerUuid', async () => {
      const req = {
        params: { farmerUuid: FARMER_UUID },
        query: {},
        user: { id: BANKER_UUID, role: 'banker' },
        ip: '10.0.0.1',
        headers: { 'user-agent': 'Mozilla/5.0 Test' },
      };
      const res = mockRes();

      await controller.getReadiness(req, res, mockNext);

      // Response should succeed
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();

      // Fire-and-forget: wait for the microtask queue to flush
      await new Promise((r) => setImmediate(r));

      expect(mockAuditCreate).toHaveBeenCalledTimes(1);
      const auditRow = mockAuditCreate.mock.calls[0][0];
      expect(auditRow.farmer_id).toBe(FARMER_INTERNAL_ID);
      expect(auditRow.banker_user_id).toBe(BANKER_INTERNAL_ID);
      expect(auditRow.trust_score).toBe(75);
      expect(auditRow.fhs_score).toBe(68);
      expect(auditRow.matrix_cell).toBe('approve');
      expect(auditRow.recommended_action).toBeDefined();
      expect(auditRow.ip).toBe('10.0.0.1');
      expect(auditRow.user_agent).toBe('Mozilla/5.0 Test');
      expect(auditRow.viewed_at).toBeInstanceOf(Date);
    });

    it('does NOT create audit row for farmer role', async () => {
      const req = {
        params: { farmerUuid: FARMER_UUID },
        query: {},
        user: { id: FARMER_UUID, role: 'farmer' },
        headers: {},
      };
      const res = mockRes();

      await controller.getReadiness(req, res, mockNext);
      await new Promise((r) => setImmediate(r));

      expect(mockAuditCreate).not.toHaveBeenCalled();
    });

    it('does NOT create audit row for sathi role', async () => {
      const req = {
        params: { farmerUuid: FARMER_UUID },
        query: {},
        user: { id: 'sathi-test-uuid', role: 'sathi_agent' },
        headers: {},
      };
      const res = mockRes();

      await controller.getReadiness(req, res, mockNext);
      await new Promise((r) => setImmediate(r));

      expect(mockAuditCreate).not.toHaveBeenCalled();
    });

    it('audit failure does not block the response', async () => {
      // Make audit create throw
      mockAuditCreate.mockRejectedValueOnce(new Error('DB write failed'));

      const req = {
        params: { farmerUuid: FARMER_UUID },
        query: {},
        user: { id: BANKER_UUID, role: 'banker' },
        ip: '10.0.0.1',
        headers: {},
      };
      const res = mockRes();

      await controller.getReadiness(req, res, mockNext);
      await new Promise((r) => setImmediate(r));

      // Response should still succeed even though audit failed
      expect(mockNext).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      const body = res.json.mock.calls[0][0];
      expect(body.data.state).toBeDefined();
    });

    it('audit row has no update path — model only exposes create', () => {
      const { ReadinessDecisionAuditLog } = require('../../../src/shared/models');
      // Model mock only has create — no update, save, or bulkUpdate
      expect(typeof ReadinessDecisionAuditLog.create).toBe('function');
      expect(ReadinessDecisionAuditLog.update).toBeUndefined();
      expect(ReadinessDecisionAuditLog.bulkUpdate).toBeUndefined();
    });
  });
});
