'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultivationCycleLoanLinkage extends Model {
    static associate(models) {
      CultivationCycleLoanLinkage.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  CultivationCycleLoanLinkage.init(
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
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      linkage_type: {
        type: DataTypes.ENUM('for_inputs', 'for_working_capital', 'for_equipment'),
      },
      linkage_confirmed_at: {
        type: DataTypes.DATE,
      },
      linkage_confirmed_by: {
        type: DataTypes.INTEGER,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'CultivationCycleLoanLinkage',
      tableName: 'cultivation_cycle_loan_linkages',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['cycle_id', 'application_id'],
        },
      ],
    }
  );

  return CultivationCycleLoanLinkage;
};
