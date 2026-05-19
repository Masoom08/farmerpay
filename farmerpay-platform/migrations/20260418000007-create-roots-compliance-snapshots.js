'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roots_compliance_snapshots', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      activity_type: { type: Sequelize.ENUM('CROP', 'DAIRY', 'FISHERY', 'HORTI', 'POULTRY', 'GOATERY'), allowNull: false },
      activity_reference_id: { type: Sequelize.INTEGER, allowNull: false },
      overall_compliance_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      timing_compliance_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      quantity_compliance_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      cost_compliance_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      practice_compliance_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      total_stages: { type: Sequelize.INTEGER, defaultValue: 0 },
      completed_stages: { type: Sequelize.INTEGER, defaultValue: 0 },
      missed_stages: { type: Sequelize.INTEGER, defaultValue: 0 },
      delayed_stages: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_expected_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      total_actual_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      cost_variance_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      data_completeness_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      photo_evidence_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      sathi_verified: { type: Sequelize.BOOLEAN, defaultValue: false },
      soil_health_card_available: { type: Sequelize.BOOLEAN, defaultValue: false },
      snapshot_date: { type: Sequelize.DATEONLY, allowNull: false },
      season: { type: Sequelize.STRING(20), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('roots_compliance_snapshots', ['farmer_id', 'activity_type', 'snapshot_date'], { name: 'idx_rcs_farmer_activity_date' });
    await queryInterface.addIndex('roots_compliance_snapshots', ['overall_compliance_score'], { name: 'idx_rcs_overall_score' });
    await queryInterface.addIndex('roots_compliance_snapshots', ['snapshot_date'], { name: 'idx_rcs_snapshot_date' });
  },
  async down(queryInterface) { await queryInterface.dropTable('roots_compliance_snapshots'); },
};
