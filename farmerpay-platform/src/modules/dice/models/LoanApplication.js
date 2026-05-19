/**
 * LoanApplication Model — Core loan application with full lifecycle status tracking.
 */
const { Model } = require('sequelize');
const APP_STATUSES = ['draft', 'submitted', 'under_review', 'forwarded_to_bank', 'bank_review', 'approved', 'rejected', 'disbursed', 'active', 'closed', 'defaulted'];

module.exports = (sequelize, DataTypes) => {
  class LoanApplication extends Model {
    static associate(models) {
      LoanApplication.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      LoanApplication.belongsTo(models.LoanProduct, { foreignKey: 'loan_product_id', as: 'product' });
      LoanApplication.hasMany(models.LoanApplicationStatus, { foreignKey: 'application_id', as: 'statuses' });
      LoanApplication.hasMany(models.LoanApplicationStatusHistory, { foreignKey: 'application_id', as: 'statusHistory' });
      LoanApplication.hasMany(models.LoanApplicationDocument, { foreignKey: 'application_id', as: 'documents' });
      LoanApplication.hasMany(models.LoanApplicationBankNote, { foreignKey: 'application_id', as: 'bankNotes' });
      LoanApplication.hasMany(models.LoanDisbursement, { foreignKey: 'application_id', as: 'disbursements' });
      LoanApplication.hasMany(models.LoanRepaymentSchedule, { foreignKey: 'application_id', as: 'repaymentSchedule' });
      LoanApplication.hasMany(models.LoanRepayment, { foreignKey: 'application_id', as: 'repayments' });
      LoanApplication.hasOne(models.LoanInsuranceBundled, { foreignKey: 'application_id', as: 'insurance' });
    }
  }
  LoanApplication.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    application_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    loan_product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_products', key: 'id' } },
    apply_for_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    apply_for_tenure_months: { type: DataTypes.INTEGER, allowNull: false },
    intended_use: { type: DataTypes.STRING(200), allowNull: true },
    existing_loan_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    existing_loan_lender: { type: DataTypes.STRING(100), allowNull: true },
    application_status: { type: DataTypes.ENUM(...APP_STATUSES), defaultValue: 'draft' },
    applied_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    application_verified_by_agent: { type: DataTypes.INTEGER, allowNull: true },
    application_verified_at: { type: DataTypes.DATE, allowNull: true },
    rejected_reason: { type: DataTypes.TEXT, allowNull: true },
    approval_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    approval_interest_rate: { type: DataTypes.DECIMAL(5, 3), allowNull: true },
    approval_tenure_months: { type: DataTypes.INTEGER, allowNull: true },
    approved_by_bank_user: { type: DataTypes.INTEGER, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    risk_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    // Input-cost-based loan sizing (DLTC + NABARD)
    sof_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'Scale of Finance used for this application' },
    pop_id: { type: DataTypes.STRING(36), allowNull: true, comment: 'PoP used for input calculation' },
    field_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'Farmer field for area calculation' },
    calculated_recommended_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'System-calculated amount from inputs + SoF' },
    input_cost_breakdown: { type: DataTypes.JSON, allowNull: true, comment: '{ seeds: 5000, fertiliser: 13500, pesticide: 2100, labour: 22500, ... }' },
    sof_cost_per_hectare: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'DLTC norm applied' },
    nabard_benchmark_per_hectare: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'NABARD reference' },
    amount_above_sof: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'Extra above SoF norm (if any, needs bank review)' },
    sizing_method: { type: DataTypes.ENUM('manual', 'input_cost_based', 'hybrid'), defaultValue: 'manual' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanApplication', tableName: 'loan_applications', timestamps: true, underscored: true,
    indexes: [{ fields: ['farmer_id', 'application_status'] }] });
  return LoanApplication;
};
