/**
 * FisheryFeedingLog Model
 * Daily feeding records per pond: type, quantity, cost, biomass percentage.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryFeedingLog extends Model {
    static associate(models) {
      FisheryFeedingLog.belongsTo(models.FisheryPond, { foreignKey: 'pond_id', as: 'pond' });
    }
  }

  FisheryFeedingLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pond_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'fishery_ponds', key: 'id' },
      },
      feeding_date: { type: DataTypes.DATEONLY, allowNull: false },
      feed_type: { type: DataTypes.STRING(100), allowNull: true },
      quantity_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      feed_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      percentage_of_biomass: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FisheryFeedingLog', tableName: 'fishery_feeding_logs',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['pond_id'] }, { fields: ['feeding_date'] }],
    }
  );

  return FisheryFeedingLog;
};
