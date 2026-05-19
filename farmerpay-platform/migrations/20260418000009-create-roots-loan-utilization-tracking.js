'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roots_loan_utilization_tracking', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      loan_application_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      cultivation_cycle_id: { type: Sequelize.INTEGER, allowNull: true },
      loan_purpose: { type: Sequelize.STRING(100), allowNull: true },
      sanctioned_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      disbursed_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      roots_total_input_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      vyapar_total_purchase: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      total_verified_expenditure: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      utilization_ratio: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      utilization_quality: { type: Sequelize.ENUM('GOOD', 'PARTIAL', 'POOR', 'SUSPICIOUS'), allowNull: false },
      assessment_date: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('roots_loan_utilization_tracking', ['farmer_id', 'loan_application_id'], { name: 'idx_rlut_farmer_loan' });
    await queryInterface.addIndex('roots_loan_utilization_tracking', ['utilization_quality'], { name: 'idx_rlut_quality' });
  },
  async down(queryInterface) { await queryInterface.dropTable('roots_loan_utilization_tracking'); },
};
