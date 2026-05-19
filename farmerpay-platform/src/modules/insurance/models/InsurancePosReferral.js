/**
 * InsurancePosReferral Model — Insurance Phase 2
 *
 * Funnel row: one per farmer action (viewed / quoted / referred) on a
 * given insurance product. Tracks the full POS journey so bankers can
 * report on conversion rates and product popularity.
 *
 * No foreign-key to a policy — issuance happens at the insurer, not
 * at FarmerPay. The `converted` flag is optionally set by a banker
 * after back-channel verification with the insurer.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InsurancePosReferral extends Model {
    static associate(models) {
      InsurancePosReferral.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
      InsurancePosReferral.belongsTo(models.InsuranceProduct, {
        foreignKey: 'product_id',
        as: 'product',
      });
    }
  }

  InsurancePosReferral.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      referral_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'pos_insurance_products', key: 'id' },
      },
      action: {
        type: DataTypes.ENUM('viewed', 'quoted', 'referred'),
        allowNull: false,
      },
      quoted_sum_insured: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      quoted_premium_farmer: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      quoted_premium_subsidy: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      quoted_area_hectares: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      quoted_crop: { type: DataTypes.STRING(50), allowNull: true },
      quoted_season: { type: DataTypes.STRING(20), allowNull: true },
      cycle_id: { type: DataTypes.STRING(36), allowNull: true },
      converted: { type: DataTypes.BOOLEAN, allowNull: true },
      conversion_notes: { type: DataTypes.TEXT, allowNull: true },
      referred_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'InsurancePosReferral',
      tableName: 'pos_insurance_referrals',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['referral_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['product_id'] },
        { fields: ['action'] },
      ],
    },
  );

  return InsurancePosReferral;
};
