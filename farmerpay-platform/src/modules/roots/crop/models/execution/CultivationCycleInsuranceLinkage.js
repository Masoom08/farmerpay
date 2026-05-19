'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultivationCycleInsuranceLinkage extends Model {
    static associate(models) {
      CultivationCycleInsuranceLinkage.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  CultivationCycleInsuranceLinkage.init(
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
      insurance_product_name: {
        type: DataTypes.STRING(100),
      },
      insurance_provider: {
        type: DataTypes.STRING(100),
      },
      premium_paid: {
        type: DataTypes.DECIMAL(15, 2),
      },
      coverage_amount: {
        type: DataTypes.DECIMAL(15, 2),
      },
      claim_filed_amount: {
        type: DataTypes.DECIMAL(15, 2),
      },
      claim_settled_amount: {
        type: DataTypes.DECIMAL(15, 2),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'CultivationCycleInsuranceLinkage',
      tableName: 'cultivation_cycle_insurance_linkages',
      timestamps: true,
      underscored: true,
    }
  );

  return CultivationCycleInsuranceLinkage;
};
