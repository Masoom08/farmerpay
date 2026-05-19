'use strict';

/**
 * Migration: Create fishery_recurring_templates.
 * Mirror of dairy_recurring_templates. Lets a farmer set up routine costs
 * (e.g. "Daily feed ₹800", "Weekly aeration electricity ₹400") once, and
 * the cron job auto-creates pending cost events for one-tap confirmation.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fishery_recurring_templates', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      template_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      template_name: { type: Sequelize.STRING(120), allowNull: false },
      scope: {
        type: Sequelize.ENUM('FARM', 'POND', 'VESSEL'),
        allowNull: false,
        defaultValue: 'FARM',
      },
      pond_id: { type: Sequelize.STRING(36), allowNull: true },
      vessel_id: { type: Sequelize.STRING(36), allowNull: true },
      category: {
        type: Sequelize.ENUM(
          'LABOR', 'LICENSE', 'INSURANCE', 'EQUIPMENT', 'TRANSPORT', 'OTHER',
          'FINGERLINGS', 'FEED', 'POND_PREP', 'AERATION_ELECTRICITY',
          'WATER_MGMT', 'HARVEST_LABOR', 'HEALTH_TREATMENT',
          'FUEL', 'ICE', 'NETS_GEAR', 'BAIT', 'CREW_WAGES',
          'BOAT_MAINTENANCE', 'AUCTION_COMMISSION', 'LANDING_FEES',
        ),
        allowNull: false,
      },
      default_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      default_quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      default_unit: { type: Sequelize.STRING(20), allowNull: true },
      default_vendor: { type: Sequelize.STRING(120), allowNull: true },
      default_payment_mode: {
        type: Sequelize.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },
      frequency: {
        type: Sequelize.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'),
        allowNull: false,
      },
      day_of_period: { type: Sequelize.INTEGER, allowNull: true },
      next_due_date: { type: Sequelize.DATEONLY, allowNull: false },
      last_generated_date: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('fishery_recurring_templates', ['farmer_id'], { name: 'idx_frt_farmer' });
    await queryInterface.addIndex('fishery_recurring_templates', ['next_due_date'], { name: 'idx_frt_due' });
    await queryInterface.addIndex('fishery_recurring_templates', ['is_active'], { name: 'idx_frt_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fishery_recurring_templates');
  },
};
