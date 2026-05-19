/**
 * Group Rollup — pure function tests.
 * Table-driven: DEMO=P1, OPS=P2+P3, ASSET=P4+P5, EXT=P6.
 */

const { rollupGroups } = require('../../../src/modules/trust/services/groupRollup');

// Fixture: section_scores JSON using pillar codes
const FIXTURE_BY_PILLAR = {
  P1: { score: 80, weight: 0.15, contribution: 120 },
  P2: { score: 70, weight: 0.20, contribution: 140 },
  P3: { score: 60, weight: 0.15, contribution: 90 },
  P4: { score: 50, weight: 0.20, contribution: 100 },
  P5: { score: 40, weight: 0.15, contribution: 60 },
  P6: { score: 90, weight: 0.15, contribution: 135 },
};

// Fixture: section_scores JSON using section codes (legacy format)
const FIXTURE_BY_SECTION = {
  PERSONAL_PROFILE: { score: 80, weight: 0.15, contribution: 120 },
  FARM_DETAILS: { score: 70, weight: 0.20, contribution: 140 },
  FINANCIAL_LITERACY: { score: 60, weight: 0.15, contribution: 90 },
  REPAYMENT_CAPACITY: { score: 50, weight: 0.20, contribution: 100 },
  COLLATERAL: { score: 40, weight: 0.15, contribution: 60 },
  NETWORK_REFERENCES: { score: 90, weight: 0.15, contribution: 135 },
};

describe('rollupGroups', () => {
  test('returns 4 groups: DEMO, OPS, ASSET, EXT', () => {
    const groups = rollupGroups(FIXTURE_BY_PILLAR);
    expect(groups).toHaveLength(4);
    expect(groups.map((g) => g.groupCode)).toEqual(['DEMO', 'OPS', 'ASSET', 'EXT']);
  });

  test('DEMO = P1 only → score = 80', () => {
    const groups = rollupGroups(FIXTURE_BY_PILLAR);
    const demo = groups.find((g) => g.groupCode === 'DEMO');
    expect(demo.score).toBe(80);
    expect(demo.pillars).toEqual(['P1']);
  });

  test('OPS = weighted avg of P2(70) + P3(60)', () => {
    const groups = rollupGroups(FIXTURE_BY_PILLAR);
    const ops = groups.find((g) => g.groupCode === 'OPS');
    // Weighted: (70*0.20 + 60*0.15) / (0.20+0.15) = (14+9)/0.35 = 65.71 → 66
    expect(ops.score).toBe(66);
    expect(ops.pillars).toEqual(['P2', 'P3']);
  });

  test('ASSET = weighted avg of P4(50) + P5(40)', () => {
    const groups = rollupGroups(FIXTURE_BY_PILLAR);
    const asset = groups.find((g) => g.groupCode === 'ASSET');
    // Weighted: (50*0.20 + 40*0.15) / (0.20+0.15) = (10+6)/0.35 = 45.71 → 46
    expect(asset.score).toBe(46);
    expect(asset.pillars).toEqual(['P4', 'P5']);
  });

  test('EXT = P6 only → score = 90', () => {
    const groups = rollupGroups(FIXTURE_BY_PILLAR);
    const ext = groups.find((g) => g.groupCode === 'EXT');
    expect(ext.score).toBe(90);
    expect(ext.pillars).toEqual(['P6']);
  });

  test('handles section_code keys (legacy format)', () => {
    const groups = rollupGroups(FIXTURE_BY_SECTION);
    expect(groups).toHaveLength(4);
    expect(groups.find((g) => g.groupCode === 'DEMO').score).toBe(80);
    expect(groups.find((g) => g.groupCode === 'EXT').score).toBe(90);
  });

  test('deltaVsBenchmark computed when benchmarks provided', () => {
    const groups = rollupGroups(FIXTURE_BY_PILLAR, { benchmarks: { DEMO: 70, OPS: 60, ASSET: 50, EXT: 85 } });
    expect(groups.find((g) => g.groupCode === 'DEMO').deltaVsBenchmark).toBe(10); // 80-70
    expect(groups.find((g) => g.groupCode === 'EXT').deltaVsBenchmark).toBe(5);  // 90-85
  });

  test('deltaVsBenchmark is null when no benchmarks', () => {
    const groups = rollupGroups(FIXTURE_BY_PILLAR);
    groups.forEach((g) => expect(g.deltaVsBenchmark).toBeNull());
  });

  test('returns empty array for null/undefined input', () => {
    expect(rollupGroups(null)).toEqual([]);
    expect(rollupGroups(undefined)).toEqual([]);
  });

  test('handles partial data (missing pillars → group score 0)', () => {
    const partial = { P1: { score: 80, weight: 0.15, contribution: 120 } };
    const groups = rollupGroups(partial);
    expect(groups.find((g) => g.groupCode === 'DEMO').score).toBe(80);
    expect(groups.find((g) => g.groupCode === 'OPS').score).toBe(0);
  });
});
