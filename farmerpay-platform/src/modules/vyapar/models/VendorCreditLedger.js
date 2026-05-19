'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorCreditLedger extends Model {
    static associate(models) {
      VendorCreditLedger.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
      VendorCreditLedger.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  VendorCreditLedger.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      current_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      credit_limit: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      last_payment_date: { type: DataTypes.DATEONLY, allowNull: true },
      last_payment_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      total_credit_given: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      total_payments_received: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorCreditLedger', tableName: 'vendor_credit_ledgers',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id', 'farmer_id'], unique: true }],
    }
  );

  return VendorCreditLedger;
};
