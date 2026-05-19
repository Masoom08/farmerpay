/**
 * BankDataEntry Model
 * Manual data entry records by bank staff for individual loan accounts.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BankDataEntry extends Model {
    static associate(models) {
      BankDataEntry.belongsTo(models.BankLoanAccount, { foreignKey: 'loan_account_id', as: 'loanAccount' });
      BankDataEntry.belongsTo(models.User, { foreignKey: 'entered_by', as: 'enteredByUser' });
    }
  }

  BankDataEntry.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      entry_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      loan_account_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'bank_loan_accounts', key: 'id' },
      },
      entered_by: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      entry_type: {
        type: DataTypes.ENUM(
          'repayment_update', 'sma_update', 'collateral_update',
          'disbursement_event', 'closure_event', 'topup_event', 'general_note'
        ),
        allowNull: false,
      },
      entry_data: { type: DataTypes.JSON, allowNull: false },
      entry_notes: { type: DataTypes.TEXT, allowNull: true },
      processed: { type: DataTypes.BOOLEAN, defaultValue: false },
      processed_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'BankDataEntry', tableName: 'bank_data_entries',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['entry_uuid'], unique: true },
        { fields: ['loan_account_id'] },
        { fields: ['entry_type'] },
        { fields: ['processed'] },
      ],
    }
  );

  return BankDataEntry;
};
