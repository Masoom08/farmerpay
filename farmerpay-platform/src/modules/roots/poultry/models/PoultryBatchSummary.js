/**
 * PoultryBatchSummary Model — Aggregated KPIs per batch (FCR, mortality, P&L).
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PoultryBatchSummary extends Model {
    static associate(models) {
      PoultryBatchSummary.belongsTo(models.PoultryFlock, { foreignKey: 'flock_id', as: 'flock' });
    }
  }

  PoultryBatchSummary.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    flock_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'poultry_flocks', key: 'id' } },
    summary_date: { type: DataTypes.DATEONLY, allowNull: false },
    cumulative_mortality: { type: DataTypes.INTEGER, defaultValue: 0 },
    mortality_rate_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    cumulative_feed_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    fcr: { type: DataTypes.DECIMAL(5, 3), allowNull: true, comment: 'Feed Conversion Ratio' },
    avg_weight_g: { type: DataTypes.INTEGER, allowNull: true },
    total_egg_count: { type: DataTypes.INTEGER, allowNull: true },
    egg_production_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    total_cost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    total_revenue: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    profit_per_bird: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    cost_per_bird: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'PoultryBatchSummary', tableName: 'poultry_batch_summaries',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['flock_id', 'summary_date'] }],
  });

  return PoultryBatchSummary;
};
