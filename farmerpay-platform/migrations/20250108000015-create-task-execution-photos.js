'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_execution_photos', {
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
      photo_uuid: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      photo_type: {
        type: Sequelize.ENUM('pre_task', 'during_task', 'post_task'),
        allowNull: true
      },
      media_asset_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      photo_timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      photo_location_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      photo_location_longitude: {
        type: Sequelize.DECIMAL(11, 8),
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
    await queryInterface.dropTable('task_execution_photos');
  }
};
