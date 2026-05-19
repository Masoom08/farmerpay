/**
 * AaConsent Model
 * Account Aggregator consent management: FINVU, OneMoney, CAMS, NSDL.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AaConsent extends Model {
    static associate(models) {
      AaConsent.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      AaConsent.hasMany(models.AaBankStatementSummary, { foreignKey: 'consent_id', as: 'statements' });
      AaConsent.hasMany(models.AaTransaction, { foreignKey: 'consent_id', as: 'transactions' });
      AaConsent.hasMany(models.AaFinancialAnalysis, { foreignKey: 'consent_id', as: 'analyses' });
      AaConsent.hasMany(models.AaConsentAuditLog, { foreignKey: 'consent_id', as: 'auditLogs' });
    }
  }

  AaConsent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      consent_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      aa_provider: {
        type: DataTypes.ENUM('finvu', 'onemoney', 'cams', 'nsdl', 'setu'), allowNull: false,
      },
      consent_status: {
        type: DataTypes.ENUM('requested', 'approved', 'rejected', 'revoked', 'expired'),
        defaultValue: 'requested',
      },
      consent_purpose: { type: DataTypes.STRING(100), allowNull: true },
      data_from: { type: DataTypes.DATEONLY, allowNull: true },
      data_to: { type: DataTypes.DATEONLY, allowNull: true },
      consent_handle: { type: DataTypes.STRING(100), allowNull: true },
      redirect_url: { type: DataTypes.TEXT, allowNull: true },
      provider_consent_id: { type: DataTypes.STRING(100), allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true },
      expires_at: { type: DataTypes.DATE, allowNull: true },
      last_fetch_at: { type: DataTypes.DATE, allowNull: true },
      fetch_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      pending_data_fetch: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'AaConsent', tableName: 'aa_consents',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['consent_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['consent_status'] },
      ],
    }
  );

  return AaConsent;
};
