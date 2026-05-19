'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dairy_pop_templates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      breed: { type: Sequelize.STRING(100), allowNull: false },
      species: { type: Sequelize.ENUM('CATTLE', 'BUFFALO'), allowNull: false, defaultValue: 'CATTLE' },
      lactation_stage: { type: Sequelize.ENUM('EARLY', 'MID', 'LATE', 'DRY'), allowNull: false },
      expected_daily_yield_liters: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      expected_feed_kg_per_day: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      expected_feed_cost_per_day: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      expected_lactation_length_days: { type: Sequelize.INTEGER, allowNull: true },
      expected_calving_interval_days: { type: Sequelize.INTEGER, allowNull: true },
      vaccination_schedule: { type: Sequelize.JSON, allowNull: true },
      deworming_schedule: { type: Sequelize.JSON, allowNull: true },
      expected_calf_mortality_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('dairy_pop_templates', ['breed', 'lactation_stage'], { name: 'idx_dpt_breed_stage' });
    await queryInterface.addIndex('dairy_pop_templates', ['species'], { name: 'idx_dpt_species' });
  },
  async down(queryInterface) { await queryInterface.dropTable('dairy_pop_templates'); },
};
