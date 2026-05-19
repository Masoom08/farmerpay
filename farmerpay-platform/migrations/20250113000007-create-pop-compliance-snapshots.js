'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pop_compliance_snapshots', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      snapshot_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      cycle_id: { type: Sequelize.STRING(36), allowNull: false },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      pop_id: { type: Sequelize.STRING(36), allowNull: true },
      sof_id: { type: Sequelize.INTEGER, allowNull: true },
      touchpoint_scores: { type: Sequelize.JSON, allowNull: true },
      timeliness_score: { type: Sequelize.INTEGER, defaultValue: 0 },
      task_completion_score: { type: Sequelize.INTEGER, defaultValue: 0 },
      input_compliance_score: { type: Sequelize.INTEGER, defaultValue: 0 },
      cost_vs_sof_score: { type: Sequelize.INTEGER, defaultValue: 0 },
      overall_compliance_score: { type: Sequelize.INTEGER, defaultValue: 0 },
      compliance_status: { type: Sequelize.ENUM('on_track', 'at_risk', 'off_track'), defaultValue: 'on_track' },
      touchpoints_completed: { type: Sequelize.INTEGER, defaultValue: 0 },
      touchpoints_total: { type: Sequelize.INTEGER, defaultValue: 10 },
      sof_cost_per_hectare: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      actual_cost_per_hectare: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      cost_deviation_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      loan_input_baseline: { type: Sequelize.JSON, allowNull: true },
      deviations: { type: Sequelize.JSON, allowNull: true },
      calculated_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('pop_compliance_snapshots', ['cycle_id']);
    await queryInterface.addIndex('pop_compliance_snapshots', ['farmer_id']);
    await queryInterface.addIndex('pop_compliance_snapshots', ['compliance_status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pop_compliance_snapshots');
  },
};
