'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorTrustFeed extends Model {
    static associate(models) {
      VendorTrustFeed.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorTrustFeed.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      feed_date: { type: DataTypes.DATEONLY, allowNull: false },
      farmers_served_with_credit: { type: DataTypes.INTEGER, allowNull: true },
      credit_repayment_rate_percent: { type: DataTypes.INTEGER, allowNull: true },
      average_credit_tenure_days: { type: DataTypes.INTEGER, allowNull: true },
      repeat_customer_percentage: { type: DataTypes.INTEGER, allowNull: true },
      farmer_satisfaction_rating: { type: DataTypes.DECIMAL(3, 1), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorTrustFeed', tableName: 'vendor_trust_feeds',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id'] }, { fields: ['feed_date'] }],
    }
  );

  return VendorTrustFeed;
};
