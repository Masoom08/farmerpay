'use strict';

/**
 * Migration — Create admin_users
 *
 * Workforce auth table for the bank-ops admin UI (May 2026 pilot).
 *
 * Why a separate table from `users`:
 *   - Different auth flow (email + password, not mobile + MPIN)
 *   - Different session model (browser cookies, not JWT)
 *   - Different role model (bank_admin / pilot_ops / system_admin)
 *   - Scoping: bank_admin rows carry a `bank_name_scope` so they can
 *     only see their own bank's data in the cohort report
 *
 * Keeping this separate avoids confusing the farmer KYC flow with
 * workforce access control.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_users', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: true },
      password_hash: { type: Sequelize.STRING(200), allowNull: false },
      role: {
        type: Sequelize.ENUM('bank_admin', 'pilot_ops', 'system_admin'),
        allowNull: false,
        defaultValue: 'bank_admin',
      },
      // If role is bank_admin, this is the bank_name the user can see.
      // pilot_ops and system_admin users ignore this field and see everything.
      bank_name_scope: { type: Sequelize.STRING(100), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('admin_users', { fields: ['email'], unique: true });
    await queryInterface.addIndex('admin_users', { fields: ['role'] });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admin_users');
  },
};
