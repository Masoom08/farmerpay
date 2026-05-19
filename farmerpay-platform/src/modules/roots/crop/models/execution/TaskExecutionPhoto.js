'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TaskExecutionPhoto extends Model {
    static associate(models) {
      TaskExecutionPhoto.belongsTo(models.TaskExecution, {
        foreignKey: 'task_execution_id',
        as: 'taskExecution',
      });
    }
  }

  TaskExecutionPhoto.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      task_execution_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'task_executions',
          key: 'id',
        },
      },
      photo_uuid: {
        type: DataTypes.STRING(36),
      },
      photo_type: {
        type: DataTypes.ENUM('pre_task', 'during_task', 'post_task'),
      },
      media_asset_id: {
        type: DataTypes.INTEGER,
      },
      photo_timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      photo_location_latitude: {
        type: DataTypes.DECIMAL(10, 8),
      },
      photo_location_longitude: {
        type: DataTypes.DECIMAL(11, 8),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'TaskExecutionPhoto',
      tableName: 'task_execution_photos',
      timestamps: true,
      underscored: true,
    }
  );

  return TaskExecutionPhoto;
};
