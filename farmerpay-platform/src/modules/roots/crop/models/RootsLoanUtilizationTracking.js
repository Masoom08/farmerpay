/**
 * RootsLoanUtilizationTracking Model — Joins DICE loans with ROOTS activity
 * to verify the loan was used for farming. Cross-references VYAPAR purchases.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RootsLoanUtilizationTracking extends Model {
    static associate(models) {
      RootsLoanUtilizationTracking.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      RootsLoanUtilizationTracking.belongsTo(models.LoanApplication, { foreignKey: 'loan_application_id', as: 'loanApplication' });
      RootsLoanUtilizationTracking.belongsTo(models.CultivationCycle, { foreignKey: 'cultivation_cycle_id', as: 'cultivationCycle' });
    }

    isAdequate() {
      return this.utilization_ratio >= 0.4;
    }
  }

  RootsLoanUtilizationTracking.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    loan_application_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
    cultivation_cycle_id: { type: DataTypes.INTEGER, allowNull: true },
    loan_purpose: { type: DataTypes.STRING(100), allowNull: true },
    sanctioned_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    disbursed_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    roots_total_input_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    vyapar_total_purchase: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    total_verified_expenditure: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    utilization_ratio: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    utilization_quality: { type: DataTypes.ENUM('GOOD', 'PARTIAL', 'POOR', 'SUSPICIOUS'), allowNull: false },
    assessment_date: { type: DataTypes.DATEONLY, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'RootsLoanUtilizationTracking', tableName: 'roots_loan_utilization_tracking',
    timestamps: true, underscored: true,
    indexes: [
      { fields: ['farmer_id', 'loan_application_id'] },
      { fields: ['utilization_quality'] },
    ],
  });

  return RootsLoanUtilizationTracking;
};
