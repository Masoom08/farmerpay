/**
 * TrustDecision — model structure tests.
 */

const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

const sequelize = new Sequelize({ dialect: 'mysql', host: 'localhost', database: 'test', username: 'test', password: 'test', logging: false });

const TrustDecision = require('../../../src/modules/trust/models/TrustDecision')(sequelize, DataTypes);

describe('TrustDecision', () => {
  const attrs = TrustDecision.getAttributes();

  test('table name is trust_decisions', () => {
    expect(TrustDecision.getTableName()).toBe('trust_decisions');
  });

  test('has decision_uuid (unique, required)', () => {
    expect(attrs.decision_uuid).toBeDefined();
    expect(attrs.decision_uuid.allowNull).toBe(false);
    expect(attrs.decision_uuid.unique).toBe(true);
  });

  test('has score_history_id FK (required)', () => {
    expect(attrs.score_history_id).toBeDefined();
    expect(attrs.score_history_id.allowNull).toBe(false);
  });

  test('has banker_id FK (required)', () => {
    expect(attrs.banker_id).toBeDefined();
    expect(attrs.banker_id.allowNull).toBe(false);
  });

  test('has decision ENUM with SANCTION/RECONSIDER/REJECT', () => {
    expect(attrs.decision).toBeDefined();
    expect(attrs.decision.allowNull).toBe(false);
    const type = attrs.decision.type;
    const values = type.values || type.options?.values;
    expect(values).toEqual(['SANCTION', 'RECONSIDER', 'REJECT']);
  });

  test('has reason_code ENUM (nullable)', () => {
    expect(attrs.reason_code).toBeDefined();
    expect(attrs.reason_code.allowNull).toBe(true);
    const type = attrs.reason_code.type;
    const values = type.values || type.options?.values;
    expect(values).toEqual(expect.arrayContaining([
      'BELOW_THRESHOLD', 'ADVERSE_CIBIL', 'FIELD_PENDING', 'POLICY_EXCEPTION', 'OTHER',
    ]));
  });

  test('has reason_text (nullable)', () => {
    expect(attrs.reason_text).toBeDefined();
    expect(attrs.reason_text.allowNull).toBe(true);
  });

  test('has cibil_acknowledged with default false', () => {
    expect(attrs.cibil_acknowledged).toBeDefined();
    expect(attrs.cibil_acknowledged.defaultValue).toBe(false);
  });

  test('is immutable (no updatedAt)', () => {
    expect(TrustDecision.options.updatedAt).toBe(false);
  });

  test('has unique constraint on (score_history_id, banker_id)', () => {
    const indexes = TrustDecision.options.indexes;
    const uq = indexes.find(i => i.unique && i.name === 'uq_decision_snapshot_banker');
    expect(uq).toBeDefined();
    expect(uq.fields).toEqual(['score_history_id', 'banker_id']);
  });
});
