const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanDisbursement extends Model {
    static associate(models) { LoanDisbursement.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' }); }
  }
  LoanDisbursement.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    disbursement_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    application_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
    disbursement_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    requested_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    transferred_to_bank_account_id: { type: DataTypes.INTEGER, allowNull: true },
    transferred_at: { type: DataTypes.DATE, allowNull: true },
    utr_reference_number: { type: DataTypes.STRING(50), allowNull: true },
    // Disbursement mode tracking (RBI flagged high cash disbursement)
    disbursement_mode: {
      type: DataTypes.ENUM('bank_transfer', 'upi', 'cheque', 'cash', 'demand_draft'),
      defaultValue: 'bank_transfer',
    },
    cash_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    digital_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanDisbursement', tableName: 'loan_disbursements', timestamps: true, underscored: true });
  return LoanDisbursement;
};
