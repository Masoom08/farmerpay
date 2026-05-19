/**
 * TrustEvidence — model structure tests.
 */

const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

const sequelize = new Sequelize({ dialect: 'mysql', host: 'localhost', database: 'test', username: 'test', password: 'test', logging: false });

const TrustEvidence = require('../../../src/modules/trust/models/TrustEvidence')(sequelize, DataTypes);

describe('TrustEvidence', () => {
  const attrs = TrustEvidence.getAttributes();

  test('table name is trust_evidence', () => {
    expect(TrustEvidence.getTableName()).toBe('trust_evidence');
  });

  test('has evidence_uuid (unique, required)', () => {
    expect(attrs.evidence_uuid).toBeDefined();
    expect(attrs.evidence_uuid.allowNull).toBe(false);
    expect(attrs.evidence_uuid.unique).toBe(true);
  });

  test('has farmer_id FK', () => {
    expect(attrs.farmer_id).toBeDefined();
    expect(attrs.farmer_id.allowNull).toBe(false);
  });

  test('has score_history_id FK', () => {
    expect(attrs.score_history_id).toBeDefined();
    expect(attrs.score_history_id.allowNull).toBe(false);
  });

  test('has pillar_code ENUM P1..P6', () => {
    expect(attrs.pillar_code).toBeDefined();
    expect(attrs.pillar_code.allowNull).toBe(false);
    const type = attrs.pillar_code.type;
    expect(type.values || type.options?.values).toEqual(
      expect.arrayContaining(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']),
    );
  });

  test('has feature_code (required)', () => {
    expect(attrs.feature_code).toBeDefined();
    expect(attrs.feature_code.allowNull).toBe(false);
  });

  test('has band (TINYINT, required)', () => {
    expect(attrs.band).toBeDefined();
    expect(attrs.band.allowNull).toBe(false);
  });

  test('has source ENUM of external sources only', () => {
    expect(attrs.source).toBeDefined();
    const type = attrs.source.type;
    const values = type.values || type.options?.values;
    expect(values).toEqual(expect.arrayContaining(['AA', 'CIBIL', 'ROOTS', 'POP', 'PMFBY']));
    // Must NOT include SATHI, FARMER_DECLARED, AGENT_VERIFIED
    expect(values).not.toContain('SATHI');
    expect(values).not.toContain('FARMER_DECLARED');
  });

  test('has confidence ENUM with default HIGH', () => {
    expect(attrs.confidence).toBeDefined();
    expect(attrs.confidence.defaultValue).toBe('HIGH');
  });

  test('has fetched_at (required)', () => {
    expect(attrs.fetched_at).toBeDefined();
    expect(attrs.fetched_at.allowNull).toBe(false);
  });

  test('has is_active with default true', () => {
    expect(attrs.is_active).toBeDefined();
    expect(attrs.is_active.defaultValue).toBe(true);
  });
});
