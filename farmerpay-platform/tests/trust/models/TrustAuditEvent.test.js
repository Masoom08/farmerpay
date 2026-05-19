/**
 * TrustAuditEvent — model structure tests.
 */

const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

const sequelize = new Sequelize({ dialect: 'mysql', host: 'localhost', database: 'test', username: 'test', password: 'test', logging: false });

const TrustAuditEvent = require('../../../src/modules/trust/models/TrustAuditEvent')(sequelize, DataTypes);

describe('TrustAuditEvent', () => {
  const attrs = TrustAuditEvent.getAttributes();

  test('table name is trust_audit_events', () => {
    expect(TrustAuditEvent.getTableName()).toBe('trust_audit_events');
  });

  test('has event_uuid (unique, required)', () => {
    expect(attrs.event_uuid).toBeDefined();
    expect(attrs.event_uuid.allowNull).toBe(false);
    expect(attrs.event_uuid.unique).toBe(true);
  });

  test('id is BIGINT', () => {
    expect(attrs.id).toBeDefined();
    // BIGINT should be used for high-volume audit
    expect(attrs.id.type instanceof DataTypes.BIGINT).toBe(true);
  });

  test('has farmer_id FK (required)', () => {
    expect(attrs.farmer_id).toBeDefined();
    expect(attrs.farmer_id.allowNull).toBe(false);
  });

  test('has actor_type ENUM', () => {
    const type = attrs.actor_type.type;
    const values = type.values || type.options?.values;
    expect(values).toEqual(expect.arrayContaining(['BANKER', 'SATHI', 'SYSTEM', 'FARMER']));
  });

  test('has actor_id (nullable — system actions have no actor)', () => {
    expect(attrs.actor_id).toBeDefined();
    expect(attrs.actor_id.allowNull).toBe(true);
  });

  test('has action (required string)', () => {
    expect(attrs.action).toBeDefined();
    expect(attrs.action.allowNull).toBe(false);
  });

  test('has payload JSON (nullable)', () => {
    expect(attrs.payload).toBeDefined();
    expect(attrs.payload.allowNull).toBe(true);
  });

  test('has score_history_id FK (nullable)', () => {
    expect(attrs.score_history_id).toBeDefined();
    expect(attrs.score_history_id.allowNull).toBe(true);
  });

  test('is immutable (no updatedAt)', () => {
    expect(TrustAuditEvent.options.updatedAt).toBe(false);
  });
});
