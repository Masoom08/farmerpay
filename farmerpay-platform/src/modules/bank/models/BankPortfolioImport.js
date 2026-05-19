/**
 * BankPortfolioImport Model
 * Tracks CSV/Excel imports of gold loan portfolio data from bank staff.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BankPortfolioImport extends Model {
    static associate(models) {
      BankPortfolioImport.belongsTo(models.User, { foreignKey: 'uploaded_by', as: 'uploader' });
      BankPortfolioImport.hasMany(models.BankLoanAccount, { foreignKey: 'import_id', as: 'loanAccounts' });
    }
  }

  BankPortfolioImport.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      import_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      uploaded_by: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      file_name: { type: DataTypes.STRING(255), allowNull: false },
      file_type: { type: DataTypes.ENUM('csv', 'xlsx'), allowNull: false },
      bank_name: { type: DataTypes.STRING(100), allowNull: true },
      branch_code: { type: DataTypes.STRING(20), allowNull: true },
      total_rows: { type: DataTypes.INTEGER, allowNull: true },
      imported_rows: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      failed_rows: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      import_status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'partial'),
        defaultValue: 'pending',
      },
      error_log: { type: DataTypes.JSON, allowNull: true },
      import_completed_at: { type: DataTypes.DATE, allowNull: true },
      payload_hash: { type: DataTypes.STRING(64), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'BankPortfolioImport', tableName: 'bank_portfolio_imports',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['import_uuid'], unique: true }, { fields: ['uploaded_by'] }, { fields: ['import_status'] }],
    }
  );

  return BankPortfolioImport;
};
