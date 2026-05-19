'use strict';

/**
 * Migration: Enhance scale_of_finances with DLTC district-crop-season norms
 * and NABARD standard input cost benchmarks.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const DT = Sequelize.DataTypes;
    const table = 'scale_of_finances';

    await queryInterface.addColumn(table, 'district_id', { type: DT.INTEGER, allowNull: true, references: { model: 'lgd_districts', key: 'id' } });
    await queryInterface.addColumn(table, 'state_id', { type: DT.INTEGER, allowNull: true, references: { model: 'lgd_states', key: 'id' } });
    await queryInterface.addColumn(table, 'crop_id', { type: DT.INTEGER, allowNull: true });
    await queryInterface.addColumn(table, 'season', { type: DT.ENUM('kharif', 'rabi', 'summer', 'perennial'), allowNull: true });
    await queryInterface.addColumn(table, 'financial_year', { type: DT.STRING(10), allowNull: true });
    await queryInterface.addColumn(table, 'cost_per_hectare_seed', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'cost_per_hectare_fertiliser', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'cost_per_hectare_pesticide', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'cost_per_hectare_labour', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'cost_per_hectare_machinery', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'cost_per_hectare_other', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'total_cost_per_hectare', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'nabard_benchmark_total', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'nabard_benchmark_input_cost', { type: DT.DECIMAL(15, 2), allowNull: true });
    await queryInterface.addColumn(table, 'approved_by', { type: DT.STRING(200), allowNull: true });
    await queryInterface.addColumn(table, 'approved_date', { type: DT.DATEONLY, allowNull: true });
    await queryInterface.addColumn(table, 'source', { type: DT.ENUM('dltc', 'nabard', 'state_govt', 'custom'), allowNull: true, defaultValue: 'dltc' });

    await queryInterface.addIndex(table, ['district_id', 'crop_id', 'season', 'financial_year'], { name: 'idx_sof_district_crop_season' }).catch(() => {});
  },

  async down(queryInterface) {
    const table = 'scale_of_finances';
    const cols = ['district_id', 'state_id', 'crop_id', 'season', 'financial_year',
      'cost_per_hectare_seed', 'cost_per_hectare_fertiliser', 'cost_per_hectare_pesticide',
      'cost_per_hectare_labour', 'cost_per_hectare_machinery', 'cost_per_hectare_other',
      'total_cost_per_hectare', 'nabard_benchmark_total', 'nabard_benchmark_input_cost',
      'approved_by', 'approved_date', 'source'];
    for (const col of cols) await queryInterface.removeColumn(table, col).catch(() => {});
    await queryInterface.removeIndex(table, 'idx_sof_district_crop_season').catch(() => {});
  },
};
