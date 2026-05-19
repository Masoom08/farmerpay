/**
 * TrustHouseholdExpense Model
 * One row per (farmer, year, month). Captures monthly household expense
 * snapshot. Powers the disposable-income / leverage calculation alongside
 * TrustFarmerActivityMix (income) and TrustLoanLiability (debt service).
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrustHouseholdExpense extends Model {
    static associate(models) {
      TrustHouseholdExpense.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  TrustHouseholdExpense.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    expense_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false },
    reference_year: { type: DataTypes.INTEGER, allowNull: false },
    reference_month: { type: DataTypes.INTEGER, allowNull: false },

    food_inr: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    education_inr: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    health_inr: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    utilities_inr: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    transport_inr: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    rent_inr: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    farm_inputs_inr: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    loan_emi_inr: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    savings_inr: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    other_inr: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

    total_inr: { type: DataTypes.DECIMAL(11, 2), allowNull: false, defaultValue: 0 },

    confidence: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      allowNull: false,
      defaultValue: 'MEDIUM',
    },
    source: {
      type: DataTypes.ENUM('FARMER_DECLARED', 'AGENT_VERIFIED', 'BACKFILL'),
      allowNull: false,
      defaultValue: 'FARMER_DECLARED',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    sequelize,
    modelName: 'TrustHouseholdExpense',
    tableName: 'trust_household_expenses',
    timestamps: true,
    underscored: true,
  });

  return TrustHouseholdExpense;
};
