/**
 * End-to-end role projection tests — readiness API.
 *
 * Proves the shape contract per role across the full controller → service stack.
 *
 * Fixtures: 4 farmers on the 2×2 grid (high/high, high/low, low/high, low/low).
 * Roles: farmer, sathi, banker — each queried for every fixture.
 *
 * Key invariant tested:
 *   Sathi response serialized as JSON string contains ZERO occurrences of
 *   "fhs", "financialHealth", or transaction-level keys.
 */

// ─── Fixture farmers ────────────────────────────────────────────────
// Prefixed with `mock` so Jest's hoisting allows them in jest.mock() factories.

const mockFarmerHH = { uuid: 'f0000000-0000-0000-0000-000000000001', id: 1, trust: 80, fhs: 75 }; // approve
const mockFarmerHL = { uuid: 'f0000000-0000-0000-0000-000000000002', id: 2, trust: 80, fhs: 30 }; // conditional
const mockFarmerLH = { uuid: 'f0000000-0000-0000-0000-000000000003', id: 3, trust: 40, fhs: 75 }; // refer
const mockFarmerLL = { uuid: 'f0000000-0000-0000-0000-000000000004', id: 4, trust: 35, fhs: 25 }; // decline

const mockAllFarmers = [mockFarmerHH, mockFarmerHL, mockFarmerLH, mockFarmerLL];

const mockBankerUuid = 'b0000000-0000-0000-0000-000000000001';
const mockBankerId = 99;

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

// ─── Mock TRUST service (per-farmer scores) ─────────────────────────

jest.mock('../../../src/modules/trust/services/trustService', () => ({
  getScore: jest.fn(async (farmerId) => {
    const farmer = mockAllFarmers.find(f => f.id === farmerId);
    if (!farmer) return null;
    return {
      totalScore: farmer.trust,
      scoreBand: farmer.trust >= 80 ? 'A' : farmer.trust >= 50 ? 'B' : 'C',
      sectionScores: { identity: farmer.trust, behavioural: farmer.trust - 5, repayment: farmer.trust },
      calculatedAt: new Date('2026-04-01'),
      nextReviewDate: new Date('2026-07-01'),
    };
  }),
}));

// ─── Mock AA Orchestrator (per-farmer FHS) ──────────────────────────

jest.mock('../../../src/modules/aa/services/aaAnalysisOrchestrator', () => ({
  getLatestAnalysis: jest.fn(async (farmerId) => {
    const farmer = mockAllFarmers.find(f => f.id === farmerId);
    if (!farmer) return null;
    return {
      analysisUuid: `aa-${farmerId}`,
      score: farmer.fhs,
      grade: farmer.fhs >= 60 ? 'B' : 'D',
      components: {
        cashFlowStability: { score: farmer.fhs, details: {} },
        balanceAdequacy: { score: farmer.fhs - 5, details: {} },
        incomeDiversity: { score: farmer.fhs - 10, details: {} },
        debtDiscipline: { score: farmer.fhs + 5, details: {} },
        govtTransferAccess: { score: farmer.fhs - 15, details: {} },
        digitalAdoption: { score: farmer.fhs - 10, details: {} },
      },
      analysisMode: 'raw_transactions',
      transactionCount: 240,
      createdAt: new Date('2026-04-05'),
    };
  }),
}));

// ─── Mock User model ────────────────────────────────────────────────

const mockAuditCreate = jest.fn(async (data) => ({ id: 1, ...data }));

jest.mock('../../../src/shared/models', () => ({
  User: {
    findOne: jest.fn(async ({ where }) => {
      const farmer = mockAllFarmers.find(f => f.uuid === where.user_id);
      if (farmer && where.is_active) return { id: farmer.id, user_id: farmer.uuid };
      if (where.user_id === mockBankerUuid && where.is_active) return { id: mockBankerId, user_id: mockBankerUuid };
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

// ─── Import SUT ─────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────

const callGetReadiness = async (farmerUuid, role, query = {}) => {
  const req = {
    params: { farmerUuid },
    query,
    user: {
      id: role === 'farmer' ? farmerUuid : role === 'sathi' ? 'sathi-e2e-uuid' : mockBankerUuid,
      role: role === 'sathi' ? 'sathi_agent' : role,
    },
    ip: '10.0.0.1',
    headers: { 'user-agent': 'e2e-test' },
  };
  const res = mockRes();
  await controller.getReadiness(req, res, mockNext);
  expect(mockNext).not.toHaveBeenCalled();
  return res.json.mock.calls[0][0].data;
};

const callGetWhy = async (farmerUuid, role) => {
  const req = {
    params: { farmerUuid },
    user: {
      id: role === 'farmer' ? farmerUuid : role === 'sathi' ? 'sathi-e2e-uuid' : mockBankerUuid,
      role: role === 'sathi' ? 'sathi_agent' : role,
    },
  };
  const res = mockRes();
  await controller.getReadinessWhy(req, res, mockNext);
  expect(mockNext).not.toHaveBeenCalled();
  return res.json.mock.calls[0][0].data;
};

// ═══════════════════════════════════════════════════════════════════════

describe('E2E: Readiness role projection across 4 fixture farmers', () => {
  // ─── Farmer role ──────────────────────────────────────────────

  describe('Farmer role', () => {
    it('receives bands but no numeric scores by default', async () => {
      const data = await callGetReadiness(mockFarmerHH.uuid, 'farmer');

      expect(data.state).toBeDefined();
      expect(data.trust.band).toBeDefined();
      expect(data.trust.score).toBeUndefined();
      expect(data.financialHealth.band).toBeDefined();
      expect(data.financialHealth.score).toBeUndefined();
    });

    it('receives numeric scores when showNumericScores=true', async () => {
      const data = await callGetReadiness(mockFarmerHH.uuid, 'farmer', { showNumericScores: 'true' });

      expect(data.trust.score).toBe(80);
      expect(data.financialHealth.score).toBe(75);
    });

    it('gets drill-down with reasons and nextSteps', async () => {
      const data = await callGetWhy(mockFarmerHH.uuid, 'farmer');

      expect(data.state).toBeDefined();
      expect(data.reasons).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'trust' }),
      ]));
      expect(data.components).toBeDefined();
      expect(data.nextSteps).toBeDefined();
      expect(Array.isArray(data.nextSteps)).toBe(true);
    });

    for (const farmer of mockAllFarmers) {
      it(`correct state for fixture T:${farmer.trust}/F:${farmer.fhs}`, async () => {
        const data = await callGetReadiness(farmer.uuid, 'farmer');

        expect(data.state).toBeDefined();
        expect(['ready', 'almost_ready', 'not_ready', 'needs_data']).toContain(data.state);
      });
    }
  });

  // ─── Sathi role ───────────────────────────────────────────────

  describe('Sathi role', () => {
    it('receives TRUST + coachingPriority, zero FHS in response', async () => {
      const data = await callGetReadiness(mockFarmerHH.uuid, 'sathi');

      expect(data.trust).toBeDefined();
      expect(data.trust.score).toBe(80);
      expect(data.coachingPriority).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(data.coachingPriority);
      expect(data.financialHealth).toBeUndefined();
      expect(data.matrixCell).toBeUndefined();
    });

    it('/why returns TRUST-only components with coaching priority', async () => {
      const data = await callGetWhy(mockFarmerHH.uuid, 'sathi');

      expect(data.components.trust).toBeDefined();
      expect(data.components.financialHealth).toBeUndefined();
      expect(data.coachingPriority).toBeDefined();
      data.reasons.forEach(r => expect(r.field).not.toBe('fhs'));
    });

    // ─── Critical: full JSON serialized string check ──────────

    describe('CRITICAL: serialized response contains zero FHS/financialHealth/transaction keys', () => {
      const FORBIDDEN_PATTERNS = [
        /\bfhs\b/i,
        /financialHealth/,
        /fhsScore/,
        /fhsGrade/,
        /fhsBreakdown/,
        /cashFlowStability/,
        /balanceAdequacy/,
        /incomeDiversity/,
        /debtDiscipline/,
        /govtTransferAccess/,
        /digitalAdoption/,
        /transactionCount/,
        /analysisMode/,
        /analysisUuid/,
      ];

      for (const farmer of mockAllFarmers) {
        it(`GET /readiness — T:${farmer.trust}/F:${farmer.fhs} serialized string has no FHS`, async () => {
          const data = await callGetReadiness(farmer.uuid, 'sathi');
          const serialized = JSON.stringify(data);

          for (const pattern of FORBIDDEN_PATTERNS) {
            expect(serialized).not.toMatch(pattern);
          }
        });

        it(`GET /readiness/why — T:${farmer.trust}/F:${farmer.fhs} serialized string has no FHS`, async () => {
          const data = await callGetWhy(farmer.uuid, 'sathi');
          const serialized = JSON.stringify(data);

          for (const pattern of FORBIDDEN_PATTERNS) {
            expect(serialized).not.toMatch(pattern);
          }
        });
      }
    });
  });

  // ─── Banker role ──────────────────────────────────────────────

  describe('Banker role', () => {
    it('receives full matrix + both scores + thresholds', async () => {
      const data = await callGetReadiness(mockFarmerHH.uuid, 'banker');

      expect(data.trust.score).toBe(80);
      expect(data.trust.band).toBeDefined();
      expect(data.trust.sectionScores).toBeDefined();
      expect(data.financialHealth.score).toBe(75);
      expect(data.financialHealth.band).toBeDefined();
      expect(data.financialHealth.grade).toBeDefined();
      expect(data.financialHealth.components).toBeDefined();
      expect(data.matrixCell).toBeDefined();
      expect(data.recommendedAction).toBeDefined();
      expect(data.thresholds).toBeDefined();
      expect(data.thresholds.trustCutoff).toBe(60);
      expect(data.thresholds.fhsCutoff).toBe(50);
    });

    it('triggers audit log', async () => {
      await callGetReadiness(mockFarmerHH.uuid, 'banker');
      await new Promise(r => setImmediate(r));

      expect(mockAuditCreate).toHaveBeenCalledTimes(1);
      const row = mockAuditCreate.mock.calls[0][0];
      expect(row.farmer_id).toBe(mockFarmerHH.id);
      expect(row.banker_user_id).toBe(mockBankerId);
      expect(row.trust_score).toBe(80);
      expect(row.fhs_score).toBe(75);
      expect(row.matrix_cell).toBe('approve');
    });

    it('/why returns components with full breakdowns + matrixCell', async () => {
      const data = await callGetWhy(mockFarmerHH.uuid, 'banker');

      expect(data.components.trust.score).toBe(80);
      expect(data.components.trust.sectionScores).toBeDefined();
      expect(data.components.financialHealth.score).toBe(75);
      expect(data.components.financialHealth.breakdown).toBeDefined();
      expect(data.matrixCell).toBeDefined();
      expect(data.thresholds).toBeDefined();
    });

    // ─── Per-fixture matrix cell mapping ────────────────────────

    const EXPECTED_CELLS = [
      { farmer: mockFarmerHH, cell: 'approve' },
      { farmer: mockFarmerHL, cell: 'conditional' },
      { farmer: mockFarmerLH, cell: 'refer' },
      { farmer: mockFarmerLL, cell: 'decline' },
    ];

    for (const { farmer, cell } of EXPECTED_CELLS) {
      it(`fixture T:${farmer.trust}/F:${farmer.fhs} → matrixCell="${cell}"`, async () => {
        const data = await callGetReadiness(farmer.uuid, 'banker');
        expect(data.matrixCell).toBe(cell);
      });
    }
  });

  // ─── Cross-role shape contract ────────────────────────────────

  describe('Cross-role shape invariants', () => {
    for (const farmer of mockAllFarmers) {
      it(`all 3 roles return a valid state for T:${farmer.trust}/F:${farmer.fhs}`, async () => {
        const [farmerData, sathiData, bankerData] = await Promise.all([
          callGetReadiness(farmer.uuid, 'farmer'),
          callGetReadiness(farmer.uuid, 'sathi'),
          callGetReadiness(farmer.uuid, 'banker'),
        ]);

        for (const data of [farmerData, sathiData, bankerData]) {
          expect(data.state).toBeDefined();
          expect(['ready', 'almost_ready', 'not_ready', 'needs_data']).toContain(data.state);
        }
      });
    }

    it('farmer and banker see same trust band for high-trust farmer', async () => {
      const farmerData = await callGetReadiness(mockFarmerHH.uuid, 'farmer');
      const bankerData = await callGetReadiness(mockFarmerHH.uuid, 'banker');

      expect(farmerData.trust.band).toBe(bankerData.trust.band);
    });

    it('sathi never receives matrixCell or recommendedAction', async () => {
      for (const farmer of mockAllFarmers) {
        const data = await callGetReadiness(farmer.uuid, 'sathi');
        expect(data.matrixCell).toBeUndefined();
        expect(data.recommendedAction).toBeUndefined();
      }
    });
  });
});
