/**
 * Livelihood Readthrough — tests.
 * P3 (Income) reads from trust_farmer_activity_mix.
 * Seed two activities (CROP 0.7, DAIRY 0.3) and assert the scorer reflects both.
 */

const { SCORERS } = require('../../../src/modules/trust/services/pillarEngine');

describe('P3 livelihood readthrough', () => {
  const makeSection = () => ({
    id: 3,
    section_code: 'FINANCIAL_LITERACY',
    pillar_code: 'P3',
    weight_in_total_score: 15,
    max_points: 100,
    questions: [{
      id: 1,
      question_type: 'yes_no',
      is_active: true,
      choices: [
        { points_awarded: 10, is_active: true },
        { points_awarded: 0, is_active: true },
      ],
      conditions: [],
      scoringRanges: [],
    }],
  });

  test('two activities (CROP 70%, DAIRY 30%) reflected in income diversity band', () => {
    const evidence = {
      section: makeSection(),
      sectionCode: 'FINANCIAL_LITERACY',
      pillarCode: 'P3',
      responses: [{ question_id: 1, choiceResponses: [{ choice: { points_awarded: 10 } }], numericResponse: null }],
      activities: [
        { activity_type: 'CROP', is_primary: true, is_active: true },
        { activity_type: 'DAIRY', is_primary: false, is_active: true },
      ],
      activityMix: [
        { activity_type: 'CROP', share_percent: 70, estimated_annual_income_inr: 200000, is_active: true },
        { activity_type: 'DAIRY', share_percent: 30, estimated_annual_income_inr: 80000, is_active: true },
      ],
      expenses: [],
      liabilities: [],
      repayments: [],
      aaAnalysis: null,
      rootsLand: null,
    };

    const result = SCORERS.P3(evidence);

    // Should have income diversity feature band
    const diversityBand = result.featureBands.find((f) => f.feature === 'INCOME_DIVERSITY');
    expect(diversityBand).toBeDefined();
    expect(diversityBand.band).toBe(2); // 2 unique activity types
    expect(diversityBand.source).toBe('TRUST');

    // Score should be positive (questionnaire base + diversity bonus)
    expect(result.normalizedScore).toBeGreaterThan(0);
    expect(result.status).toBe('COMPLETE');
  });

  test('single activity type gives diversity band of 1', () => {
    const evidence = {
      section: makeSection(),
      sectionCode: 'FINANCIAL_LITERACY',
      pillarCode: 'P3',
      responses: [{ question_id: 1, choiceResponses: [{ choice: { points_awarded: 10 } }], numericResponse: null }],
      activities: [{ activity_type: 'CROP', is_primary: true, is_active: true }],
      activityMix: [
        { activity_type: 'CROP', share_percent: 100, estimated_annual_income_inr: 300000 },
      ],
      expenses: [],
      liabilities: [],
      repayments: [],
      aaAnalysis: null,
      rootsLand: null,
    };

    const result = SCORERS.P3(evidence);
    const diversityBand = result.featureBands.find((f) => f.feature === 'INCOME_DIVERSITY');
    expect(diversityBand).toBeDefined();
    expect(diversityBand.band).toBe(1);
  });

  test('no activity mix → no diversity band', () => {
    const evidence = {
      section: makeSection(),
      sectionCode: 'FINANCIAL_LITERACY',
      pillarCode: 'P3',
      responses: [{ question_id: 1, choiceResponses: [{ choice: { points_awarded: 10 } }], numericResponse: null }],
      activities: [],
      activityMix: [],
      expenses: [],
      liabilities: [],
      repayments: [],
      aaAnalysis: null,
      rootsLand: null,
    };

    const result = SCORERS.P3(evidence);
    expect(result.featureBands.find((f) => f.feature === 'INCOME_DIVERSITY')).toBeUndefined();
  });
});
