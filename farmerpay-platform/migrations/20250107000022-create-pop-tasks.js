'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pop_tasks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pop_workband_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'pop_workbands',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      task_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      task_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      task_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      estimated_labor_hours: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      labor_skill_required: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      machinery_required: {
        type: Sequelize.STRING(100),
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
    await queryInterface.dropTable('pop_tasks');
  },
};
