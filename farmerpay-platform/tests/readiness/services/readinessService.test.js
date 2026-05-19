/**
 * Readiness Service — Unit Tests
 * Tests role projections, shape guarantees, FHS gating for sathi, and matrix cell logic.
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

// ─── Import SUT ───────────────────────────────────────────────────

const {
  getLoanReadinessState,
  computeState,
  computeMatrixCell,
  scoreToBand,
  computeCoachingPriority,
} = require('../../../src/modules/readiness/services/readinessService');

// ─── Helpers ──────────────────────────────────────────────────────

beforeEach(() => {
  Object.keys(mockRedisStore).forEach((k) => delete mockRedisStore[k]);
  jest.clearAllMocks();
});

const FARMER_ID = 42;

// ─── Pure function tests ──────────────────────────────────────────

describe('computeState', () => {
  const t = { trustCutoff: 60, fhsCutoff: 50 };

  test('returns "ready" when both above thresholds', () => {
    expect(computeState(80, 70, t)).toBe('ready');
  });

  test('returns "almost_ready" when one above threshold', () => {
    expect(computeState(80, 30, t)).toBe('almost_ready');
    expect(computeState(40, 70, t)).toBe('almost_ready');
  });

  test('returns "not_ready" when both below thresholds', () => {
    expect(computeState(30, 30, t)).toBe('not_ready');
  });

  test('returns "needs_data" when scores are null', () => {
    expect(computeState(null, null, t)).toBe('needs_data');
    expect(computeState(80, null, t)).toBe('needs_data');
    expect(computeState(null, 70, t)).toBe('needs_data');
  });
});

describe('computeMatrixCell', () => {
  const t = { trustCutoff: 60, fhsCutoff: 50 };

  test('approve: high trust, high fhs', () => {
    expect(computeMatrixCell(80, 70, t)).toBe('approve');
  });

  test('conditional: high trust, low fhs', () => {
    expect(computeMatrixCell(80, 30, t)).toBe('conditional');
  });

  test('refer: low trust, high fhs', () => {
    expect(computeMatrixCell(40, 70, t)).toBe('refer');
  });

  test('decline: low trust, low fhs', () => {
    expect(computeMatrixCell(40, 30, t)).toBe('decline');
  });

  test('null when scores missing', () => {
    expect(computeMatrixCell(null, 70, t)).toBeNull();
    expect(computeMatrixCell(80, null, t)).toBeNull();
  });
});

describe('scoreToBand', () => {
  test('strong for 80+', () => expect(scoreToBand(80)).toBe('strong'));
  test('strong for 100', () => expect(scoreToBand(100)).toBe('strong'));
  test('building for 50-79', () => expect(scoreToBand(50)).toBe('building'));
  test('building for 79', () => expect(scoreToBand(79)).toBe('building'));
  test('low for 0-49', () => expect(scoreToBand(49)).toBe('low'));
  test('low for 0', () => expect(scoreToBand(0)).toBe('low'));
});

describe('computeCoachingPriority', () => {
  test('high when not ready', () => expect(computeCoachingPriority('not_ready', 'low')).toBe('high'));
  test('high when needs data', () => expect(computeCoachingPriority('needs_data', null)).toBe('high'));
  test('high when almost ready with low trust', () => expect(computeCoachingPriority('almost_ready', 'low')).toBe('high'));
  test('medium when almost ready with building trust', () => expect(computeCoachingPriority('almost_ready', 'building')).toBe('medium'));
  test('low when ready', () => expect(computeCoachingPriority('ready', 'strong')).toBe('low'));
});

// ─── Role projection tests ────────────────────────────────────────

describe('getLoanReadinessState — farmer role', () => {
  test('returns state, trust band, fhs band, reasons, stalenessFlags', async () => {
    const result = await getLoanReadinessState(FARMER_ID, { role: 'farmer', showNumericScores: false });

    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('trust.band');
    expect(result).toHaveProperty('financialHealth.band');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('stalenessFlags');
    expect(['ready', 'almost_ready', 'not_ready', 'needs_data']).toContain(result.state);
  });

  test('omits numeric scores when showNumericScores is false', async () => {
    const result = await getLoanReadinessState(FARMER_ID, { role: 'farmer', showNumericScores: false });

    expect(result.trust).not.toHaveProperty('score');
    expect(result.financialHealth).not.toHaveProperty('score');
  });

  test('includes numeric scores when showNumericScores is true', async () => {
    const result = await getLoanReadinessState(FARMER_ID, { role: 'farmer', showNumericScores: true });

    expect(result.trust).toHaveProperty('score');
    expect(result.financialHealth).toHaveProperty('score');
    expect(typeof result.trust.score).toBe('number');
    expect(typeof result.financialHealth.score).toBe('number');
  });
});

describe('getLoanReadinessState — sathi role', () => {
  test('returns state, trust score, coachingPriority — no FHS fields', async () => {
    const result = await getLoanReadinessState(FARMER_ID, { role: 'sathi' });

    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('trust');
    expect(result).toHaveProperty('coachingPriority');
    expect(['high', 'medium', 'low']).toContain(result.coachingPriority);
    expect(result.trust).toHaveProperty('score');
    expect(result.trust).toHaveProperty('band');
  });

  test('FHS fields are completely absent (not null — absent)', async () => {
    const result = await getLoanReadinessState(FARMER_ID, { role: 'sathi' });

    expect(result).not.toHaveProperty('financialHealth');
    expect(result).not.toHaveProperty('fhs');
    expect(result).not.toHaveProperty('matrixCell');
  });

  test('serialized JSON does not contain FHS-related strings', async () => {
    const result = await getLoanReadinessState(FARMER_ID, { role: 'sathi' });
    const json = JSON.stringify(result);

    expect(json).not.toContain('"fhs"');
    expect(json).not.toContain('"financialHealth"');
    expect(json).not.toContain('"transactionCount"');
    expect(json).not.toContain('"analysisMode"');
    expect(json).not.toContain('"components"');
    expect(json).not.toContain('"cashFlowStability"');
  });

  test('staleness only includes trust, not fhs', async () => {
    const result = await getLoanReadinessState(FARMER_ID, { role: 'sathi' });

    expect(result.stalenessFlags).toHaveProperty('trust');
    expect(result.stalenessFlags).not.toHaveProperty('fhs');
  });
});

describe('getLoanReadinessState — banker role', () => {
  test('returns all fields plus matrixCell and recommendedAction', async () => {
    const result = await getLoanReadinessState(FARMER_ID, { role: 'banker' });

    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('trust.score');
    expect(result).toHaveProperty('trust.band');
    expect(result).toHaveProperty('trust.sectionScores');
    expect(result).toHaveProperty('financialHealth.score');
    expect(result).toHaveProperty('financialHealth.band');
    expect(result).toHaveProperty('financialHealth.grade');
    expect(result).toHaveProperty('financialHealth.components');
    expect(result).toHaveProperty('matrixCell');
    expect(result).toHaveProperty('recommendedAction');
    expect(result).toHaveProperty('thresholds');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('stalenessFlags');
  });

  test('matrixCell is one of the valid enum values', async () => {
    const result = await getLoanReadinessState(FARMER_ID, { role: 'banker' });

    expect(['approve', 'conditional', 'refer', 'decline']).toContain(result.matrixCell);
  });

  test('thresholds are exposed', async () => {
    const result = await getLoanReadinessState(FARMER_ID, { role: 'banker' });

    expect(result.thresholds).toHaveProperty('trustCutoff');
    expect(result.thresholds).toHaveProperty('fhsCutoff');
    expect(typeof result.thresholds.trustCutoff).toBe('number');
    expect(typeof result.thresholds.fhsCutoff).toBe('number');
  });
});

// ─── Cache tests ──────────────────────────────────────────────────

describe('caching', () => {
  test('cache key includes role — separate entries per role', async () => {
    await getLoanReadinessState(FARMER_ID, { role: 'farmer', showNumericScores: false });
    await getLoanReadinessState(FARMER_ID, { role: 'sathi' });
    await getLoanReadinessState(FARMER_ID, { role: 'banker' });

    expect(mockRedisStore).toHaveProperty(`readiness:${FARMER_ID}:farmer:false`);
    expect(mockRedisStore).toHaveProperty(`readiness:${FARMER_ID}:sathi:false`);
    expect(mockRedisStore).toHaveProperty(`readiness:${FARMER_ID}:banker:false`);
  });

  test('farmer showNumericScores=true gets separate cache key', async () => {
    await getLoanReadinessState(FARMER_ID, { role: 'farmer', showNumericScores: false });
    await getLoanReadinessState(FARMER_ID, { role: 'farmer', showNumericScores: true });

    expect(mockRedisStore).toHaveProperty(`readiness:${FARMER_ID}:farmer:false`);
    expect(mockRedisStore).toHaveProperty(`readiness:${FARMER_ID}:farmer:true`);
  });
});

// ─── Error handling ───────────────────────────────────────────────

describe('error handling', () => {
  test('throws on missing farmerId', async () => {
    await expect(getLoanReadinessState(null, { role: 'farmer' }))
      .rejects.toMatchObject({ statusCode: 400, errorCode: 'READINESS_INVALID_INPUT' });
  });

  test('throws on invalid role', async () => {
    await expect(getLoanReadinessState(FARMER_ID, { role: 'vendor' }))
      .rejects.toMatchObject({ statusCode: 400, errorCode: 'READINESS_INVALID_ROLE' });
  });
});
