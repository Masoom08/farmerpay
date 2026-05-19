'use strict';

/**
 * Migration: Create dairy_recurring_templates.
 * Lets a farmer set up a "Monthly labor wage: ₹6000 on the 1st" once and then
 * the cron job auto-creates pending cost_events on each due date for one-tap
 * confirmation. Core fatigue-reducer for routine costs.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dairy_recurring_templates', {
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
      category: {
        type: Sequelize.ENUM(
          'FEED', 'FODDER', 'MEDICINE', 'VET_TREATMENT', 'AI_BREEDING', 'NATURAL_SERVICE',
          'VACCINATION', 'LABOR', 'ELECTRICITY', 'WATER', 'HOUSING', 'EQUIPMENT',
          'TRANSPORT', 'INSURANCE', 'PURCHASE_ANIMAL', 'OTHER',
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

    await queryInterface.addIndex('dairy_recurring_templates', ['farmer_id'], { name: 'idx_drt_farmer' });
    await queryInterface.addIndex('dairy_recurring_templates', ['next_due_date'], { name: 'idx_drt_due' });
    await queryInterface.addIndex('dairy_recurring_templates', ['is_active'], { name: 'idx_drt_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dairy_recurring_templates');
  },
};
