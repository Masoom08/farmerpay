'use strict';

/**
 * Migration: Create aadhaar_verifications table
 * Supports Aadhaar-based step-up authentication for DICE financial operations.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('aadhaar_verifications', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      verification_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      aadhaar_hash: { type: Sequelize.STRING(64), allowNull: false },
      aadhaar_last4: { type: Sequelize.STRING(4), allowNull: false },
      otp_request_id: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      otp_code_hash: { type: Sequelize.STRING(64), allowNull: true },
      otp_sent_at: { type: Sequelize.DATE, allowNull: false },
      otp_expires_at: { type: Sequelize.DATE, allowNull: false },
      verified_at: { type: Sequelize.DATE, allowNull: true },
      session_token_jti: { type: Sequelize.STRING(36), allowNull: true },
      session_expires_at: { type: Sequelize.DATE, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      device_fingerprint: { type: Sequelize.STRING(255), allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'verified', 'expired', 'failed', 'revoked'),
        allowNull: false,
        defaultValue: 'pending',
      },
      failure_reason: { type: Sequelize.STRING(255), allowNull: true },
      attempt_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('aadhaar_verifications', ['user_id'], { name: 'idx_aadhaar_user' });
    await queryInterface.addIndex('aadhaar_verifications', ['status'], { name: 'idx_aadhaar_status' });
    await queryInterface.addIndex('aadhaar_verifications', ['session_expires_at'], { name: 'idx_aadhaar_session_exp' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('aadhaar_verifications');
  },
};
