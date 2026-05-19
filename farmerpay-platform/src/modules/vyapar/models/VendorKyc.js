'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorKyc extends Model {
    static associate(models) {
      VendorKyc.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorKyc.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        unique: true,
        references: {
          model: 'vendor_profiles',
          key: 'id',
        },
      },
      kyc_status: {
        type: DataTypes.ENUM('pending', 'verified', 'rejected', 'expired'),
        defaultValue: 'pending',
      },
      kyc_verified_at: {
        type: DataTypes.DATE,
      },
      kyc_verified_by: {
        type: DataTypes.INTEGER,
      },
      shop_visited_by_agent: {
        type: DataTypes.INTEGER,
      },
      shop_visit_date: {
        type: DataTypes.DATEONLY,
      },
      gst_certificate_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      bank_account_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VendorKyc',
      tableName: 'vendor_kyc',
      timestamps: true,
      underscored: true,
    }
  );

  return VendorKyc;
};
