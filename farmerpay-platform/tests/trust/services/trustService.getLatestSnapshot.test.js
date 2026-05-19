/**
 * trustService.getLatestSnapshot — tests.
 * Returns unioned evidence, previousScore + delta.
 */

jest.mock('../../../src/config/redis', () => ({
  setWithTTL: jest.fn().mockResolvedValue('OK'),
  getKey: jest.fn().mockResolvedValue(null),
  deleteKeys: jest.fn().mockResolvedValue(0),
  getRedisClient: jest.fn(() => ({
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
  })),
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

const mockSnapshot = {
  id: 99,
  score_history_uuid: 'snap-uuid-1',
  farmer_id: 42,
  total_trust_score: 65,
  total_score_1000: 650,
  score_band: 'good',
  decision: 'SANCTION',
  calculated_at: new Date('2026-03-01'),
  is_active: true,
  inputs_fingerprint: 'abc123',
  cibil_flag: false,
  cibil_overdue_inr: null,
  cibil_overdue_issuer: null,
  previous_snapshot_id: 88,
  section_scores: {
    P1: { score: 80, weight: 0.15, contribution: 120 },
    P2: { score: 70, weight: 0.20, contribution: 140 },
    P3: { score: 60, weight: 0.15, contribution: 90 },
    P4: { score: 50, weight: 0.20, contribution: 100 },
    P5: { score: 40, weight: 0.15, contribution: 60 },
    P6: { score: 90, weight: 0.15, contribution: 135 },
  },
};

const mockPrevSnapshot = { total_score_1000: 580 };

const mockCalculations = [
  { normalized_score: 80, raw_points: 80, max_possible_points: 100, contribution_to_total: 12, section: { pillar_code: 'P1', section_name: 'Personal', weight_in_total_score: 15, section_code: 'PERSONAL_PROFILE' } },
  { normalized_score: 70, raw_points: 70, max_possible_points: 100, contribution_to_total: 14, section: { pillar_code: 'P2', section_name: 'Farm', weight_in_total_score: 20, section_code: 'FARM_DETAILS' } },
  { normalized_score: 60, raw_points: 60, max_possible_points: 100, contribution_to_total: 9, section: { pillar_code: 'P3', section_name: 'Financial', weight_in_total_score: 15, section_code: 'FINANCIAL_LITERACY' } },
  { normalized_score: 50, raw_points: 50, max_possible_points: 100, contribution_to_total: 10, section: { pillar_code: 'P4', section_name: 'Repayment', weight_in_total_score: 20, section_code: 'REPAYMENT_CAPACITY' } },
  { normalized_score: 40, raw_points: 40, max_possible_points: 100, contribution_to_total: 6, section: { pillar_code: 'P5', section_name: 'Collateral', weight_in_total_score: 15, section_code: 'COLLATERAL' } },
  { normalized_score: 90, raw_points: 90, max_possible_points: 100, contribution_to_total: 13.5, section: { pillar_code: 'P6', section_name: 'Network', weight_in_total_score: 15, section_code: 'NETWORK_REFERENCES' } },
];

const mockExternalEvidence = [
  { pillar_code: 'P3', feature_code: 'AA_FINANCIAL_HEALTH', band: 4, source: 'AA', fetched_at: new Date(), raw_ref: null, confidence: 'HIGH', is_active: true },
];

const mockQuestionnaireResponses = [
  {
    question_id: 1,
    response_timestamp: new Date(),
    question: { id: 1, section: { pillar_code: 'P1', section_code: 'PERSONAL_PROFILE' } },
  },
];

jest.mock('../../../src/shared/models', () => ({
  TrustScoreHistory: {
    findOne: jest.fn().mockResolvedValue(mockSnapshot),
    findByPk: jest.fn().mockResolvedValue(mockPrevSnapshot),
  },
  TrustScoreCalculation: {
    findAll: jest.fn().mockResolvedValue(mockCalculations),
  },
  TrustSection: {},
  TrustEvidence: {
    findAll: jest.fn().mockResolvedValue(mockExternalEvidence),
  },
  TrustResponse: {
    findAll: jest.fn().mockResolvedValue(mockQuestionnaireResponses),
  },
  TrustQuestion: {},
}));

// Must require AFTER mocks are set up
const { getLatestSnapshot } = require('../../../src/modules/trust/services/trustService');

describe('getLatestSnapshot', () => {
  test('returns full DTO with unioned evidence (external + questionnaire)', async () => {
    const dto = await getLatestSnapshot(42);
    expect(dto.snapshotUuid).toBe('snap-uuid-1');
    expect(dto.score).toBe(650);
    expect(dto.legacyScore).toBe(65);
    expect(dto.decision).toBe('SANCTION');

    // Evidence should contain both external and questionnaire entries
    expect(dto.evidence.length).toBeGreaterThanOrEqual(2);
    expect(dto.evidence.some((e) => e.source === 'AA')).toBe(true);
    expect(dto.evidence.some((e) => e.source === 'QUESTIONNAIRE')).toBe(true);
  });

  test('computes previousScore and delta from previous_snapshot_id', async () => {
    const dto = await getLatestSnapshot(42);
    expect(dto.previousScore).toBe(580);
    expect(dto.delta).toBe(70); // 650 - 580
  });

  test('pillars sorted P1..P6', async () => {
    const dto = await getLatestSnapshot(42);
    const codes = dto.pillars.map((p) => p.code);
    expect(codes).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
  });

  test('groups are derived (4 groups)', async () => {
    const dto = await getLatestSnapshot(42);
    expect(dto.groups).toHaveLength(4);
    expect(dto.groups.map((g) => g.groupCode)).toEqual(['DEMO', 'OPS', 'ASSET', 'EXT']);
  });

  test('returns null when no active snapshot', async () => {
    const db = require('../../../src/shared/models');
    db.TrustScoreHistory.findOne.mockResolvedValueOnce(null);
    const result = await getLatestSnapshot(999);
    expect(result).toBeNull();
  });
});
