'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CropSeason extends Model {
    static associate(models) {
      CropSeason.belongsTo(models.CropMaster, {
        foreignKey: 'crop_id',
        targetKey: 'crop_id',
        as: 'cropMaster',
      });
    }
  }

  CropSeason.init(
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
      season: {
        type: DataTypes.ENUM('kharif', 'rabi', 'summer'),
        allowNull: false,
      },
      planting_month_start: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      planting_month_end: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      harvesting_month_start: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      harvesting_month_end: {
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
      modelName: 'CropSeason',
      tableName: 'crop_seasons',
      timestamps: true,
      underscored: true,
    }
  );

  return CropSeason;
};
