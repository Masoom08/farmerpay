'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InputItem extends Model {
    static associate(models) {
      InputItem.belongsTo(models.InputCategory, {
        foreignKey: 'category_id',
        as: 'inputCategory',
      });
      InputItem.belongsTo(models.InputUnit, {
        foreignKey: 'unit_id',
        as: 'inputUnit',
      });
      InputItem.hasMany(models.InputTranslation, {
        foreignKey: 'item_id',
        sourceKey: 'item_uuid',
        as: 'inputTranslations',
      });
      InputItem.hasMany(models.InputPack, {
        foreignKey: 'item_id',
        sourceKey: 'item_uuid',
        as: 'inputPacks',
      });
    }
  }

  InputItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      item_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'input_categories',
          key: 'id',
        },
      },
      item_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      item_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      item_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      unit_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'input_units',
          key: 'id',
        },
      },
      manufacturer: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      active_ingredient: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      is_organic: {
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
      modelName: 'InputItem',
      tableName: 'input_items',
      timestamps: true,
      underscored: true,
    }
  );

  return InputItem;
};
