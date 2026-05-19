const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanIntegrationLog extends Model {
    static associate(models) { LoanIntegrationLog.belongsTo(models.LoanProvider, { foreignKey: 'provider_id', as: 'provider' }); }
  }
  LoanIntegrationLog.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    provider_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'loan_providers', key: 'id' } },
    integration_type: { type: DataTypes.ENUM('product_sync', 'application_submit', 'disbursement_notify', 'repayment_sync'), allowNull: false },
    request_payload: { type: DataTypes.JSON, allowNull: true },
    response_payload: { type: DataTypes.JSON, allowNull: true },
    integration_status: { type: DataTypes.ENUM('pending', 'success', 'failed', 'partial'), defaultValue: 'pending' },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    integrated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanIntegrationLog', tableName: 'loan_integration_logs', timestamps: true, underscored: true });
  return LoanIntegrationLog;
};
