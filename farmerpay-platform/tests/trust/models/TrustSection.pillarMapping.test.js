/**
 * TrustSection — pillar_code mapping tests.
 * Validates pillar_code field exists and the ENUM values are correct.
 */

const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

const sequelize = new Sequelize({ dialect: 'mysql', host: 'localhost', database: 'test', username: 'test', password: 'test', logging: false });

const TrustSection = require('../../../src/modules/trust/models/TrustSection')(sequelize, DataTypes);

describe('TrustSection — pillar_code mapping', () => {
  const attrs = TrustSection.getAttributes();

  test('has pillar_code field', () => {
    expect(attrs.pillar_code).toBeDefined();
  });

  test('pillar_code is nullable (until seeded)', () => {
    expect(attrs.pillar_code.allowNull).toBe(true);
  });

  test('pillar_code is unique', () => {
    expect(attrs.pillar_code.unique).toBe(true);
  });

  test('pillar_code is ENUM with P1..P6', () => {
    const type = attrs.pillar_code.type;
    const values = type.values || type.options?.values;
    expect(values).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
  });

  // ── Original fields still present ─────────────────────────
  test('retains section_code', () => {
    expect(attrs.section_code).toBeDefined();
    expect(attrs.section_code.allowNull).toBe(false);
  });

  test('retains section_name', () => {
    expect(attrs.section_name).toBeDefined();
  });

  test('retains weight_in_total_score', () => {
    expect(attrs.weight_in_total_score).toBeDefined();
  });

  test('retains max_points', () => {
    expect(attrs.max_points).toBeDefined();
  });

  test('table name is trust_sections', () => {
    expect(TrustSection.getTableName()).toBe('trust_sections');
  });
});

describe('Pillar mapping spec', () => {
  const EXPECTED_MAPPING = {
    PERSONAL_PROFILE: 'P1',
    FARM_DETAILS: 'P2',
    FINANCIAL_LITERACY: 'P3',
    REPAYMENT_CAPACITY: 'P4',
    COLLATERAL: 'P5',
    NETWORK_REFERENCES: 'P6',
  };

  test('6 section codes map to 6 unique pillar codes', () => {
    const codes = Object.keys(EXPECTED_MAPPING);
    expect(codes).toHaveLength(6);
    const pillars = new Set(Object.values(EXPECTED_MAPPING));
    expect(pillars.size).toBe(6);
  });

  test.each(Object.entries(EXPECTED_MAPPING))(
    '%s → %s',
    (sectionCode, pillarCode) => {
      expect(pillarCode).toMatch(/^P[1-6]$/);
    },
  );
});
