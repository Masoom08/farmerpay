'use strict';

/**
 * Migration: Create farmer_dairy_profile table.
 * Stores per-farmer dairy operation tier (Small/Medium/Large) which drives the
 * mobile UX layout, plus cooperative linkage and entry-mode preferences.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_dairy_profiles', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      profile_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      herd_tier: {
        type: Sequelize.ENUM('SMALL', 'MEDIUM', 'LARGE'),
        allowNull: false,
        defaultValue: 'SMALL',
      },
      entry_mode: {
        type: Sequelize.ENUM('TRANSACTIONAL', 'WEEKLY_BULK', 'MONTHLY_BULK'),
        allowNull: false,
        defaultValue: 'TRANSACTIONAL',
      },
      cooperative_name: { type: Sequelize.STRING(120), allowNull: true },
      cooperative_member_id: { type: Sequelize.STRING(50), allowNull: true },
      default_payment_mode: {
        type: Sequelize.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: false,
        defaultValue: 'CASH',
      },
      currency: { type: Sequelize.STRING(8), allowNull: false, defaultValue: 'INR' },
      onboarded_at: { type: Sequelize.DATE, allowNull: true },
      last_active_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('farmer_dairy_profiles', ['farmer_id'], { name: 'idx_fdp_farmer', unique: true });
    await queryInterface.addIndex('farmer_dairy_profiles', ['herd_tier'], { name: 'idx_fdp_tier' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('farmer_dairy_profiles');
  },
};
