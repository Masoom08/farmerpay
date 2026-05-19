'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('readiness_decision_audit_logs', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      banker_user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      trust_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      fhs_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      matrix_cell: {
        type: Sequelize.ENUM('approve', 'conditional', 'refer', 'decline'),
        allowNull: true,
      },
      recommended_action: { type: Sequelize.STRING(255), allowNull: true },
      scenarios_applied: { type: Sequelize.JSON, allowNull: true },
      ip: { type: Sequelize.STRING(45), allowNull: true },
      user_agent: { type: Sequelize.STRING(512), allowNull: true },
      viewed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('readiness_decision_audit_logs', ['farmer_id']);
    await queryInterface.addIndex('readiness_decision_audit_logs', ['banker_user_id']);
    await queryInterface.addIndex('readiness_decision_audit_logs', ['viewed_at']);
    await queryInterface.addIndex('readiness_decision_audit_logs', ['matrix_cell']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('readiness_decision_audit_logs');
  },
};
