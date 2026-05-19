/**
 * TrustScoreHistory v2 extension — model structure tests.
 * Validates new v2 fields exist alongside original fields.
 */

const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

// Create an in-memory SQLite instance for model validation
const sequelize = new Sequelize({ dialect: 'mysql', host: 'localhost', database: 'test', username: 'test', password: 'test', logging: false });

// Minimal User stub for FK resolution
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
}, { tableName: 'users', timestamps: false });

const TrustScoreHistory = require('../../../src/modules/trust/models/TrustScoreHistory')(sequelize, DataTypes);

describe('TrustScoreHistory — v2 extension', () => {
  const attrs = TrustScoreHistory.getAttributes();

  // ── Original v1 fields still present ──────────────────────
  test('retains total_trust_score (v1)', () => {
    expect(attrs.total_trust_score).toBeDefined();
    expect(attrs.total_trust_score.defaultValue).toBe(0);
  });

  test('retains score_band (v1)', () => {
    expect(attrs.score_band).toBeDefined();
    const values = attrs.score_band.type.values;
    expect(values).toEqual(expect.arrayContaining(['poor', 'fair', 'good', 'excellent']));
  });

  test('retains score_history_uuid (v1)', () => {
    expect(attrs.score_history_uuid).toBeDefined();
    expect(attrs.score_history_uuid.allowNull).toBe(false);
  });

  test('retains section_scores JSON (v1)', () => {
    expect(attrs.section_scores).toBeDefined();
  });

  test('retains farmer_id FK (v1)', () => {
    expect(attrs.farmer_id).toBeDefined();
    expect(attrs.farmer_id.allowNull).toBe(false);
  });

  // ── New v2 fields ─────────────────────────────────────────
  test('has total_score_1000 (v2, nullable)', () => {
    expect(attrs.total_score_1000).toBeDefined();
    expect(attrs.total_score_1000.allowNull).toBe(true);
    expect(attrs.total_score_1000.type instanceof DataTypes.INTEGER).toBe(true);
  });

  test('has decision ENUM (v2, nullable)', () => {
    expect(attrs.decision).toBeDefined();
    expect(attrs.decision.allowNull).toBe(true);
    const values = attrs.decision.type.values;
    expect(values).toEqual(['SANCTION', 'RECONSIDER', 'REJECT']);
  });

  test('has cibil_flag (v2, default false)', () => {
    expect(attrs.cibil_flag).toBeDefined();
    expect(attrs.cibil_flag.defaultValue).toBe(false);
  });

  test('has cibil_overdue_inr (v2, nullable)', () => {
    expect(attrs.cibil_overdue_inr).toBeDefined();
    expect(attrs.cibil_overdue_inr.allowNull).toBe(true);
  });

  test('has cibil_overdue_issuer (v2, nullable)', () => {
    expect(attrs.cibil_overdue_issuer).toBeDefined();
    expect(attrs.cibil_overdue_issuer.allowNull).toBe(true);
  });

  test('has inputs_fingerprint (v2, nullable)', () => {
    expect(attrs.inputs_fingerprint).toBeDefined();
    expect(attrs.inputs_fingerprint.allowNull).toBe(true);
  });

  test('has previous_snapshot_id self-FK (v2)', () => {
    expect(attrs.previous_snapshot_id).toBeDefined();
    expect(attrs.previous_snapshot_id.allowNull).toBe(true);
  });

  // ── Table metadata ────────────────────────────────────────
  test('table name is trust_score_history', () => {
    expect(TrustScoreHistory.getTableName()).toBe('trust_score_history');
  });

  test('uses underscored: true', () => {
    expect(TrustScoreHistory.options.underscored).toBe(true);
  });

  test('has timestamps', () => {
    expect(TrustScoreHistory.options.timestamps).toBe(true);
  });
});
