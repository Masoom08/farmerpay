'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FarmerInterventionLog extends Model {
    static associate(models) {
      FarmerInterventionLog.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  FarmerInterventionLog.init(
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
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      intervention_date: {
        type: DataTypes.DATEONLY,
      },
      intervention_type: {
        type: DataTypes.ENUM(
          'pest_control',
          'disease_control',
          'irrigation',
          'fertilizer_application',
          'pruning',
          'other'
        ),
      },
      intervention_description: {
        type: DataTypes.TEXT,
      },
      cost: {
        type: DataTypes.DECIMAL(10, 2),
      },
      result_observed: {
        type: DataTypes.TEXT,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'FarmerInterventionLog',
      tableName: 'farmer_intervention_logs',
      timestamps: true,
      underscored: true,
    }
  );

  return FarmerInterventionLog;
};
