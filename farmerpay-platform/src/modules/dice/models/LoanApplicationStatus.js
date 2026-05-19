const { Model } = require('sequelize');
const STATUSES = ['draft', 'submitted', 'under_review', 'forwarded_to_bank', 'bank_review', 'approved', 'rejected', 'disbursed', 'active', 'closed', 'defaulted'];
module.exports = (sequelize, DataTypes) => {
  class LoanApplicationStatus extends Model {
    static associate(models) { LoanApplicationStatus.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' }); }
  }
  LoanApplicationStatus.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    application_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
    status: { type: DataTypes.ENUM(...STATUSES), allowNull: false },
    status_changed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    changed_by: { type: DataTypes.INTEGER, allowNull: true },
    status_notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanApplicationStatus', tableName: 'loan_application_statuses', timestamps: true, underscored: true });
  return LoanApplicationStatus;
};
