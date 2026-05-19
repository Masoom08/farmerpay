'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs_v2', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      audit_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      entity_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      action: {
        type: Sequelize.ENUM('create', 'read', 'update', 'delete', 'export', 'approve', 'reject'),
        allowNull: false,
      },
      action_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      action_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      changed_fields: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      old_values: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      new_values: {
        type: Sequelize.JSON,
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
      sensitivity_level: {
        type: Sequelize.ENUM('1_public', '2_pii', '3_financial', '4_identity'),
        defaultValue: '1_public',
      },
      request_id: {
        type: Sequelize.STRING(36),
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

    await queryInterface.addIndex('audit_logs_v2', ['entity_type', 'entity_id', 'action_at'], {
      name: 'idx_audit_logs_v2_entity_action',
    });

    await queryInterface.addIndex('audit_logs_v2', ['action_by', 'action_at'], {
      name: 'idx_audit_logs_v2_action_by',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs_v2');
  },
};
