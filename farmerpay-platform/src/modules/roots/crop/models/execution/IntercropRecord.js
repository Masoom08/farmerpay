'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IntercropRecord extends Model {
    static associate(models) {
      IntercropRecord.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  IntercropRecord.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cycle_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      intercrop_crop_id: {
        type: DataTypes.STRING(36),
      },
      intercrop_variety_id: {
        type: DataTypes.STRING(36),
      },
      intercrop_area_hectares: {
        type: DataTypes.DECIMAL(10, 4),
      },
      intercrop_yield_kg: {
        type: DataTypes.INTEGER,
      },
      intercrop_income: {
        type: DataTypes.DECIMAL(15, 2),
      },
      intercrop_notes: {
        type: DataTypes.TEXT,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'IntercropRecord',
      tableName: 'intercrop_records',
      timestamps: true,
      underscored: true,
    }
  );

  return IntercropRecord;
};
