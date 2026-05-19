'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorCreditSummary extends Model {
    static associate(models) {
      VendorCreditSummary.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorCreditSummary.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      total_credit_given: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      total_credit_collected: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      total_credit_outstanding: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      credit_default_rate_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      number_of_credit_farmers: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      average_credit_period_days: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorCreditSummary', tableName: 'vendor_credit_summaries',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id'], unique: true }],
    }
  );

  return VendorCreditSummary;
};
