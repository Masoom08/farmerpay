/**
 * AaTransaction Model
 * Raw bank transactions from Account Aggregator for deep financial analysis.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AaTransaction extends Model {
    static associate(models) {
      AaTransaction.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      AaTransaction.belongsTo(models.AaConsent, { foreignKey: 'consent_id', as: 'consent' });
      AaTransaction.belongsTo(models.AaBankStatementSummary, { foreignKey: 'summary_id', as: 'summary' });
    }
  }

  AaTransaction.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      transaction_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      consent_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'aa_consents', key: 'id' },
      },
      summary_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'aa_bank_statement_summaries', key: 'id' },
      },
      txn_date: { type: DataTypes.DATEONLY, allowNull: false },
      txn_type: {
        type: DataTypes.ENUM('credit', 'debit'), allowNull: false,
      },
      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      balance_after: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      narration: { type: DataTypes.STRING(500), allowNull: true },
      reference: { type: DataTypes.STRING(100), allowNull: true },
      mode: { type: DataTypes.STRING(30), allowNull: true },
      income_category: { type: DataTypes.STRING(30), allowNull: true },
      expense_category: { type: DataTypes.STRING(30), allowNull: true },
      classification_confidence: { type: DataTypes.DECIMAL(3, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'AaTransaction', tableName: 'aa_transactions',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['transaction_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['consent_id'] },
        { fields: ['txn_date'] },
        { fields: ['income_category'] },
        { fields: ['expense_category'] },
        { fields: ['farmer_id', 'txn_date'], name: 'idx_aa_txn_farmer_date' },
      ],
    }
  );

  return AaTransaction;
};
