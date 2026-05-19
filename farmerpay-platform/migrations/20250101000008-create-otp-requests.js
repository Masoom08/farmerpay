'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otp_requests', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      otp_request_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      mobile: {
        type: Sequelize.STRING(13),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      otp_code: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      purpose: {
        type: Sequelize.ENUM('register', 'login', 'reset_password', 'update_contact'),
        allowNull: false,
      },
      sent_via: {
        type: Sequelize.ENUM('sms', 'email', 'both'),
        allowNull: false,
        defaultValue: 'sms',
      },
      attempt_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      request_timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('otp_requests', ['mobile', 'purpose', 'created_at'], { name: 'idx_otp_mobile_purpose' });
    await queryInterface.addIndex('otp_requests', ['email', 'purpose', 'created_at'], { name: 'idx_otp_email_purpose' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('otp_requests');
  },
};
