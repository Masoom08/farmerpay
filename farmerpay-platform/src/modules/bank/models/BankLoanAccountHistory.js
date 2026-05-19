/**
 * BankLoanAccountHistory Model
 *
 * Daily time-series snapshot of every active bank_loan_account, written
 * by the NPA calculation cron job (src/jobs/bankNpaRecalcJob.js) that
 * runs at 02:00 local every day.
 *
 * This is the table the cohort report endpoints read from to plot
 * weekly SMA % trends for test vs control cohorts across the 3-month
 * pilot window.
 *
 * Dimensions (bank_name, district, cohort_tag, loan_type) are denormalized
 * from bank_loan_accounts + bank_portfolio_imports at snapshot time so
 * the aggregation queries stay on a single table with no joins.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BankLoanAccountHistory extends Model {
    static associate(models) {
      BankLoanAccountHistory.belongsTo(models.BankLoanAccount, {
        foreignKey: 'bank_loan_account_id',
        as: 'loanAccount',
      });
    }
  }

  BankLoanAccountHistory.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      bank_loan_account_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'bank_loan_accounts', key: 'id' },
      },
      bank_name: { type: DataTypes.STRING(100), allowNull: true },
      district: { type: DataTypes.STRING(100), allowNull: true },
      cohort_tag: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'unassigned',
      },
      loan_type: { type: DataTypes.STRING(40), allowNull: true },
      sma_classification: {
        type: DataTypes.ENUM('standard', 'sma_0', 'sma_1', 'sma_2', 'npa'),
        allowNull: false,
        defaultValue: 'standard',
      },
      days_past_due: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      outstanding_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      overdue_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      snapshot_date: { type: DataTypes.DATEONLY, allowNull: false },
    },
    {
      sequelize,
      modelName: 'BankLoanAccountHistory',
      tableName: 'bank_loan_account_histories',
      timestamps: true,
      underscored: true,
      indexes: [
        { name: 'idx_blah_bank_date', fields: ['bank_name', 'snapshot_date'] },
        { name: 'idx_blah_district_date', fields: ['district', 'snapshot_date'] },
        { name: 'idx_blah_account_date', fields: ['bank_loan_account_id', 'snapshot_date'] },
        { name: 'idx_blah_cohort_sma_date', fields: ['cohort_tag', 'sma_classification', 'snapshot_date'] },
      ],
    }
  );

  return BankLoanAccountHistory;
};
