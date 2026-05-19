/**
 * TrustLoanLiability Model
 * One row per existing loan a farmer has — formal or informal. Lives in the
 * trust module so debt + score stay under one name.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrustLoanLiability extends Model {
    static associate(models) {
      TrustLoanLiability.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      TrustLoanLiability.hasMany(models.TrustLoanRepayment, {
        foreignKey: 'liability_id',
        as: 'repayments',
      });
    }
  }

  TrustLoanLiability.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    loan_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false },
    lender_type: {
      type: DataTypes.ENUM(
        'BANK', 'NBFC', 'MFI', 'COOP', 'SHG', 'MONEYLENDER',
        'RELATIVE', 'FPO', 'GOVT_SCHEME', 'OTHER',
      ),
      allowNull: false,
    },
    lender_name: { type: DataTypes.STRING(120), allowNull: true },
    loan_purpose: {
      type: DataTypes.ENUM(
        'KCC', 'CROP', 'DAIRY', 'FISHERY', 'GOLD', 'PERSONAL',
        'HOUSING', 'EDUCATION', 'CONSUMER', 'BUSINESS', 'OTHER',
      ),
      allowNull: false,
    },
    principal_inr: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    outstanding_inr: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    interest_rate_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    tenure_months: { type: DataTypes.INTEGER, allowNull: true },
    emi_inr: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    emi_frequency: {
      type: DataTypes.ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'BULLET'),
      allowNull: false,
      defaultValue: 'MONTHLY',
    },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'CLOSED', 'DEFAULTED', 'RESTRUCTURED', 'WRITTEN_OFF'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    is_secured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    collateral_description: { type: DataTypes.TEXT, allowNull: true },
    source: {
      type: DataTypes.ENUM('FARMER_DECLARED', 'AGENT_VERIFIED', 'BUREAU', 'INTERNAL', 'BACKFILL'),
      allowNull: false,
      defaultValue: 'FARMER_DECLARED',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    sequelize,
    modelName: 'TrustLoanLiability',
    tableName: 'trust_loan_liabilities',
    timestamps: true,
    underscored: true,
  });

  return TrustLoanLiability;
};
