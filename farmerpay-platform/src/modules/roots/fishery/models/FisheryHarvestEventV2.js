/**
 * FisheryHarvestEventV2 Model
 * Inland-only domain event: pond harvest. Closes the stocking->harvest cycle.
 * Subsequent sale revenue events reference this harvest via source_event_uuid.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryHarvestEventV2 extends Model {
    static associate(models) {
      FisheryHarvestEventV2.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  FisheryHarvestEventV2.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      pond_id: { type: DataTypes.STRING(36), allowNull: false },
      stocking_event_uuid: { type: DataTypes.STRING(36), allowNull: true },
      harvest_date: { type: DataTypes.DATEONLY, allowNull: false },
      total_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      avg_weight_grams: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      survival_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      loss_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      loss_reason: { type: DataTypes.STRING(100), allowNull: true },
      harvest_method: {
        type: DataTypes.ENUM('FULL_HARVEST', 'PARTIAL_HARVEST', 'THINNING'),
        allowNull: false,
        defaultValue: 'FULL_HARVEST',
      },
      labor_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'FisheryHarvestEventV2',
      tableName: 'fishery_harvest_events',
      timestamps: true,
      underscored: true,
    },
  );

  return FisheryHarvestEventV2;
};
