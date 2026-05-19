'use strict';

/**
 * Migration: Create dairy_weekly_summaries.
 * Bulk-entry mode for LARGE-tier farmers (>10 animals). One row covers a full
 * week of totals. Saving a row triggers the service to fan out into individual
 * dairy_cost_events / dairy_revenue_events so the P&L engine has a single code
 * path regardless of entry mode.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dairy_weekly_summaries', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      summary_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      week_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      week_end_date: { type: Sequelize.DATEONLY, allowNull: false },
      total_feed_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_fodder_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_labor_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_vet_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_other_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_milk_liters: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      total_milk_revenue: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_other_revenue: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_finalized: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('dairy_weekly_summaries', ['farmer_id', 'week_start_date'], {
      name: 'idx_dws_farmer_week',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dairy_weekly_summaries');
  },
};
