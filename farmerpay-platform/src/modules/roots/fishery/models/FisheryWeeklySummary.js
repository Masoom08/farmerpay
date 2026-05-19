/**
 * FisheryWeeklySummary Model
 * Bulk weekly entry for Large-tier fishery farmers. Inland and sea cost
 * buckets kept separate so the P&L engine can attribute correctly. On
 * finalize, the service layer fans out is_estimated cost/revenue events.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryWeeklySummary extends Model {
    static associate(models) {
      FisheryWeeklySummary.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  FisheryWeeklySummary.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      summary_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      week_start_date: { type: DataTypes.DATEONLY, allowNull: false },
      week_end_date: { type: DataTypes.DATEONLY, allowNull: false },

      // Inland costs
      total_feed_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_fingerling_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_pond_labor_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_aeration_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_health_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

      // Sea costs
      total_fuel_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_ice_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_crew_wages: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_gear_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_maintenance_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

      total_other_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

      // Revenue
      total_fish_kg: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_fish_revenue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_other_revenue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },

      notes: { type: DataTypes.TEXT, allowNull: true },
      is_finalized: { type: DataTypes.BOOLEAN, defaultValue: false },
      finalized_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'FisheryWeeklySummary',
      tableName: 'fishery_weekly_summaries',
      timestamps: true,
      underscored: true,
    },
  );

  return FisheryWeeklySummary;
};
