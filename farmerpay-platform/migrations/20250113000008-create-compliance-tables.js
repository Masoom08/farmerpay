'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create consent_records table
    await queryInterface.createTable('consent_records', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      consent_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      consent_type: {
        type: Sequelize.ENUM('kyc', 'lending', 'data_processing', 'marketing', 'insurance'),
        allowNull: false,
      },
      consent_version: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      accepted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      accepted_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      withdrawn_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('consent_records', ['farmer_id', 'consent_type']);

    // Create grievance_records table
    await queryInterface.createTable('grievance_records', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      grievance_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      category: {
        type: Sequelize.ENUM(
          'service_quality', 'fee_dispute', 'loan_denial',
          'disclosure_issue', 'repayment_issue', 'data_privacy', 'other'
        ),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      status: {
        type: Sequelize.ENUM('filed', 'acknowledged', 'investigating', 'resolved', 'escalated'),
        allowNull: false,
        defaultValue: 'filed',
      },
      assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      resolution: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      escalated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      escalation_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('grievance_records', ['farmer_id']);
    await queryInterface.addIndex('grievance_records', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('grievance_records');
    await queryInterface.dropTable('consent_records');
  },
};
