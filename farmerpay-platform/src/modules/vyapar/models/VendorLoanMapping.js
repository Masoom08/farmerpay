'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorLoanMapping extends Model {
    static associate(models) {
      VendorLoanMapping.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
      VendorLoanMapping.hasMany(models.VendorLoanUtilization, { foreignKey: 'mapping_id', as: 'utilizations' });
    }
  }

  VendorLoanMapping.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'vendor_profiles',
          key: 'id',
        },
      },
      loan_application_id: {
        type: DataTypes.INTEGER,
      },
      link_type: {
        type: DataTypes.ENUM('input_supply_for_loan', 'credit_given_for_loan', 'equipment_supply_for_loan'),
      },
      mapping_status: {
        type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
        defaultValue: 'pending',
      },
      mapped_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      mapped_by: {
        type: DataTypes.INTEGER,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VendorLoanMapping',
      tableName: 'vendor_loan_mappings',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['vendor_id', 'loan_application_id'],
        },
      ],
    }
  );

  return VendorLoanMapping;
};
