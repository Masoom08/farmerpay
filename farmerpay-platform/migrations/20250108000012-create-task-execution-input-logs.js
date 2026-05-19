'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_execution_input_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      task_execution_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'task_executions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      input_item_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      input_pack_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      quantity_used: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true
      },
      quantity_unit_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      application_method: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      time_of_application: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      input_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      supplier_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('task_execution_input_logs');
  }
};
