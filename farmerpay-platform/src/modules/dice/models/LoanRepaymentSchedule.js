const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanRepaymentSchedule extends Model {
    static associate(models) {
      LoanRepaymentSchedule.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' });
      LoanRepaymentSchedule.belongsTo(models.BankLoanAccount, { foreignKey: 'bank_loan_account_id', as: 'bankLoanAccount' });
      LoanRepaymentSchedule.hasMany(models.LoanRepayment, { foreignKey: 'schedule_id', as: 'repayments' });
    }
  }
  LoanRepaymentSchedule.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    // A row belongs to EITHER a FarmerPay origination (application_id) OR a
    // bank-imported loan (bank_loan_account_id) — never both. Enforced at
    // the service layer, not the DB.
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
    schedule_number: { type: DataTypes.INTEGER, allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    due_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    principal_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    interest_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    is_paid: { type: DataTypes.BOOLEAN, defaultValue: false },
    paid_date: { type: DataTypes.DATEONLY, allowNull: true },
    paid_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    days_overdue: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.ENUM('pending', 'paid', 'overdue', 'forgiven'), defaultValue: 'pending' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'LoanRepaymentSchedule', tableName: 'loan_repayment_schedules',
    timestamps: true, underscored: true,
    indexes: [
      { fields: ['application_id', 'due_date'] },
      { name: 'idx_lrs_bank_loan_account_id', fields: ['bank_loan_account_id'] },
      { name: 'idx_lrs_bla_due_date', fields: ['bank_loan_account_id', 'due_date'] },
    ],
  });
  return LoanRepaymentSchedule;
};
