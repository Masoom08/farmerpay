'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LivestockIntegrationRecord extends Model {
    static associate(models) {
      LivestockIntegrationRecord.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  LivestockIntegrationRecord.init(
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
      livestock_type: {
        type: DataTypes.STRING(50),
      },
      livestock_count: {
        type: DataTypes.INTEGER,
      },
      manure_produced_tons: {
        type: DataTypes.INTEGER,
      },
      manure_used_in_field: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      manure_value: {
        type: DataTypes.DECIMAL(15, 2),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'LivestockIntegrationRecord',
      tableName: 'livestock_integration_records',
      timestamps: true,
      underscored: true,
    }
  );

  return LivestockIntegrationRecord;
};
