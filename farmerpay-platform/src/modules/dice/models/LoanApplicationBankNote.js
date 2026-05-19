const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanApplicationBankNote extends Model {
    static associate(models) { LoanApplicationBankNote.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' }); }
  }
  LoanApplicationBankNote.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    application_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
    bank_officer_id: { type: DataTypes.INTEGER, allowNull: false },
    note_text: { type: DataTypes.TEXT, allowNull: false },
    note_type: { type: DataTypes.ENUM('internal_review', 'verification_needed', 'risk_flag', 'approval_comment'), defaultValue: 'internal_review' },
    noted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanApplicationBankNote', tableName: 'loan_application_bank_notes', timestamps: true, underscored: true });
  return LoanApplicationBankNote;
};
