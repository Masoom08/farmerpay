'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorPerformance extends Model {
    static associate(models) {
      VendorPerformance.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorPerformance.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      performance_month: { type: DataTypes.INTEGER, allowNull: false },
      performance_year: { type: DataTypes.INTEGER, allowNull: false },
      total_transactions: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      total_revenue: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      total_credit_given: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      total_credit_recovered: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      unique_farmers_served: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      average_rating: { type: DataTypes.DECIMAL(3, 1), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorPerformance', tableName: 'vendor_performances',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id'] }, { fields: ['performance_month', 'performance_year'] }],
    }
  );

  return VendorPerformance;
};
