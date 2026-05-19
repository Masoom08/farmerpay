/**
 * FinacleIntegrationEvent Model
 * Logs all inbound/outbound events between Finacle CBS and FarmerPay.
 * Provides full audit trail for webhook receipts, API pushes, and data syncs.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FinacleIntegrationEvent extends Model {
    static associate(models) {
      FinacleIntegrationEvent.belongsTo(models.BankLoanAccount, { foreignKey: 'bank_loan_account_id', as: 'loanAccount' });
    }
  }

  FinacleIntegrationEvent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      // Direction
      direction: { type: DataTypes.ENUM('inbound', 'outbound'), allowNull: false },
      // Event classification
      event_type: {
        type: DataTypes.ENUM(
          // Inbound (Finacle → FarmerPay)
          'loan_disbursement', 'repayment_received', 'sma_classification_change',
          'account_closure', 'topup_renewal', 'collateral_valuation_update',
          'cif_data_sync', 'loan_data_sync', 'repayment_schedule_sync',
          // Outbound (FarmerPay → Finacle)
          'loan_origination_push', 'insurance_enrollment_push', 'enduse_verification_push',
          'psl_classification_push', 'pre_delinquency_alert', 'gold_return_reminder'
        ),
        allowNull: false,
      },
      // Finacle references
      finacle_account_number: { type: DataTypes.STRING(20), allowNull: true },
      finacle_cif_id: { type: DataTypes.STRING(20), allowNull: true },
      finacle_menu_code: { type: DataTypes.STRING(20), allowNull: true },
      // FarmerPay references
      bank_loan_account_id: { type: DataTypes.INTEGER, allowNull: true },
      application_id: { type: DataTypes.INTEGER, allowNull: true },
      farmer_id: { type: DataTypes.INTEGER, allowNull: true },
      // Payload
      request_payload: { type: DataTypes.JSON, allowNull: true },
      response_payload: { type: DataTypes.JSON, allowNull: true },
      // Processing
      idempotency_key: { type: DataTypes.STRING(64), allowNull: true, unique: true },
      processing_status: {
        type: DataTypes.ENUM('received', 'processing', 'processed', 'failed', 'ignored'),
        defaultValue: 'received',
      },
      failure_reason: { type: DataTypes.TEXT, allowNull: true },
      retry_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      processed_at: { type: DataTypes.DATE, allowNull: true },
      // Security
      hmac_signature: { type: DataTypes.STRING(128), allowNull: true },
      hmac_verified: { type: DataTypes.BOOLEAN, allowNull: true },
      source_ip: { type: DataTypes.STRING(45), allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FinacleIntegrationEvent', tableName: 'finacle_integration_events',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['event_uuid'], unique: true },
        { fields: ['direction'] },
        { fields: ['event_type'] },
        { fields: ['finacle_account_number'] },
        { fields: ['processing_status'] },
        { fields: ['idempotency_key'], unique: true },
      ],
    }
  );

  return FinacleIntegrationEvent;
};
