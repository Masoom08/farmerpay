/**
 * GoldLoanLtvMonitor Model
 * Tracks LTV ratio over time per RBI tiered structure (85%/80%/75%).
 * Handles maturity-adjusted LTV for bullet loans.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoldLoanLtvMonitor extends Model {
    static associate(models) {
      GoldLoanLtvMonitor.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' });
    }
  }

  GoldLoanLtvMonitor.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      monitor_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      monitor_date: { type: DataTypes.DATEONLY, allowNull: false },

      // Loan amounts
      loan_amount_slab: {
        type: DataTypes.ENUM('upto_2_5_lakh', '2_5_to_5_lakh', 'above_5_lakh'), allowNull: true,
      },
      sanctioned_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      principal_outstanding: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      accrued_interest: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      total_exposure: { type: DataTypes.DECIMAL(15, 2), allowNull: true },

      // Gold valuation (current)
      current_gold_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      ibja_price_date: { type: DataTypes.DATEONLY, allowNull: true },

      // LTV calculation
      applicable_ltv_cap_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      current_ltv_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      maturity_adjusted_ltv_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      is_bullet_loan: { type: DataTypes.BOOLEAN, defaultValue: false },

      // Compliance
      ltv_breach: { type: DataTypes.BOOLEAN, defaultValue: false },
      ltv_breach_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      margin_call_triggered: { type: DataTypes.BOOLEAN, defaultValue: false },
      action_required: { type: DataTypes.STRING(200), allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'GoldLoanLtvMonitor', tableName: 'gold_loan_ltv_monitors',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['monitor_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['monitor_date'] },
        { fields: ['ltv_breach'] },
      ],
    }
  );

  return GoldLoanLtvMonitor;
};
