/**
 * Pillar Engine — unit tests.
 * Each P1..P6 scorer runs on a seeded evidence bundle.
 */

const { SCORERS, assertWeightsSum } = require('../../../src/modules/trust/services/pillarEngine');

// ── Helpers ──────────────────────────────────────────────────────
const makeSection = (code, pillarCode, weight, questions = []) => ({
  id: Math.floor(Math.random() * 1000),
  section_code: code,
  pillar_code: pillarCode,
  weight_in_total_score: weight,
  max_points: 100,
  questions: questions.map((q, i) => ({
    id: i + 1,
    question_type: 'yes_no',
    is_active: true,
    choices: [
      { points_awarded: 10, is_active: true, choice_value: 'yes' },
      { points_awarded: 0, is_active: true, choice_value: 'no' },
    ],
    conditions: [],
    scoringRanges: [],
    ...q,
  })),
});

const makeResponse = (questionId, choicePoints = 10) => ({
  question_id: questionId,
  choiceResponses: [{ choice: { points_awarded: choicePoints } }],
  numericResponse: null,
});

const baseEvidence = (pillarCode, sectionCode, weight = 15, extras = {}) => ({
  section: makeSection(sectionCode, pillarCode, weight, [{}]),
  sectionCode,
  pillarCode,
  responses: [makeResponse(1, 10)],
  activities: [],
  activityMix: [],
  expenses: [],
  liabilities: [],
  repayments: [],
  aaAnalysis: null,
  rootsLand: null,
  ...extras,
});

// ── P1 ───────────────────────────────────────────────────────────
describe('P1 — Personal Profile', () => {
  test('scores from questionnaire responses', () => {
    const result = SCORERS.P1(baseEvidence('P1', 'PERSONAL_PROFILE'));
    expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
    expect(result.normalizedScore).toBeLessThanOrEqual(100);
    expect(result.status).toBe('COMPLETE');
  });

  test('returns MISSING when no questions', () => {
    const evidence = baseEvidence('P1', 'PERSONAL_PROFILE');
    evidence.section.questions = [];
    evidence.responses = [];
    const result = SCORERS.P1(evidence);
    expect(result.status).toBe('MISSING');
  });
});

// ── P2 ───────────────────────────────────────────────────────────
describe('P2 — Farm Details', () => {
  test('includes ROOTS land bonus', () => {
    const withLand = baseEvidence('P2', 'FARM_DETAILS', 20, {
      rootsLand: [{ id: 1 }, { id: 2 }],
      activities: [{ activity_type: 'CROP' }],
    });
    const withoutLand = baseEvidence('P2', 'FARM_DETAILS', 20);

    const scoreLand = SCORERS.P2(withLand);
    const scoreNoLand = SCORERS.P2(withoutLand);

    expect(scoreLand.rawPoints).toBeGreaterThan(scoreNoLand.rawPoints);
    expect(scoreLand.featureBands.some((f) => f.source === 'ROOTS')).toBe(true);
  });

  test('status COMPLETE when responses exist', () => {
    const result = SCORERS.P2(baseEvidence('P2', 'FARM_DETAILS', 20));
    expect(result.status).toBe('COMPLETE');
  });
});

// ── P3 ───────────────────────────────────────────────────────────
describe('P3 — Financial Literacy / Income', () => {
  test('income diversity bonus from activityMix', () => {
    const evidence = baseEvidence('P3', 'FINANCIAL_LITERACY', 15, {
      activityMix: [
        { activity_type: 'CROP', share_percent: 70 },
        { activity_type: 'DAIRY', share_percent: 30 },
      ],
    });
    const result = SCORERS.P3(evidence);
    expect(result.featureBands.some((f) => f.feature === 'INCOME_DIVERSITY')).toBe(true);
    expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
  });

  test('AA financial health adds to score', () => {
    const evidence = baseEvidence('P3', 'FINANCIAL_LITERACY', 15, {
      aaAnalysis: { overall_score: 75, analysis_uuid: 'aa-123' },
    });
    const result = SCORERS.P3(evidence);
    expect(result.featureBands.some((f) => f.source === 'AA')).toBe(true);
  });

  test('livelihood readthrough: two activities reflected', () => {
    const evidence = baseEvidence('P3', 'FINANCIAL_LITERACY', 15, {
      activityMix: [
        { activity_type: 'CROP', share_percent: 70, estimated_annual_income_inr: 200000 },
        { activity_type: 'DAIRY', share_percent: 30, estimated_annual_income_inr: 80000 },
      ],
    });
    const result = SCORERS.P3(evidence);
    const diversityBand = result.featureBands.find((f) => f.feature === 'INCOME_DIVERSITY');
    expect(diversityBand).toBeDefined();
    expect(diversityBand.band).toBe(2); // 2 unique types
  });
});

// ── P4 ───────────────────────────────────────────────────────────
describe('P4 — Repayment Capacity', () => {
  test('repayment discipline bonus for good track record', () => {
    const evidence = baseEvidence('P4', 'REPAYMENT_CAPACITY', 20, {
      repayments: Array(20).fill(null).map(() => ({ status: 'PAID_ONTIME' })),
      liabilities: [{ outstanding_inr: 100000 }],
    });
    const result = SCORERS.P4(evidence);
    expect(result.featureBands.some((f) => f.feature === 'REPAYMENT_DISCIPLINE')).toBe(true);
    const discipline = result.featureBands.find((f) => f.feature === 'REPAYMENT_DISCIPLINE');
    expect(discipline.band).toBe(5); // 100% on-time
  });

  test('high liability load reduces score', () => {
    const highDebt = baseEvidence('P4', 'REPAYMENT_CAPACITY', 20, {
      liabilities: [{ outstanding_inr: 600000 }],
    });
    const lowDebt = baseEvidence('P4', 'REPAYMENT_CAPACITY', 20, {
      liabilities: [{ outstanding_inr: 30000 }],
    });
    const high = SCORERS.P4(highDebt);
    const low = SCORERS.P4(lowDebt);
    const highBand = high.featureBands.find((f) => f.feature === 'LIABILITY_LOAD');
    const lowBand = low.featureBands.find((f) => f.feature === 'LIABILITY_LOAD');
    expect(highBand.band).toBeLessThan(lowBand.band);
  });
});

// ── P5 ───────────────────────────────────────────────────────────
describe('P5 — Collateral', () => {
  test('land collateral bonus', () => {
    const evidence = baseEvidence('P5', 'COLLATERAL', 15, {
      rootsLand: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
    const result = SCORERS.P5(evidence);
    expect(result.featureBands.some((f) => f.feature === 'LAND_COLLATERAL')).toBe(true);
    expect(result.rawPoints).toBeGreaterThan(10); // base + bonus
  });
});

// ── P6 ───────────────────────────────────────────────────────────
describe('P6 — Network / References', () => {
  test('questionnaire-driven, returns 0-100', () => {
    const result = SCORERS.P6(baseEvidence('P6', 'NETWORK_REFERENCES'));
    expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
    expect(result.normalizedScore).toBeLessThanOrEqual(100);
  });
});

// ── Weights Assertion ────────────────────────────────────────────
describe('assertWeightsSum', () => {
  test('passes when weights sum to 100', () => {
    const sections = [
      { weight_in_total_score: 15 },
      { weight_in_total_score: 20 },
      { weight_in_total_score: 15 },
      { weight_in_total_score: 20 },
      { weight_in_total_score: 15 },
      { weight_in_total_score: 15 },
    ];
    expect(() => assertWeightsSum(sections)).not.toThrow();
  });

  test('passes with 100.05 (within ±0.1 tolerance)', () => {
    const sections = [
      { weight_in_total_score: 15.01 },
      { weight_in_total_score: 20.01 },
      { weight_in_total_score: 15.01 },
      { weight_in_total_score: 20.01 },
      { weight_in_total_score: 15.01 },
      { weight_in_total_score: 15 },
    ];
    expect(() => assertWeightsSum(sections)).not.toThrow();
  });

  test('throws when weights sum to 90', () => {
    const sections = [
      { weight_in_total_score: 15 },
      { weight_in_total_score: 15 },
      { weight_in_total_score: 15 },
      { weight_in_total_score: 15 },
      { weight_in_total_score: 15 },
      { weight_in_total_score: 15 },
    ];
    expect(() => assertWeightsSum(sections)).toThrow('weights sum to 90');
  });
});
