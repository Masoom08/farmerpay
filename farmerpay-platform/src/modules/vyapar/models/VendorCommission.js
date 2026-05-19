'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorCommission extends Model {
    static associate(models) {
      VendorCommission.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorCommission.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      commission_period_month: { type: DataTypes.INTEGER, allowNull: false },
      commission_period_year: { type: DataTypes.INTEGER, allowNull: false },
      sales_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      commission_rate_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      commission_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      commission_paid: { type: DataTypes.BOOLEAN, defaultValue: false },
      commission_paid_date: { type: DataTypes.DATEONLY, allowNull: true },
      payment_method: { type: DataTypes.STRING(50), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorCommission', tableName: 'vendor_commissions',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['vendor_id', 'commission_period_month', 'commission_period_year'], unique: true },
      ],
    }
  );

  return VendorCommission;
};
