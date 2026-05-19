'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CropEstablishmentMethod extends Model {
    static associate(models) {
      CropEstablishmentMethod.belongsTo(models.CropMaster, {
        foreignKey: 'crop_id',
        targetKey: 'crop_id',
        as: 'cropMaster',
      });
    }
  }

  CropEstablishmentMethod.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      crop_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      method_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      method_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      seed_rate_per_hectare_kg: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
      },
      spacing_row_cm: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      spacing_plant_cm: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'CropEstablishmentMethod',
      tableName: 'crop_establishment_methods',
      timestamps: true,
      underscored: true,
    }
  );

  return CropEstablishmentMethod;
};
