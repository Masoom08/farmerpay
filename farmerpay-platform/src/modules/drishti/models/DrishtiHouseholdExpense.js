/**
 * DrishtiHouseholdExpense Model
 * Persistent storage of household expense data.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrishtiHouseholdExpense extends Model {
    static associate(models) {
      DrishtiHouseholdExpense.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  DrishtiHouseholdExpense.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      expense_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },

      category: {
        type: DataTypes.ENUM('food_groceries', 'education', 'healthcare', 'housing',
          'social_obligations', 'transportation', 'utilities',
          'non_farm_loan_emi', 'clothing', 'other'),
        allowNull: false,
      },
      category_label: { type: DataTypes.STRING(100), allowNull: true },

      // Amount and frequency
      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      frequency: {
        type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly',
          'seasonal', 'annual'),
        allowNull: false,
      },
      amount_monthly_equivalent: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      peak_months: { type: DataTypes.JSON, allowNull: true },
      peak_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },

      // Verification
      verified_by_sathi: { type: DataTypes.BOOLEAN, defaultValue: false },
      confidence_level: {
        type: DataTypes.ENUM('declared', 'sathi_estimated', 'document_verified'),
        defaultValue: 'declared',
      },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'DrishtiHouseholdExpense',
      tableName: 'drishti_household_expenses',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['expense_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['category'] },
      ],
    }
  );

  return DrishtiHouseholdExpense;
};
