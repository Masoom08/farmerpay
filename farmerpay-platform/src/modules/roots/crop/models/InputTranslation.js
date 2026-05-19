'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InputTranslation extends Model {
    static associate(models) {
      InputTranslation.belongsTo(models.InputItem, {
        foreignKey: 'item_id',
        targetKey: 'item_uuid',
        as: 'inputItem',
      });
    }
  }

  InputTranslation.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      item_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      language_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      item_name_translated: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      item_description_translated: {
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
      modelName: 'InputTranslation',
      tableName: 'input_translations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['item_id', 'language_code'],
        },
      ],
    }
  );

  return InputTranslation;
};
