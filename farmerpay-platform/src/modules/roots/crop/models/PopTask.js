'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PopTask extends Model {
    static associate(models) {
      PopTask.belongsTo(models.PopWorkband, {
        foreignKey: 'pop_workband_id',
        as: 'popWorkband',
      });
      PopTask.hasMany(models.PopTaskInput, {
        foreignKey: 'pop_task_id',
        as: 'popTaskInputs',
      });
    }
  }

  PopTask.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      pop_workband_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'pop_workbands',
          key: 'id',
        },
      },
      task_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      task_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      task_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      estimated_labor_hours: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      labor_skill_required: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      machinery_required: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      is_optional: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'PopTask',
      tableName: 'pop_tasks',
      timestamps: true,
      underscored: true,
    }
  );

  return PopTask;
};
