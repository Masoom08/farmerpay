'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorProfile extends Model {
    static associate(models) {
      VendorProfile.belongsTo(models.User, { foreignKey: 'vendor_user_id', as: 'user' });
      VendorProfile.hasMany(models.VendorShop, { foreignKey: 'vendor_id', as: 'shops' });
      VendorProfile.hasMany(models.VendorServiceArea, { foreignKey: 'vendor_id', as: 'serviceAreas' });
      VendorProfile.hasMany(models.VendorProductCatalog, { foreignKey: 'vendor_id', as: 'productCatalogs' });
      VendorProfile.hasMany(models.VendorTransaction, { foreignKey: 'vendor_id', as: 'transactions' });
      VendorProfile.hasMany(models.VendorLoanMapping, { foreignKey: 'vendor_id', as: 'loanMappings' });
      VendorProfile.hasMany(models.VendorCreditLedger, { foreignKey: 'vendor_id', as: 'creditLedgers' });
      VendorProfile.hasMany(models.VendorInventory, { foreignKey: 'vendor_id', as: 'inventories' });
      VendorProfile.hasMany(models.VendorFarmerLink, { foreignKey: 'vendor_id', as: 'farmerLinks' });
      VendorProfile.hasMany(models.VendorPerformance, { foreignKey: 'vendor_id', as: 'performances' });
      VendorProfile.hasMany(models.VendorRating, { foreignKey: 'vendor_id', as: 'ratings' });
      VendorProfile.hasOne(models.VendorKyc, { foreignKey: 'vendor_id', as: 'kyc' });
      VendorProfile.hasOne(models.VendorCreditSummary, { foreignKey: 'vendor_id', as: 'creditSummary' });
      VendorProfile.hasOne(models.VendorPurchaseBehaviorScore, { foreignKey: 'vendor_id', as: 'purchaseBehaviorScore' });
    }
  }

  VendorProfile.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_user_id: {
        type: DataTypes.INTEGER,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      vendor_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
      },
      vendor_name: {
        type: DataTypes.STRING(150),
      },
      vendor_code: {
        type: DataTypes.STRING(50),
        unique: true,
      },
      vendor_type: {
        type: DataTypes.ENUM(
          'seeds_distributor',
          'fertilizer_supplier',
          'pesticide_dealer',
          'equipment_supplier',
          'multipurpose_dealer'
        ),
      },
      business_registration_number: {
        type: DataTypes.STRING(50),
      },
      business_pan: {
        type: DataTypes.STRING(10),
      },
      shop_name: {
        type: DataTypes.STRING(150),
      },
      shop_latitude: {
        type: DataTypes.DECIMAL(10, 8),
      },
      shop_longitude: {
        type: DataTypes.DECIMAL(11, 8),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VendorProfile',
      tableName: 'vendor_profiles',
      timestamps: true,
      underscored: true,
    }
  );

  return VendorProfile;
};
