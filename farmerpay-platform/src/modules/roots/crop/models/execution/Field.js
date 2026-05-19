'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Field extends Model {
    static associate(models) {
      Field.belongsTo(models.FarmRegister, {
        foreignKey: 'farm_register_id',
        as: 'farmRegister',
      });
      Field.hasMany(models.FieldSoilDetail, {
        foreignKey: 'field_id',
        as: 'soilDetails',
      });
      Field.hasMany(models.FieldOwnershipStatus, {
        foreignKey: 'field_id',
        as: 'ownershipStatuses',
      });
      Field.hasMany(models.CultivationCycle, {
        foreignKey: 'field_id',
        as: 'cultivationCycles',
      });
      Field.hasMany(models.SoilHealthRecord, {
        foreignKey: 'field_id',
        as: 'soilHealthRecords',
      });
    }
  }

  Field.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      field_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      farm_register_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'farm_registers',
          key: 'id',
        },
      },
      field_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      field_code: {
        type: DataTypes.STRING(20),
      },
      field_size_hectares: {
        type: DataTypes.DECIMAL(10, 4),
      },
      lgd_village_id: {
        type: DataTypes.INTEGER,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Field',
      tableName: 'fields',
      timestamps: true,
      underscored: true,
    }
  );

  return Field;
};
