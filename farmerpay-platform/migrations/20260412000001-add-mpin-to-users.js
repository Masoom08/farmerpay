'use strict';

/**
 * MPIN + OTP fallback authentication.
 *
 * Before: users signed in with mobile + 8+ char complex password. Too much
 * data-entry friction for low-literacy farmers on feature phones.
 *
 * After: standard Indian fintech pattern (UPI / PhonePe / BHIM):
 *   - First login: OTP to mobile → verify → set 4-digit MPIN
 *   - Subsequent logins: mobile + 4-digit MPIN
 *   - Forgot MPIN: OTP → reset MPIN
 *
 * Schema changes:
 *   - add `mpin_hash VARCHAR(255) NULL` — bcrypt hash of 4-digit PIN
 *   - make `password_hash` NULL — legacy, kept for rollback + existing users
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'mpin_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'bcrypt hash of 4-digit MPIN. NULL until user sets it after first OTP verify.',
    });

    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Legacy password. NULL for users onboarded via MPIN flow.',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'mpin_hash');
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
