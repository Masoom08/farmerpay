/**
 * DrishtiScenarioResult Model
 * Computed output for each scenario run. Stored as structured JSON with
 * key summary fields extracted as columns for querying.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrishtiScenarioResult extends Model {
    static associate(models) {
      DrishtiScenarioResult.belongsTo(models.DrishtiScenarioRun, { foreignKey: 'run_id', as: 'scenarioRun' });
    }
  }

  DrishtiScenarioResult.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      result_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      run_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'drishti_scenario_runs', key: 'id' },
      },
      scenario_label: { type: DataTypes.STRING(50), allowNull: false },

      // Summary metrics (extracted for queryability)
      projected_revenue: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      projected_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      projected_net_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      projected_roi_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      emi_to_income_ratio: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      breakeven_yield_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      cash_flow_negative_months: { type: DataTypes.INTEGER, defaultValue: 0 },
      projected_health_status: { type: DataTypes.STRING(20), allowNull: true },
      projected_sma_class: { type: DataTypes.STRING(20), allowNull: true },
      income_adequacy_status: { type: DataTypes.STRING(20), allowNull: true },

      // Monte Carlo outputs (if applicable)
      probability_profitable: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      probability_sma_stress: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      income_p10: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      income_p50: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      income_p90: { type: DataTypes.DECIMAL(15, 2), allowNull: true },

      // Full detailed output
      monthly_cashflow: { type: DataTypes.JSON, allowNull: true },
      detailed_breakdown: { type: DataTypes.JSON, allowNull: true },
      risk_factors: { type: DataTypes.JSON, allowNull: true },
      recommendations: { type: DataTypes.JSON, allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'DrishtiScenarioResult',
      tableName: 'drishti_scenario_results',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['result_uuid'], unique: true },
        { fields: ['run_id'] },
        { fields: ['scenario_label'] },
      ],
    }
  );

  return DrishtiScenarioResult;
};
