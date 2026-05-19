/**
 * AaBankStatementSummary Model
 * Aggregated bank statement metrics from Account Aggregator: credits, debits, balances, risk signals.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AaBankStatementSummary extends Model {
    static associate(models) {
      AaBankStatementSummary.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      AaBankStatementSummary.belongsTo(models.AaConsent, { foreignKey: 'consent_id', as: 'consent' });
    }
  }

  AaBankStatementSummary.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      summary_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      consent_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'aa_consents', key: 'id' },
      },
      bank_name: { type: DataTypes.STRING(100), allowNull: true },
      account_type: {
        type: DataTypes.ENUM('savings', 'current', 'kcc', 'loan'), allowNull: true,
      },
      period_months: { type: DataTypes.INTEGER, allowNull: true },

      // Aggregated metrics
      avg_monthly_credit: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      avg_monthly_debit: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      avg_monthly_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      min_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      max_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: true },

      // Income signals
      salary_dbt_credits: { type: DataTypes.INTEGER, allowNull: true },
      govt_subsidy_credits: { type: DataTypes.INTEGER, allowNull: true },
      upi_transaction_count: { type: DataTypes.INTEGER, allowNull: true },
      avg_upi_value: { type: DataTypes.DECIMAL(10, 2), allowNull: true },

      // Risk signals
      bounce_count: { type: DataTypes.INTEGER, allowNull: true },
      emi_debit_count: { type: DataTypes.INTEGER, allowNull: true },
      cash_withdrawal_ratio: { type: DataTypes.DECIMAL(5, 2), allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'AaBankStatementSummary', tableName: 'aa_bank_statement_summaries',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['summary_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['consent_id'] },
      ],
    }
  );

  return AaBankStatementSummary;
};
