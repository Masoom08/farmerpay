/**
 * InsuranceProduct Model — Insurance Phase 2
 *
 * Catalog of POS offers we display to farmers. Government-subsidized
 * schemes (PMFBY, RWBCIS, NLM, PMMSY) and non-subsidized private
 * products (HDFC Ergo, Bajaj Allianz, ICICI Lombard, Tata AIG).
 *
 * We are NOT the insurer — each row includes a deep_link_url, portal_url,
 * contact_phone, and branch_hint to redirect the farmer to the actual
 * issuing body.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InsuranceProduct extends Model {
    static associate(models) {
      InsuranceProduct.hasMany(models.InsurancePosReferral, {
        foreignKey: 'product_id',
        as: 'referrals',
      });
    }
  }

  InsuranceProduct.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      product_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      product_name: { type: DataTypes.STRING(200), allowNull: false },
      category: {
        type: DataTypes.ENUM('crop', 'horticulture', 'livestock', 'fisheries', 'multi'),
        allowNull: false,
      },
      subsidy_type: {
        type: DataTypes.ENUM('government', 'non_subsidized'),
        allowNull: false,
      },
      sub_scheme: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'pmfby | rwbcis | nlm | pmmsy | private',
      },
      insurer_name: { type: DataTypes.STRING(150), allowNull: true },
      farmer_premium_rate: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        comment: 'percent, e.g. 2.00 for 2% Kharif',
      },
      subsidy_pct: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        comment: 'government share percent; null for non_subsidized',
      },
      coverage_description: { type: DataTypes.TEXT, allowNull: true },
      eligibility_rules: { type: DataTypes.JSON, allowNull: true },
      deep_link_url: { type: DataTypes.STRING(500), allowNull: true },
      portal_url: { type: DataTypes.STRING(500), allowNull: true },
      contact_phone: { type: DataTypes.STRING(20), allowNull: true },
      branch_hint: { type: DataTypes.STRING(255), allowNull: true },
      display_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'InsuranceProduct',
      tableName: 'pos_insurance_products',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['product_code'], unique: true },
        { fields: ['subsidy_type', 'category'] },
      ],
    },
  );

  return InsuranceProduct;
};
