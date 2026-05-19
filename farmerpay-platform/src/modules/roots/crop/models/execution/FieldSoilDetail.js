'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FieldSoilDetail extends Model {
    static associate(models) {
      FieldSoilDetail.belongsTo(models.Field, {
        foreignKey: 'field_id',
        as: 'field',
      });
    }
  }

  FieldSoilDetail.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      field_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fields',
          key: 'id',
        },
      },
      soil_type_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'soil_types',
          key: 'id',
        },
      },
      soil_test_date: {
        type: DataTypes.DATEONLY,
      },
      ph_value: {
        type: DataTypes.DECIMAL(5, 2),
      },
      organic_matter_percent: {
        type: DataTypes.DECIMAL(5, 2),
      },
      nitrogen_ppm: {
        type: DataTypes.INTEGER,
      },
      phosphorus_ppm: {
        type: DataTypes.INTEGER,
      },
      potassium_ppm: {
        type: DataTypes.INTEGER,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'FieldSoilDetail',
      tableName: 'field_soil_details',
      timestamps: true,
      underscored: true,
    }
  );

  return FieldSoilDetail;
};
