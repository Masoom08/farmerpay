/**
 * DrishtiPortfolioRun Model
 * Batch simulation runs across a set of farmers (Banker Portfolio Simulation).
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrishtiPortfolioRun extends Model {
    static associate(models) {
      DrishtiPortfolioRun.belongsTo(models.User, { foreignKey: 'banker_id', as: 'banker' });
      DrishtiPortfolioRun.hasMany(models.DrishtiScenarioRun, { foreignKey: 'portfolio_run_id', as: 'scenarioRuns' });
    }
  }

  DrishtiPortfolioRun.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      portfolio_run_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      banker_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      run_label: { type: DataTypes.STRING(200), allowNull: true },

      // Scope
      district_id: { type: DataTypes.INTEGER, allowNull: true },
      block_id: { type: DataTypes.INTEGER, allowNull: true },
      loan_product_id: { type: DataTypes.INTEGER, allowNull: true },
      farmer_count: { type: DataTypes.INTEGER, allowNull: false },
      farmer_ids: { type: DataTypes.JSON, allowNull: true },

      // Shock parameters
      shock_variables: { type: DataTypes.JSON, allowNull: false },

      // Aggregated results
      total_portfolio_outstanding: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      projected_npa_count: { type: DataTypes.INTEGER, allowNull: true },
      projected_npa_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      projected_sma_migration: { type: DataTypes.JSON, allowNull: true },
      farmers_needing_intervention: { type: DataTypes.JSON, allowNull: true },
      portfolio_var_95: { type: DataTypes.DECIMAL(15, 2), allowNull: true },

      // Status
      status: {
        type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed'),
        defaultValue: 'queued',
      },
      progress_pct: { type: DataTypes.INTEGER, defaultValue: 0 },
      started_at: { type: DataTypes.DATE, allowNull: true },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      error_message: { type: DataTypes.TEXT, allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'DrishtiPortfolioRun',
      tableName: 'drishti_portfolio_runs',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['portfolio_run_uuid'], unique: true },
        { fields: ['banker_id'] },
        { fields: ['status'] },
        { fields: ['district_id'] },
      ],
    }
  );

  return DrishtiPortfolioRun;
};
