/**
 * TrustLoanRepayment Model
 * One row per scheduled or actual installment for a TrustLoanLiability.
 * Powers the repayment-discipline signal in the TRUST score.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrustLoanRepayment extends Model {
    static associate(models) {
      TrustLoanRepayment.belongsTo(models.TrustLoanLiability, {
        foreignKey: 'liability_id',
        as: 'liability',
      });
      TrustLoanRepayment.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  TrustLoanRepayment.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    repayment_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    liability_id: { type: DataTypes.INTEGER, allowNull: false },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false },
    installment_number: { type: DataTypes.INTEGER, allowNull: true },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    due_amount_inr: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    paid_date: { type: DataTypes.DATEONLY, allowNull: true },
    paid_amount_inr: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    status: {
      type: DataTypes.ENUM('UPCOMING', 'PAID_ONTIME', 'PAID_LATE', 'PARTIAL', 'MISSED'),
      allowNull: false,
      defaultValue: 'UPCOMING',
    },
    days_late: { type: DataTypes.INTEGER, allowNull: true },
    payment_channel: {
      type: DataTypes.ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER'),
      allowNull: true,
    },
    reference_number: { type: DataTypes.STRING(120), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    sequelize,
    modelName: 'TrustLoanRepayment',
    tableName: 'trust_loan_repayments',
    timestamps: true,
    underscored: true,
  });

  return TrustLoanRepayment;
};
