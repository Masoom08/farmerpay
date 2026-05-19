/**
 * ReadinessDecisionAuditLog Model
 * Immutable audit trail for banker views of the loan decisioning matrix.
 * Every banker GET /readiness/:farmerUuid creates exactly one row.
 *
 * No update paths — records are write-once for regulatory compliance.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ReadinessDecisionAuditLog extends Model {
    static associate(models) {
      ReadinessDecisionAuditLog.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      ReadinessDecisionAuditLog.belongsTo(models.User, { foreignKey: 'banker_user_id', as: 'banker' });
    }
  }

  ReadinessDecisionAuditLog.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      banker_user_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      trust_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      fhs_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      matrix_cell: {
        type: DataTypes.ENUM('approve', 'conditional', 'refer', 'decline'),
        allowNull: true,
      },
      recommended_action: { type: DataTypes.STRING(255), allowNull: true },
      scenarios_applied: { type: DataTypes.JSON, allowNull: true },
      ip: { type: DataTypes.STRING(45), allowNull: true },
      user_agent: { type: DataTypes.STRING(512), allowNull: true },
      viewed_at: {
        type: DataTypes.DATE, allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'ReadinessDecisionAuditLog',
      tableName: 'readiness_decision_audit_logs',
      timestamps: true,
      updatedAt: false, // Immutable — no updates
      underscored: true,
      indexes: [
        { fields: ['farmer_id'] },
        { fields: ['banker_user_id'] },
        { fields: ['viewed_at'] },
        { fields: ['matrix_cell'] },
      ],
    }
  );

  return ReadinessDecisionAuditLog;
};
