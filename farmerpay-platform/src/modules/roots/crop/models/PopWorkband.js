'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PopWorkband extends Model {
    static associate(models) {
      PopWorkband.belongsTo(models.PackageOfPractice, {
        foreignKey: 'pop_id',
        targetKey: 'pop_uuid',
        as: 'packageOfPractice',
      });
      PopWorkband.hasMany(models.PopTask, {
        foreignKey: 'pop_workband_id',
        as: 'popTasks',
      });
      if (models.PopWorkbandTrigger) {
        PopWorkband.hasMany(models.PopWorkbandTrigger, {
          foreignKey: 'pop_workband_id',
          as: 'triggers',
        });
      }
      if (models.PopWorkbandPestSusceptibility) {
        PopWorkband.hasMany(models.PopWorkbandPestSusceptibility, {
          foreignKey: 'pop_workband_id',
          as: 'pestSusceptibilities',
        });
      }
    }
  }

  PopWorkband.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      pop_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      workband_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      workband_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      days_from_sowing_start: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      days_from_sowing_end: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      workband_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'PopWorkband',
      tableName: 'pop_workbands',
      timestamps: true,
      underscored: true,
    }
  );

  return PopWorkband;
};
