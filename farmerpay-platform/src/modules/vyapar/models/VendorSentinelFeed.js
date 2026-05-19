'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorSentinelFeed extends Model {
    static associate(models) {
      VendorSentinelFeed.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorSentinelFeed.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      feed_date: { type: DataTypes.DATEONLY, allowNull: false },
      high_credit_exposure_farmers: { type: DataTypes.INTEGER, allowNull: true },
      overdue_credit_above_30days: { type: DataTypes.INTEGER, allowNull: true },
      total_overdue_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      credit_default_risk: {
        type: DataTypes.ENUM('low', 'medium', 'high'), allowNull: true,
      },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorSentinelFeed', tableName: 'vendor_sentinel_feeds',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id'] }, { fields: ['feed_date'] }],
    }
  );

  return VendorSentinelFeed;
};
