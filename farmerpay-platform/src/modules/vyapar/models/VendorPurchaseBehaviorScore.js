'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorPurchaseBehaviorScore extends Model {
    static associate(models) {
      VendorPurchaseBehaviorScore.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorPurchaseBehaviorScore.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      farmer_count_score: { type: DataTypes.INTEGER, allowNull: true },
      sales_consistency_score: { type: DataTypes.INTEGER, allowNull: true },
      credit_repayment_score: { type: DataTypes.INTEGER, allowNull: true },
      customer_satisfaction_score: { type: DataTypes.INTEGER, allowNull: true },
      product_quality_score: { type: DataTypes.INTEGER, allowNull: true },
      overall_performance_score: { type: DataTypes.INTEGER, allowNull: true },
      scoring_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorPurchaseBehaviorScore', tableName: 'vendor_purchase_behavior_scores',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id'], unique: true }],
    }
  );

  return VendorPurchaseBehaviorScore;
};
