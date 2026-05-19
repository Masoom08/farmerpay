/**
 * DicePostharvestTopupLoan Model — Post-harvest top-up loan hypothecated against stored produce.
 */
const { Model } = require('sequelize');
const LOAN_STATUSES = ['applied', 'approved', 'disbursed', 'partially_repaid', 'closed', 'defaulted'];

module.exports = (sequelize, DataTypes) => {
  class DicePostharvestTopupLoan extends Model {
    static associate(models) {
      DicePostharvestTopupLoan.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      DicePostharvestTopupLoan.belongsTo(models.LoanApplication, { foreignKey: 'parent_loan_application_id', as: 'parentLoan' });
      DicePostharvestTopupLoan.belongsTo(models.PulseCommodity, { foreignKey: 'commodity_id', targetKey: 'commodity_id', as: 'commodity' });
      DicePostharvestTopupLoan.belongsTo(models.DiceWarehouseRegistry, { foreignKey: 'warehouse_id', as: 'warehouse' });
      DicePostharvestTopupLoan.hasMany(models.DiceProduceHypothecationLog, { foreignKey: 'topup_loan_id', as: 'hypothecationLogs' });
    }
  }
  DicePostharvestTopupLoan.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    topup_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    parent_loan_application_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
    cycle_id: { type: DataTypes.STRING(36), allowNull: true },
    commodity_id: { type: DataTypes.STRING(36), allowNull: false },
    // Produce details
    produce_quantity_quintals: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    produce_grade: { type: DataTypes.ENUM('A', 'B', 'C'), defaultValue: 'B' },
    produce_valuation_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    produce_total_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    // Loan details
    topup_loan_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    ltv_ratio: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    interest_rate_annual: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    interest_subvention_applicable: { type: DataTypes.BOOLEAN, defaultValue: false },
    effective_interest_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    loan_tenure_days: { type: DataTypes.INTEGER, defaultValue: 90 },
    disbursement_date: { type: DataTypes.DATEONLY, allowNull: true },
    maturity_date: { type: DataTypes.DATEONLY, allowNull: true },
    loan_status: { type: DataTypes.ENUM(...LOAN_STATUSES), defaultValue: 'applied' },
    // Warehouse / storage
    warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
    warehouse_receipt_number: { type: DataTypes.STRING(100), allowNull: true },
    enwr_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    storage_cost_per_quintal_per_day: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    // Repayment
    total_interest_accrued: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    total_storage_cost_accrued: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    amount_repaid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    amount_outstanding: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    // PULSE linkage
    pulse_forecast_at_application: { type: DataTypes.JSON, allowNull: true },
    recommended_sell_window: { type: DataTypes.STRING(50), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize,
    modelName: 'DicePostharvestTopupLoan',
    tableName: 'dice_postharvest_topup_loans',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['farmer_id', 'loan_status'] },
      { fields: ['parent_loan_application_id'] },
      { fields: ['commodity_id'] }
    ]
  });
  return DicePostharvestTopupLoan;
};
