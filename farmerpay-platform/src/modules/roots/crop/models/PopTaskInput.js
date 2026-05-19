'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PopTaskInput extends Model {
    static associate(models) {
      PopTaskInput.belongsTo(models.PopTask, {
        foreignKey: 'pop_task_id',
        as: 'popTask',
      });
      PopTaskInput.belongsTo(models.InputItem, {
        foreignKey: 'input_item_id',
        targetKey: 'item_uuid',
        as: 'inputItem',
      });
      PopTaskInput.belongsTo(models.InputUnit, {
        foreignKey: 'input_unit_id',
        as: 'inputUnit',
      });
    }
  }

  PopTaskInput.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      pop_task_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'pop_tasks',
          key: 'id',
        },
      },
      input_item_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      input_quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
      },
      input_unit_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'input_units',
          key: 'id',
        },
      },
      input_timing_days_from_start: {
        type: DataTypes.INTEGER,
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
      modelName: 'PopTaskInput',
      tableName: 'pop_task_inputs',
      timestamps: true,
      underscored: true,
    }
  );

  return PopTaskInput;
};
