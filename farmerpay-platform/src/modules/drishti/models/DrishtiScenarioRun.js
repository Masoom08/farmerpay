/**
 * DrishtiScenarioRun Model
 * Each execution of a scenario engine. Primary record:
 * "farmer X ran scenario Y at time Z."
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrishtiScenarioRun extends Model {
    static associate(models) {
      DrishtiScenarioRun.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      DrishtiScenarioRun.belongsTo(models.DrishtiFarmerSnapshot, { foreignKey: 'snapshot_id', as: 'snapshot' });
      DrishtiScenarioRun.belongsTo(models.DrishtiScenarioTemplate, { foreignKey: 'template_id', as: 'template' });
      DrishtiScenarioRun.belongsTo(models.User, { foreignKey: 'initiated_by', as: 'initiator' });
      DrishtiScenarioRun.belongsTo(models.LoanApplication, { foreignKey: 'loan_application_id', as: 'loanApplication' });
      DrishtiScenarioRun.belongsTo(models.DrishtiPortfolioRun, { foreignKey: 'portfolio_run_id', as: 'portfolioRun' });
      DrishtiScenarioRun.hasMany(models.DrishtiScenarioResult, { foreignKey: 'run_id', as: 'results' });
    }
  }

  DrishtiScenarioRun.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      run_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      snapshot_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'drishti_farmer_snapshots', key: 'id' },
      },
      template_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'drishti_scenario_templates', key: 'id' },
      },
      engine_type: {
        type: DataTypes.ENUM('pre_loan', 'household_portfolio', 'climate_stress',
          'insurance', 'market_timing', 'banker_portfolio'),
        allowNull: false,
      },

      // Who initiated
      initiated_by: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      initiator_role: {
        type: DataTypes.ENUM('farmer', 'sathi', 'banker', 'admin'),
        allowNull: false,
      },

      // Context links
      loan_application_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'loan_applications', key: 'id' },
      },
      portfolio_run_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'drishti_portfolio_runs', key: 'id' },
      },

      // Input variables
      input_variables: { type: DataTypes.JSON, allowNull: false },

      // Computation metadata
      computation_mode: {
        type: DataTypes.ENUM('deterministic', 'monte_carlo'),
        defaultValue: 'deterministic',
      },
      monte_carlo_runs: { type: DataTypes.INTEGER, defaultValue: 0 },
      computation_time_ms: { type: DataTypes.INTEGER, allowNull: true },

      // Status
      status: {
        type: DataTypes.ENUM('pending', 'computing', 'completed', 'failed'),
        defaultValue: 'pending',
      },
      error_message: { type: DataTypes.TEXT, allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'DrishtiScenarioRun',
      tableName: 'drishti_scenario_runs',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['run_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['engine_type'] },
        { fields: ['loan_application_id'] },
        { fields: ['status'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return DrishtiScenarioRun;
};
