/**
 * AaConsentAuditLog Model
 * Immutable RBI compliance audit trail for consent lifecycle events.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AaConsentAuditLog extends Model {
    static associate(models) {
      AaConsentAuditLog.belongsTo(models.AaConsent, { foreignKey: 'consent_id', as: 'consent' });
      AaConsentAuditLog.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  AaConsentAuditLog.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      consent_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'aa_consents', key: 'id' },
      },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      event_type: {
        type: DataTypes.ENUM(
          'consent_requested', 'consent_approved', 'consent_rejected',
          'consent_revoked', 'consent_expired', 'data_fetched',
          'data_fetch_failed', 'analysis_run', 'consent_renewed'
        ),
        allowNull: false,
      },
      event_source: {
        type: DataTypes.ENUM('farmer', 'system', 'webhook', 'admin', 'scheduler'),
        allowNull: false,
      },
      provider: { type: DataTypes.STRING(20), allowNull: true },
      metadata: { type: DataTypes.JSON, allowNull: true },
      ip_address: { type: DataTypes.STRING(45), allowNull: true },
    },
    {
      sequelize, modelName: 'AaConsentAuditLog', tableName: 'aa_consent_audit_logs',
      timestamps: true, updatedAt: false, underscored: true,
      indexes: [
        { fields: ['consent_id'] },
        { fields: ['farmer_id'] },
        { fields: ['event_type'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return AaConsentAuditLog;
};
