const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanProduct extends Model {
    static associate(models) {
      LoanProduct.belongsTo(models.LoanProvider, { foreignKey: 'provider_id', as: 'provider' });
      LoanProduct.belongsTo(models.LoanCategory, { foreignKey: 'category_id', as: 'category' });
      LoanProduct.belongsTo(models.LoanSubcategory, { foreignKey: 'subcategory_id', as: 'subcategory' });
      LoanProduct.hasMany(models.LoanProductEligibilityRule, { foreignKey: 'product_id', as: 'eligibilityRules' });
      LoanProduct.hasMany(models.LoanApplication, { foreignKey: 'loan_product_id', as: 'applications' });
      LoanProduct.hasMany(models.FarmerLoanBookmark, { foreignKey: 'product_id', as: 'bookmarks' });
    }
  }
  LoanProduct.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    product_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    provider_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_providers', key: 'id' } },
    category_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_categories', key: 'id' } },
    subcategory_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'loan_subcategories', key: 'id' } },
    product_name: { type: DataTypes.STRING(150), allowNull: false },
    product_code: { type: DataTypes.STRING(50), allowNull: true },
    product_description: { type: DataTypes.TEXT, allowNull: true },
    min_loan_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    max_loan_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    min_interest_rate: { type: DataTypes.DECIMAL(5, 3), allowNull: true },
    max_interest_rate: { type: DataTypes.DECIMAL(5, 3), allowNull: true },
    processing_fee_percent: { type: DataTypes.DECIMAL(5, 3), allowNull: true },
    is_floating_rate: { type: DataTypes.BOOLEAN, defaultValue: false },
    tenure_months_min: { type: DataTypes.INTEGER, allowNull: true },
    tenure_months_max: { type: DataTypes.INTEGER, allowNull: true },
    repayment_frequency: { type: DataTypes.ENUM('weekly', 'monthly', 'quarterly', 'seasonal', 'custom'), defaultValue: 'monthly' },
    repayment_type: { type: DataTypes.ENUM('emi', 'bullet', 'interest_only', 'flexible'), defaultValue: 'emi' },
    moratorium_period_months: { type: DataTypes.INTEGER, defaultValue: 0 },
    // Gold loan product configuration
    collateral_type: {
      type: DataTypes.ENUM('none', 'gold', 'land', 'crop_hypothecation', 'equipment', 'other'),
      defaultValue: 'none',
    },
    is_gold_loan: { type: DataTypes.BOOLEAN, defaultValue: false },
    ltv_cap_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    max_bullet_tenure_months: { type: DataTypes.INTEGER, allowNull: true },
    // PSL configuration
    psl_eligible: { type: DataTypes.BOOLEAN, defaultValue: false },
    psl_category: {
      type: DataTypes.ENUM('agriculture', 'small_marginal_farmer', 'allied_activities', 'msme', 'other'),
      allowNull: true,
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanProduct', tableName: 'loan_products', timestamps: true, underscored: true, indexes: [{ fields: ['provider_id'] }] });
  return LoanProduct;
};
