/**
 * DrishtiScenarioTemplate Model
 * Pre-defined scenario blueprints that power the UI dropdowns and guided flows.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrishtiScenarioTemplate extends Model {
    static associate(models) {
      DrishtiScenarioTemplate.hasMany(models.DrishtiScenarioRun, { foreignKey: 'template_id', as: 'scenarioRuns' });
    }
  }

  DrishtiScenarioTemplate.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      template_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      engine_type: {
        type: DataTypes.ENUM('pre_loan', 'household_portfolio', 'climate_stress',
          'insurance', 'market_timing', 'banker_portfolio'),
        allowNull: false,
      },
      template_name: { type: DataTypes.STRING(150), allowNull: false },
      template_name_key: { type: DataTypes.STRING(100), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      default_variables: { type: DataTypes.JSON, allowNull: false },
      variable_ranges: { type: DataTypes.JSON, allowNull: false },
      activity_types: { type: DataTypes.JSON, allowNull: true },
      is_system: { type: DataTypes.BOOLEAN, defaultValue: true },
      display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'DrishtiScenarioTemplate',
      tableName: 'drishti_scenario_templates',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['template_uuid'], unique: true },
        { fields: ['engine_type'] },
        { fields: ['is_active'] },
      ],
    }
  );

  return DrishtiScenarioTemplate;
};
