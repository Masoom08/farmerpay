'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SoilHealthRecord extends Model {
    static associate(models) {
      SoilHealthRecord.belongsTo(models.Field, {
        foreignKey: 'field_id',
        as: 'field',
      });
    }
  }

  SoilHealthRecord.init(
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
      test_date: {
        type: DataTypes.DATEONLY,
      },
      organic_carbon_percent: {
        type: DataTypes.DECIMAL(5, 2),
      },
      nitrogen_kg_per_hectare: {
        type: DataTypes.INTEGER,
      },
      phosphorus_kg_per_hectare: {
        type: DataTypes.INTEGER,
      },
      potassium_kg_per_hectare: {
        type: DataTypes.INTEGER,
      },
      sulphur_ppm: {
        type: DataTypes.INTEGER,
      },
      boron_ppm: {
        type: DataTypes.INTEGER,
      },
      iron_ppm: {
        type: DataTypes.INTEGER,
      },
      ph: { type: DataTypes.DECIMAL(4, 2) },
      ec_ds_per_m: { type: DataTypes.DECIMAL(6, 3) },
      zinc_ppm: { type: DataTypes.DECIMAL(6, 3) },
      manganese_ppm: { type: DataTypes.DECIMAL(6, 3) },
      copper_ppm: { type: DataTypes.DECIMAL(6, 3) },
      card_id: { type: DataTypes.STRING(64) },
      valid_until: { type: DataTypes.DATEONLY },
      image_url: { type: DataTypes.STRING(512) },
      raw_ocr_text: { type: DataTypes.TEXT },
      confidence_scores: { type: DataTypes.JSON },
      source: { type: DataTypes.ENUM('manual_entry', 'photo_ocr', 'photo_plus_manual'), defaultValue: 'manual_entry' },
      soil_type: { type: DataTypes.STRING(50) },
      test_lab_name: {
        type: DataTypes.STRING(100),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'SoilHealthRecord',
      tableName: 'soil_health_records',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['field_id'] },
        { fields: ['card_id'] },
      ],
    }
  );

  return SoilHealthRecord;
};
