'use strict';

/**
 * Migration: Add input-cost-based loan sizing fields to loan_applications.
 * Links loan to Scale of Finance, PoP, field, and stores input cost breakdown.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const DT = Sequelize.DataTypes;
    const table = 'loan_applications';

    await queryInterface.addColumn(table, 'sof_id', { type: DT.INTEGER, allowNull: true });
    await queryInterface.addColumn(table, 'pop_id', { type: DT.STRING(36), allowNull: true });
    await queryInterface.addColumn(table, 'field_id', { type: DT.INTEGER, allowNull: true });
    await queryInterface.addColumn(table, 'calculated_recommended_amount', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'input_cost_breakdown', { type: DT.JSON, allowNull: true });
    await queryInterface.addColumn(table, 'sof_cost_per_hectare', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'nabard_benchmark_per_hectare', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'amount_above_sof', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'sizing_method', { type: DT.ENUM('manual', 'input_cost_based', 'hybrid'), defaultValue: 'manual' });
  },

  async down(queryInterface) {
    const table = 'loan_applications';
    const cols = ['sof_id', 'pop_id', 'field_id', 'calculated_recommended_amount',
      'input_cost_breakdown', 'sof_cost_per_hectare', 'nabard_benchmark_per_hectare',
      'amount_above_sof', 'sizing_method'];
    for (const col of cols) await queryInterface.removeColumn(table, col).catch(() => {});
  },
};
