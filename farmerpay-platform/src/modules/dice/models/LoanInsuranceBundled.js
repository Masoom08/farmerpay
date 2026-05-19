const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanInsuranceBundled extends Model {
    static associate(models) { LoanInsuranceBundled.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' }); }
  }
  LoanInsuranceBundled.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    application_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
    insurance_product_name: { type: DataTypes.STRING(100), allowNull: true },
    insurance_provider: { type: DataTypes.STRING(100), allowNull: true },
    premium_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    premium_is_bundled: { type: DataTypes.BOOLEAN, defaultValue: true },
    coverage_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanInsuranceBundled', tableName: 'loan_insurance_bundled', timestamps: true, underscored: true });
  return LoanInsuranceBundled;
};
