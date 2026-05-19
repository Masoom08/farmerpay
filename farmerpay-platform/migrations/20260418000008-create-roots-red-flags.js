'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roots_red_flags', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      loan_application_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'loan_applications', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      activity_type: { type: Sequelize.ENUM('CROP', 'DAIRY', 'FISHERY', 'HORTI', 'POULTRY', 'GOATERY'), allowNull: false },
      activity_reference_id: { type: Sequelize.INTEGER, allowNull: false },
      flag_type: { type: Sequelize.ENUM('NO_DATA_ENTRY', 'CRITICAL_STAGE_MISSED', 'COST_ANOMALY', 'YIELD_ANOMALY', 'PRACTICE_DEVIATION_SEVERE', 'LOAN_UTILIZATION_MISMATCH', 'BACKFILL_SUSPECTED', 'GPS_MISMATCH', 'SATHI_DISCREPANCY', 'DISTRESS_SIGNAL', 'MORTALITY_SPIKE', 'FEED_COST_SPIRAL'), allowNull: false },
      severity: { type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      evidence_json: { type: Sequelize.JSON, allowNull: true },
      status: { type: Sequelize.ENUM('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'), defaultValue: 'OPEN' },
      acknowledged_by: { type: Sequelize.INTEGER, allowNull: true },
      acknowledged_at: { type: Sequelize.DATE, allowNull: true },
      resolution_notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('roots_red_flags', ['farmer_id', 'status'], { name: 'idx_rrf_farmer_status' });
    await queryInterface.addIndex('roots_red_flags', ['severity', 'status'], { name: 'idx_rrf_severity_status' });
    await queryInterface.addIndex('roots_red_flags', ['loan_application_id'], { name: 'idx_rrf_loan_application' });
  },
  async down(queryInterface) { await queryInterface.dropTable('roots_red_flags'); },
};
