'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('finacle_integration_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      event_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      direction: { type: Sequelize.ENUM('inbound', 'outbound'), allowNull: false },
      event_type: {
        type: Sequelize.ENUM(
          'loan_disbursement', 'repayment_received', 'sma_classification_change',
          'account_closure', 'topup_renewal', 'collateral_valuation_update',
          'cif_data_sync', 'loan_data_sync', 'repayment_schedule_sync',
          'loan_origination_push', 'insurance_enrollment_push', 'enduse_verification_push',
          'psl_classification_push', 'pre_delinquency_alert', 'gold_return_reminder'
        ),
        allowNull: false,
      },
      finacle_account_number: { type: Sequelize.STRING(20), allowNull: true },
      finacle_cif_id: { type: Sequelize.STRING(20), allowNull: true },
      finacle_menu_code: { type: Sequelize.STRING(20), allowNull: true },
      bank_loan_account_id: { type: Sequelize.INTEGER, allowNull: true },
      application_id: { type: Sequelize.INTEGER, allowNull: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: true },
      request_payload: { type: Sequelize.JSON, allowNull: true },
      response_payload: { type: Sequelize.JSON, allowNull: true },
      idempotency_key: { type: Sequelize.STRING(64), allowNull: true, unique: true },
      processing_status: {
        type: Sequelize.ENUM('received', 'processing', 'processed', 'failed', 'ignored'),
        defaultValue: 'received',
      },
      failure_reason: { type: Sequelize.TEXT, allowNull: true },
      retry_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      hmac_signature: { type: Sequelize.STRING(128), allowNull: true },
      hmac_verified: { type: Sequelize.BOOLEAN, allowNull: true },
      source_ip: { type: Sequelize.STRING(45), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('finacle_integration_events', ['direction']);
    await queryInterface.addIndex('finacle_integration_events', ['event_type']);
    await queryInterface.addIndex('finacle_integration_events', ['finacle_account_number']);
    await queryInterface.addIndex('finacle_integration_events', ['processing_status']);

    await queryInterface.createTable('finacle_field_mappings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      bank_code: { type: Sequelize.STRING(20), allowNull: false },
      finacle_entity: { type: Sequelize.STRING(50), allowNull: false },
      finacle_field_name: { type: Sequelize.STRING(100), allowNull: false },
      farmerpay_table: { type: Sequelize.STRING(100), allowNull: false },
      farmerpay_column: { type: Sequelize.STRING(100), allowNull: false },
      transformation_rule: { type: Sequelize.STRING(200), allowNull: true },
      is_required: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('finacle_field_mappings', ['bank_code', 'finacle_entity']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('finacle_field_mappings');
    await queryInterface.dropTable('finacle_integration_events');
  },
};
