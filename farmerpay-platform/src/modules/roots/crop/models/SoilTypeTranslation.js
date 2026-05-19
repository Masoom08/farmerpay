'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SoilTypeTranslation extends Model {
    static associate(models) {
      SoilTypeTranslation.belongsTo(models.SoilType, {
        foreignKey: 'soil_type_id',
        as: 'soilType',
      });
    }
  }

  SoilTypeTranslation.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      soil_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'soil_types',
          key: 'id',
        },
      },
      language_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      soil_type_name_translated: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'SoilTypeTranslation',
      tableName: 'soil_type_translations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['soil_type_id', 'language_code'],
        },
      ],
    }
  );

  return SoilTypeTranslation;
};
