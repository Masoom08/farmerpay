'use strict';

/**
 * sathi_issue_flags — issues a Sathi raises that need banker / ops intervention.
 * Surfaces into the banker loan inbox and the Sathi's dashboard.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sathi_issue_flags', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      intermediary_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'intermediaries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      loan_application_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Soft FK to loan_applications when the issue is loan-scoped',
      },
      issue_type: {
        type: Sequelize.ENUM(
          'loan_delinquent',
          'crop_failure',
          'fraud_suspicion',
          'document_dispute',
          'farmer_unreachable',
          'grievance',
          'other'
        ),
        allowNull: false,
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      description: { type: Sequelize.TEXT, allowNull: false },
      status: {
        type: Sequelize.ENUM('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed'),
        allowNull: false,
        defaultValue: 'open',
      },
      assigned_banker_id: { type: Sequelize.INTEGER, allowNull: true },
      resolution_notes: { type: Sequelize.TEXT, allowNull: true },
      opened_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      acknowledged_at: { type: Sequelize.DATE, allowNull: true },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('sathi_issue_flags', ['intermediary_id', 'status']);
    await queryInterface.addIndex('sathi_issue_flags', ['farmer_id']);
    await queryInterface.addIndex('sathi_issue_flags', ['assigned_banker_id', 'status']);
    await queryInterface.addIndex('sathi_issue_flags', ['severity', 'status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sathi_issue_flags');
  },
};
