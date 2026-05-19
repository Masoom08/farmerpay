'use strict';

/**
 * Migration: Create fishery_weekly_summaries.
 * Large-tier fisheries farmers (>5ha or multi-vessel) use weekly bulk entry
 * rather than per-event logging. On finalize, this summary fans out to
 * estimated cost/revenue events.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fishery_weekly_summaries', {
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

      // Inland costs
      total_feed_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_fingerling_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_pond_labor_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_aeration_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_health_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

      // Sea costs
      total_fuel_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_ice_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_crew_wages: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_gear_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_maintenance_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

      total_other_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

      // Revenue
      total_fish_kg: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_fish_revenue: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_other_revenue: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

      notes: { type: Sequelize.TEXT, allowNull: true },
      is_finalized: { type: Sequelize.BOOLEAN, defaultValue: false },
      finalized_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('fishery_weekly_summaries', ['farmer_id', 'week_start_date'], { name: 'idx_fws_farmer_week' });
    await queryInterface.addIndex('fishery_weekly_summaries', ['is_finalized'], { name: 'idx_fws_finalized' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fishery_weekly_summaries');
  },
};
