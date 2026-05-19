/**
 * DairyLinkedLoanUtilization Model
 * Tracks loan fund utilization for dairy activities.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DairyLinkedLoanUtilization extends Model {
    static associate(models) {
      DairyLinkedLoanUtilization.belongsTo(models.DairyHerdRegister, { foreignKey: 'herd_id', as: 'herd' });
      DairyLinkedLoanUtilization.belongsTo(models.LoanApplication, { foreignKey: 'linked_loan_application_id', as: 'loanApplication' });
    }
  }

  DairyLinkedLoanUtilization.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      herd_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'dairy_herd_registers', key: 'id' },
      },
      linked_loan_application_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'loan_applications', key: 'id' },
      },
      utilization_date: { type: DataTypes.DATEONLY, allowNull: true },
      utilized_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      utilization_purpose: { type: DataTypes.STRING(200), allowNull: true },
      verification_photo_url: { type: DataTypes.STRING(255), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'DairyLinkedLoanUtilization', tableName: 'dairy_linked_loan_utilization',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['herd_id'] }, { fields: ['linked_loan_application_id'] }],
    }
  );

  return DairyLinkedLoanUtilization;
};
