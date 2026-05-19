'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CropTranslation extends Model {
    static associate(models) {
      CropTranslation.belongsTo(models.CropMaster, {
        foreignKey: 'crop_id',
        targetKey: 'crop_id',
        as: 'cropMaster',
      });
    }
  }

  CropTranslation.init(
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
      language_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      crop_name_translated: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      crop_description_translated: {
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
      modelName: 'CropTranslation',
      tableName: 'crop_translations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['crop_id', 'language_code'],
        },
      ],
    }
  );

  return CropTranslation;
};
