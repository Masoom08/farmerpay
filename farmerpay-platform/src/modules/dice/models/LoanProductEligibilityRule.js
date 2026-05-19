const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanProductEligibilityRule extends Model {
    static associate(models) { LoanProductEligibilityRule.belongsTo(models.LoanProduct, { foreignKey: 'product_id', as: 'product' }); }
  }
  LoanProductEligibilityRule.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_products', key: 'id' } },
    rule_type: { type: DataTypes.ENUM('min_trust_score', 'max_loan_amount', 'min_land_size', 'max_land_size', 'state_requirement', 'crop_requirement', 'age_requirement', 'fpo_requirement'), allowNull: false },
    rule_value: { type: DataTypes.STRING(100), allowNull: false },
    applies_if_condition: { type: DataTypes.JSON, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanProductEligibilityRule', tableName: 'loan_product_eligibility_rules', timestamps: true, underscored: true });
  return LoanProductEligibilityRule;
};
