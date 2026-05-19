'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HarvestRecord extends Model {
    static associate(models) {
      HarvestRecord.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
      HarvestRecord.hasMany(models.HarvestSaleRecord, {
        foreignKey: 'harvest_record_id',
        as: 'saleRecords',
      });
    }
  }

  HarvestRecord.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      record_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      cycle_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      harvest_start_date: {
        type: DataTypes.DATEONLY,
      },
      harvest_end_date: {
        type: DataTypes.DATEONLY,
      },
      total_harvest_quantity_kg: {
        type: DataTypes.INTEGER,
      },
      harvest_quality_grade: {
        type: DataTypes.STRING(50),
      },
      yield_per_hectare_kg: {
        type: DataTypes.INTEGER,
      },
      expected_yield_achieved_percent: {
        type: DataTypes.INTEGER,
      },
      loss_due_to_weather: {
        type: DataTypes.DECIMAL(5, 2),
      },
      loss_due_to_pest: {
        type: DataTypes.DECIMAL(5, 2),
      },
      loss_due_to_disease: {
        type: DataTypes.DECIMAL(5, 2),
      },
      post_harvest_loss_percent: {
        type: DataTypes.DECIMAL(5, 2),
      },
      harvest_notes: {
        type: DataTypes.TEXT,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'HarvestRecord',
      tableName: 'harvest_records',
      timestamps: true,
      underscored: true,
    }
  );

  return HarvestRecord;
};
