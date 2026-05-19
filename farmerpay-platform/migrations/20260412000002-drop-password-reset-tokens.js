'use strict';

/**
 * Drop the password_reset_tokens table.
 *
 * MPIN + OTP fallback replaced password-based auth entirely. The
 * forgot-password flow now reuses the OTP pipeline (purpose=reset_mpin),
 * so the standalone reset-token table is dead weight.
 *
 * Reversible: down() recreates the table with its original shape.
 */

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.dropTable('password_reset_tokens');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('password_reset_tokens', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
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
    await queryInterface.addIndex('password_reset_tokens', ['user_id', 'expires_at'], { name: 'idx_reset_user_expiry' });
  },
};
