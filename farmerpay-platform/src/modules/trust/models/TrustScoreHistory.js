const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustScoreHistory extends Model {
    static associate(models) {
      TrustScoreHistory.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      // TRUST v2 associations
      TrustScoreHistory.hasMany(models.TrustEvidence, { foreignKey: 'score_history_id', as: 'evidence' });
      TrustScoreHistory.hasMany(models.TrustDecision, { foreignKey: 'score_history_id', as: 'decisions' });
      TrustScoreHistory.hasMany(models.TrustAuditEvent, { foreignKey: 'score_history_id', as: 'auditEvents' });
      TrustScoreHistory.belongsTo(models.TrustScoreHistory, { as: 'previous', foreignKey: 'previous_snapshot_id' });
    }
  }
  TrustScoreHistory.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    score_history_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    total_trust_score: { type: DataTypes.INTEGER, defaultValue: 0 },
    score_band: { type: DataTypes.ENUM('poor', 'fair', 'good', 'excellent'), defaultValue: 'poor' },
    score_band_min: { type: DataTypes.INTEGER, allowNull: true },
    score_band_max: { type: DataTypes.INTEGER, allowNull: true },
    section_scores: { type: DataTypes.JSON, allowNull: true, comment: 'Per-section breakdown' },
    calculated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    // ── TRUST v2 columns ─────────────────────────────────
    total_score_1000: { type: DataTypes.INTEGER, allowNull: true, comment: 'TRUST v2 score on 0-1000 scale' },
    decision: { type: DataTypes.ENUM('SANCTION', 'RECONSIDER', 'REJECT'), allowNull: true },
    cibil_flag: { type: DataTypes.BOOLEAN, defaultValue: false },
    cibil_overdue_inr: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    cibil_overdue_issuer: { type: DataTypes.STRING(120), allowNull: true },
    inputs_fingerprint: { type: DataTypes.STRING(64), allowNull: true, comment: 'SHA-256 of scoring inputs' },
    previous_snapshot_id: {
      type: DataTypes.INTEGER, allowNull: true,
      references: { model: 'trust_score_history', key: 'id' },
    },
  }, {
    sequelize, modelName: 'TrustScoreHistory', tableName: 'trust_score_history',
    timestamps: true, underscored: true,
    // Append-only contract. `is_active` IS flipped when a newer snapshot
    // supersedes this one, but score fields (total_score_1000, decision,
    // section_scores, cibil_flag) must never change post-insert — the
    // integrity hash on downstream TrustDecision rows depends on the
    // snapshot being stable. Disabling updated_at makes accidental
    // mutation visible in code review.
    updatedAt: false,
    indexes: [
      { fields: ['farmer_id'] },
      { fields: ['farmer_id', 'is_active', 'calculated_at'], name: 'idx_trust_history_farmer_active_calc' },
    ],
  });
  return TrustScoreHistory;
};
