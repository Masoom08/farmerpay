const { Model } = require('sequelize');
const STATUSES = ['draft', 'submitted', 'under_review', 'forwarded_to_bank', 'bank_review', 'approved', 'rejected', 'disbursed', 'active', 'closed', 'defaulted'];
module.exports = (sequelize, DataTypes) => {
  class LoanApplicationStatusHistory extends Model {
    static associate(models) { LoanApplicationStatusHistory.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' }); }
  }
  LoanApplicationStatusHistory.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    application_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
    from_status: { type: DataTypes.ENUM(...STATUSES), allowNull: true },
    to_status: { type: DataTypes.ENUM(...STATUSES), allowNull: false },
    transitioned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    transitioned_by: { type: DataTypes.INTEGER, allowNull: true },
    transition_reason: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanApplicationStatusHistory', tableName: 'loan_application_status_history', timestamps: true, underscored: true });
  return LoanApplicationStatusHistory;
};
