'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultivationCycleHealthMonitoring extends Model {
    static associate(models) {
      CultivationCycleHealthMonitoring.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  CultivationCycleHealthMonitoring.init(
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
      monitoring_date: {
        type: DataTypes.DATEONLY,
      },
      health_status: {
        type: DataTypes.ENUM('excellent', 'good', 'average', 'poor'),
      },
      pest_incidence_observed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      disease_incidence_observed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      pest_disease_name: {
        type: DataTypes.STRING(100),
      },
      affected_area_percent: {
        type: DataTypes.DECIMAL(5, 2),
      },
      action_taken: {
        type: DataTypes.TEXT,
      },
      monitoring_notes: {
        type: DataTypes.TEXT,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'CultivationCycleHealthMonitoring',
      tableName: 'cultivation_cycle_health_monitoring',
      timestamps: true,
      underscored: true,
    }
  );

  return CultivationCycleHealthMonitoring;
};
