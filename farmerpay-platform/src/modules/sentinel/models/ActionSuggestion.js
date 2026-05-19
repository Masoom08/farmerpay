/**
 * ActionSuggestion Model
 * System-generated action suggestions for loan applications based on risk analysis.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActionSuggestion extends Model {
    static associate(models) {
      ActionSuggestion.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  ActionSuggestion.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      suggestion_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      suggestion_category: { type: DataTypes.STRING(100), allowNull: true },
      suggestion_text: { type: DataTypes.TEXT, allowNull: true },
      suggestion_priority: { type: DataTypes.INTEGER, allowNull: true },
      suggestion_generated_by_system: { type: DataTypes.BOOLEAN, defaultValue: true },
      suggestion_generated_date: { type: DataTypes.DATEONLY, allowNull: true },
      action_taken_based_on_suggestion: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ActionSuggestion',
      tableName: 'action_suggestions',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['suggestion_uuid'], unique: true },
        { fields: ['application_id'] },
      ],
    }
  );

  return ActionSuggestion;
};
