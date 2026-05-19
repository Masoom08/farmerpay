'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultivationCycle extends Model {
    static associate(models) {
      CultivationCycle.belongsTo(models.Field, {
        foreignKey: 'field_id',
        as: 'field',
      });
      CultivationCycle.hasMany(models.WorkbandExecution, {
        foreignKey: 'cycle_id',
        as: 'workbandExecutions',
      });
      CultivationCycle.hasMany(models.HarvestRecord, {
        foreignKey: 'cycle_id',
        as: 'harvestRecords',
      });
      CultivationCycle.hasOne(models.CultivationCyclePlanning, {
        foreignKey: 'cycle_id',
        as: 'planning',
      });
      CultivationCycle.hasOne(models.CultivationCycleExpenseSummary, {
        foreignKey: 'cycle_id',
        as: 'expenseSummary',
      });
      CultivationCycle.hasOne(models.CultivationCycleIncomeSummary, {
        foreignKey: 'cycle_id',
        as: 'incomeSummary',
      });
      CultivationCycle.hasOne(models.CultivationCycleProfitability, {
        foreignKey: 'cycle_id',
        as: 'profitability',
      });
    }
  }

  CultivationCycle.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cycle_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      field_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'fields',
          key: 'id',
        },
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      crop_id: {
        type: DataTypes.STRING(36),
      },
      variety_id: {
        type: DataTypes.STRING(36),
      },
      pop_id: {
        type: DataTypes.STRING(36),
      },
      cycle_season: {
        type: DataTypes.ENUM('kharif', 'rabi', 'summer'),
      },
      cycle_year: {
        type: DataTypes.INTEGER,
      },
      cycle_sowing_date: {
        type: DataTypes.DATEONLY,
      },
      cycle_expected_harvest_date: {
        type: DataTypes.DATEONLY,
      },
      cycle_actual_harvest_date: {
        type: DataTypes.DATEONLY,
      },
      cycle_status: {
        type: DataTypes.ENUM(
          'planning',
          'preparation',
          'sowing',
          'growing',
          'monitoring',
          'harvesting',
          'post_harvest',
          'closed'
        ),
        defaultValue: 'planning',
      },
      linked_loan_id: {
        type: DataTypes.INTEGER,
      },
      linked_trust_score: {
        type: DataTypes.INTEGER,
      },
      // Phase 1 self-declaration → Phase 2 AgriStack cross-check
      self_declared_crop: { type: DataTypes.STRING(80), allowNull: true },
      self_declared_at: { type: DataTypes.DATE, allowNull: true },
      agristack_crop: { type: DataTypes.STRING(80), allowNull: true },
      agristack_crop_checked_at: { type: DataTypes.DATE, allowNull: true },
      agristack_crop_match: {
        type: DataTypes.ENUM('match', 'mismatch', 'unknown'),
        allowNull: false,
        defaultValue: 'unknown',
      },
      // Self-declared insurance (DICE verifies in Phase 2)
      self_declared_insurance_status: {
        type: DataTypes.ENUM('insured', 'not_insured', 'unknown'),
        allowNull: false,
        defaultValue: 'unknown',
      },
      self_declared_policy_no: { type: DataTypes.STRING(64), allowNull: true },
      dice_insurance_verified_at: { type: DataTypes.DATE, allowNull: true },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'CultivationCycle',
      tableName: 'cultivation_cycles',
      timestamps: true,
      underscored: true,
    }
  );

  return CultivationCycle;
};
