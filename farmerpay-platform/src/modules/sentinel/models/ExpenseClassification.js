/**
 * ExpenseClassification Model
 * Tracks budgeted vs actual expenses per loan application for end-use monitoring.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExpenseClassification extends Model {
    static associate(models) {
      ExpenseClassification.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  ExpenseClassification.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      classification_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      expense_category: { type: DataTypes.STRING(100), allowNull: false },
      budgeted_expense: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      actual_expense: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      variance_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      overrun_flag: { type: DataTypes.BOOLEAN, defaultValue: false },
      classification_notes: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ExpenseClassification',
      tableName: 'expense_classifications',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['classification_uuid'], unique: true },
        { fields: ['application_id'] },
      ],
    }
  );

  return ExpenseClassification;
};
