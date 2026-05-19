const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanRepayment extends Model {
    static associate(models) {
      LoanRepayment.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' });
      LoanRepayment.belongsTo(models.BankLoanAccount, { foreignKey: 'bank_loan_account_id', as: 'bankLoanAccount' });
      LoanRepayment.belongsTo(models.LoanRepaymentSchedule, { foreignKey: 'schedule_id', as: 'schedule' });
    }
  }
  LoanRepayment.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    repayment_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    // A row belongs to EITHER a FarmerPay origination (application_id) OR a
    // bank-imported loan (bank_loan_account_id) — never both.
    application_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'loan_applications', key: 'id' },
    },
    bank_loan_account_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'bank_loan_accounts', key: 'id' },
    },
    schedule_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'loan_repayment_schedules', key: 'id' } },
    repayment_date: { type: DataTypes.DATEONLY, allowNull: false },
    repayment_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    payment_method: { type: DataTypes.ENUM('bank_transfer', 'cash', 'check', 'digital_wallet'), defaultValue: 'bank_transfer' },
    utr_reference: { type: DataTypes.STRING(50), allowNull: true },
    repaid_by_farmer: { type: DataTypes.INTEGER, allowNull: true },
    recorded_by_agent: { type: DataTypes.INTEGER, allowNull: true },
    is_subvention_eligible: { type: DataTypes.BOOLEAN, defaultValue: false },
    subvention_rate_pct: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    subvention_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    prompt_repayment_bonus: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'LoanRepayment', tableName: 'loan_repayments',
    timestamps: true, underscored: true,
    indexes: [
      { name: 'idx_lr_bank_loan_account_id', fields: ['bank_loan_account_id'] },
    ],
  });
  return LoanRepayment;
};
