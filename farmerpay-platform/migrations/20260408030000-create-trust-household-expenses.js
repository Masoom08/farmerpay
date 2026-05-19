'use strict';

/**
 * Migration: Create trust_household_expenses.
 *
 * Captures a farmer's monthly household expense snapshot — the THIRD leg of
 * the financial picture (income via L2 activity mix, debt via L3 liabilities,
 * expenses here). Disposable income = income − expenses − debt service. That
 * disposable number is the basis of the L5 leverage calculator: it tells the
 * farmer how much MORE credit they can responsibly take.
 *
 * One row per (farmer, reference_year, reference_month). Categories live as
 * individual columns so we can aggregate / index efficiently and avoid JSON
 * shape drift.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_household_expenses', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      expense_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reference_year: { type: Sequelize.INTEGER, allowNull: false },
      reference_month: { type: Sequelize.INTEGER, allowNull: false }, // 1..12

      // Category breakdown (₹ per month)
      food_inr: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      education_inr: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      health_inr: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      utilities_inr: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      transport_inr: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      rent_inr: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      farm_inputs_inr: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      loan_emi_inr: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      savings_inr: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      other_inr: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

      // Computed total — kept persisted so we can sort/aggregate cheaply
      total_inr: { type: Sequelize.DECIMAL(11, 2), allowNull: false, defaultValue: 0 },

      confidence: {
        type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH'),
        allowNull: false,
        defaultValue: 'MEDIUM',
      },
      source: {
        type: Sequelize.ENUM('FARMER_DECLARED', 'AGENT_VERIFIED', 'BACKFILL'),
        allowNull: false,
        defaultValue: 'FARMER_DECLARED',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('trust_household_expenses', ['farmer_id', 'reference_year', 'reference_month'], {
      name: 'idx_the_farmer_year_month',
    });
    await queryInterface.addConstraint('trust_household_expenses', {
      fields: ['farmer_id', 'reference_year', 'reference_month'],
      type: 'unique',
      name: 'uniq_the_farmer_year_month',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trust_household_expenses');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_household_expenses_confidence";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_household_expenses_source";');
  },
};
