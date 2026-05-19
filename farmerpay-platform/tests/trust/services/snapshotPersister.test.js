/**
 * Snapshot Persister — tests.
 * Verifies transaction atomicity, row counts, and evidence filtering.
 */

jest.mock('../../../src/shared/models', () => {
  const rows = { history: [], calculations: [], evidence: [], audit: [] };

  const mockTransaction = {
    commit: jest.fn(),
    rollback: jest.fn(),
  };

  const TrustScoreHistory = {
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue([1]),
    create: jest.fn().mockImplementation((data) => {
      const row = { id: 99, ...data, created_at: new Date() };
      rows.history.push(row);
      return Promise.resolve(row);
    }),
  };

  const TrustScoreCalculation = {
    update: jest.fn().mockResolvedValue([6]),
    bulkCreate: jest.fn().mockImplementation((items) => {
      rows.calculations.push(...items);
      return Promise.resolve(items);
    }),
  };

  const TrustEvidence = {
    bulkCreate: jest.fn().mockImplementation((items) => {
      rows.evidence.push(...items);
      return Promise.resolve(items);
    }),
  };

  const TrustAuditEvent = {
    create: jest.fn().mockImplementation((data) => {
      const row = { id: 1, ...data };
      rows.audit.push(row);
      return Promise.resolve(row);
    }),
  };

  return {
    TrustScoreHistory,
    TrustScoreCalculation,
    TrustEvidence,
    TrustAuditEvent,
    sequelize: {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
    },
    __rows: rows,
    __mockTransaction: mockTransaction,
  };
});

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../../src/shared/utils/uuidHelper', () => {
  let counter = 0;
  return { generateUUID: jest.fn(() => `uuid-${++counter}`) };
});

const { persist } = require('../../../src/modules/trust/services/snapshotPersister');

const makeSections = () => [
  { id: 1, pillar_code: 'P1', section_code: 'PERSONAL_PROFILE', weight_in_total_score: 15 },
  { id: 2, pillar_code: 'P2', section_code: 'FARM_DETAILS', weight_in_total_score: 20 },
  { id: 3, pillar_code: 'P3', section_code: 'FINANCIAL_LITERACY', weight_in_total_score: 15 },
  { id: 4, pillar_code: 'P4', section_code: 'REPAYMENT_CAPACITY', weight_in_total_score: 20 },
  { id: 5, pillar_code: 'P5', section_code: 'COLLATERAL', weight_in_total_score: 15 },
  { id: 6, pillar_code: 'P6', section_code: 'NETWORK_REFERENCES', weight_in_total_score: 15 },
];

const makePillarResults = () => ({
  P1: { rawPoints: 80, maxPossiblePoints: 100, normalizedScore: 80 },
  P2: { rawPoints: 70, maxPossiblePoints: 100, normalizedScore: 70 },
  P3: { rawPoints: 60, maxPossiblePoints: 100, normalizedScore: 60 },
  P4: { rawPoints: 50, maxPossiblePoints: 100, normalizedScore: 50 },
  P5: { rawPoints: 40, maxPossiblePoints: 100, normalizedScore: 40 },
  P6: { rawPoints: 90, maxPossiblePoints: 100, normalizedScore: 90 },
});

const persistArgs = () => ({
  farmerId: 42,
  totalScore1000: 650,
  legacyScore: 65,
  legacyBand: 'good',
  decision: 'SANCTION',
  cibil: { flag: false, overdueInr: null, issuer: null },
  inputsFingerprint: 'abc123',
  sectionScoresJson: { P1: { score: 80, weight: 0.15, contribution: 120 } },
  pillarResults: makePillarResults(),
  sections: makeSections(),
  externalEvidenceItems: [
    { pillar_code: 'P3', feature_code: 'AA_FINANCIAL_HEALTH', band: 4, source: 'AA', fetched_at: new Date(), confidence: 'HIGH' },
  ],
  reason: 'test recompute',
});

beforeEach(() => {
  jest.clearAllMocks();
  const db = require('../../../src/shared/models');
  db.__rows.history = [];
  db.__rows.calculations = [];
  db.__rows.evidence = [];
  db.__rows.audit = [];
});

describe('snapshotPersister.persist', () => {
  test('creates exactly 6 trust_score_calculations rows', async () => {
    const db = require('../../../src/shared/models');
    await persist(persistArgs());
    expect(db.TrustScoreCalculation.bulkCreate).toHaveBeenCalledTimes(1);
    const created = db.TrustScoreCalculation.bulkCreate.mock.calls[0][0];
    expect(created).toHaveLength(6);
  });

  test('flips prior trust_score_history.is_active to false', async () => {
    const db = require('../../../src/shared/models');
    const priorRow = { id: 50 };
    db.TrustScoreHistory.findOne.mockResolvedValueOnce(priorRow);
    await persist(persistArgs());
    expect(db.TrustScoreHistory.update).toHaveBeenCalledWith(
      { is_active: false },
      expect.objectContaining({ where: { id: 50 } }),
    );
  });

  test('writes trust_evidence only for external sources (not questionnaire)', async () => {
    const db = require('../../../src/shared/models');
    await persist(persistArgs());
    expect(db.TrustEvidence.bulkCreate).toHaveBeenCalledTimes(1);
    const items = db.TrustEvidence.bulkCreate.mock.calls[0][0];
    items.forEach((item) => {
      expect(['AA', 'CIBIL', 'ROOTS', 'POP', 'PMFBY']).toContain(item.source);
    });
  });

  test('creates one audit event with action SNAPSHOT_CREATED', async () => {
    const db = require('../../../src/shared/models');
    await persist(persistArgs());
    expect(db.TrustAuditEvent.create).toHaveBeenCalledTimes(1);
    const auditCall = db.TrustAuditEvent.create.mock.calls[0][0];
    expect(auditCall.action).toBe('SNAPSHOT_CREATED');
    expect(auditCall.actor_type).toBe('SYSTEM');
  });

  test('rolls back on partial failure', async () => {
    const db = require('../../../src/shared/models');
    db.TrustScoreCalculation.bulkCreate.mockRejectedValueOnce(new Error('DB write failed'));
    await expect(persist(persistArgs())).rejects.toThrow('DB write failed');
    expect(db.__mockTransaction.rollback).toHaveBeenCalled();
  });

  test('sets previous_snapshot_id from prior active snapshot', async () => {
    const db = require('../../../src/shared/models');
    db.TrustScoreHistory.findOne.mockResolvedValueOnce({ id: 88 });
    await persist(persistArgs());
    const createCall = db.TrustScoreHistory.create.mock.calls[0][0];
    expect(createCall.previous_snapshot_id).toBe(88);
  });

  test('previous_snapshot_id is null when no prior snapshot', async () => {
    const db = require('../../../src/shared/models');
    db.TrustScoreHistory.findOne.mockResolvedValueOnce(null);
    await persist(persistArgs());
    const createCall = db.TrustScoreHistory.create.mock.calls[0][0];
    expect(createCall.previous_snapshot_id).toBeNull();
  });
});
