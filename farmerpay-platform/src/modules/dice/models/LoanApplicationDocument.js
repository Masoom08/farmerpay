const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanApplicationDocument extends Model {
    static associate(models) { LoanApplicationDocument.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' }); }
  }
  LoanApplicationDocument.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    application_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
    document_id: { type: DataTypes.INTEGER, allowNull: true },
    document_type: { type: DataTypes.ENUM('kyc_aadhaar', 'land_document', 'bank_statement', 'income_proof', 'collateral_proof', 'other'), allowNull: false },
    is_mandatory: { type: DataTypes.BOOLEAN, defaultValue: false },
    verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    verified_by_bank_user: { type: DataTypes.INTEGER, allowNull: true },
    verified_at: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanApplicationDocument', tableName: 'loan_application_documents', timestamps: true, underscored: true });
  return LoanApplicationDocument;
};
