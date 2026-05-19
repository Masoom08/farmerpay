'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pop_task_inputs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pop_task_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'pop_tasks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      input_item_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
      },
      input_quantity: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      input_unit_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'input_units',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      input_timing_days_from_start: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_optional: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pop_task_inputs');
  },
};
