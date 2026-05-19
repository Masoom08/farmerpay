'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorLoanUtilization extends Model {
    static associate(models) {
      VendorLoanUtilization.belongsTo(models.VendorLoanMapping, { foreignKey: 'mapping_id', as: 'loanMapping' });
    }
  }

  VendorLoanUtilization.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      mapping_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'vendor_loan_mappings',
          key: 'id',
        },
      },
      utilization_date: {
        type: DataTypes.DATEONLY,
      },
      utilized_amount: {
        type: DataTypes.DECIMAL(15, 2),
      },
      utilization_description: {
        type: DataTypes.STRING(255),
      },
      verified_by_agent: {
        type: DataTypes.INTEGER,
      },
      verification_photo_url: {
        type: DataTypes.STRING(255),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VendorLoanUtilization',
      tableName: 'vendor_loan_utilizations',
      timestamps: true,
      underscored: true,
    }
  );

  return VendorLoanUtilization;
};
