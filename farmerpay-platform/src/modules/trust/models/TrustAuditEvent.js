/**
 * TrustAuditEvent Model
 * Generic actor-action audit trail for banker / sathi / system actions.
 */
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustAuditEvent extends Model {
    static associate(models) {
      TrustAuditEvent.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      TrustAuditEvent.belongsTo(models.User, { foreignKey: 'actor_id', as: 'actor' });
      TrustAuditEvent.belongsTo(models.TrustScoreHistory, { foreignKey: 'score_history_id', as: 'scoreHistory' });
    }
  }
  TrustAuditEvent.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    event_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    actor_type: { type: DataTypes.ENUM('BANKER', 'SATHI', 'SYSTEM', 'FARMER'), allowNull: false },
    actor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
    action: { type: DataTypes.STRING(64), allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: true },
    score_history_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'trust_score_history', key: 'id' } },
  }, {
    sequelize, modelName: 'TrustAuditEvent', tableName: 'trust_audit_events',
    timestamps: true, underscored: true,
    updatedAt: false, // Audit events are immutable
    indexes: [
      { fields: ['farmer_id', 'created_at'], name: 'idx_audit_farmer_created' },
    ],
  });
  return TrustAuditEvent;
};
