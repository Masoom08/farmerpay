'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('otp_requests', 'otp_code', {
      type: Sequelize.STRING(64),
      allowNull: false,
      comment: 'SHA-256 hex hash of OTP code (64 chars)',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('otp_requests', 'otp_code', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
