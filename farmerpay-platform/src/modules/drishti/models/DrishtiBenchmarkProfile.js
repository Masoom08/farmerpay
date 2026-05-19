/**
 * DrishtiBenchmarkProfile Model
 * District + crop/activity level benchmarks, refreshed nightly, cached in Redis.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrishtiBenchmarkProfile extends Model {
    static associate(models) {
      DrishtiBenchmarkProfile.belongsTo(models.LgdDistrict, { foreignKey: 'district_id', as: 'district' });
    }
  }

  DrishtiBenchmarkProfile.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      benchmark_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      district_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'lgd_districts', key: 'id' },
      },
      season: { type: DataTypes.STRING(20), allowNull: true },
      activity_type: {
        type: DataTypes.ENUM('crop', 'dairy', 'fishery', 'horticulture'),
        allowNull: false,
      },

      // For crop
      crop_id: { type: DataTypes.STRING(36), allowNull: true },
      avg_yield_kg_per_hectare: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      avg_cost_per_hectare: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      avg_revenue_per_hectare: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      avg_profit_per_hectare: { type: DataTypes.DECIMAL(15, 2), allowNull: true },

      // For dairy
      avg_milk_yield_per_animal: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      avg_monthly_cost_per_animal: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      avg_monthly_revenue_per_animal: { type: DataTypes.DECIMAL(15, 2), allowNull: true },

      // For fishery
      avg_yield_kg_per_hectare_pond: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      avg_cost_per_hectare_pond: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      avg_revenue_per_hectare_pond: { type: DataTypes.DECIMAL(15, 2), allowNull: true },

      // Climate sensitivity
      yield_rainfall_elasticity: { type: DataTypes.DECIMAL(5, 3), allowNull: true },
      yield_temperature_sensitivity: { type: DataTypes.DECIMAL(5, 3), allowNull: true },

      // Insurance history
      historical_claim_rate_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      avg_claim_payout: { type: DataTypes.DECIMAL(15, 2), allowNull: true },

      sample_size: { type: DataTypes.INTEGER, allowNull: true },
      benchmark_date: { type: DataTypes.DATEONLY, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'DrishtiBenchmarkProfile',
      tableName: 'drishti_benchmark_profiles',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['benchmark_uuid'], unique: true },
        { fields: ['district_id', 'season'] },
        { fields: ['crop_id'] },
        { fields: ['activity_type'] },
        {
          fields: ['district_id', 'season', 'activity_type', 'crop_id', 'benchmark_date'],
          unique: true,
          name: 'uk_benchmark',
        },
      ],
    }
  );

  return DrishtiBenchmarkProfile;
};
