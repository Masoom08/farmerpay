/**
 * FisheryHarvestRecord Model
 * Harvest records: total yield, average weight, survival rate, losses.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryHarvestRecord extends Model {
    static associate(models) {
      FisheryHarvestRecord.belongsTo(models.FisheryPond, { foreignKey: 'pond_id', as: 'pond' });
      FisheryHarvestRecord.hasMany(models.FisherySaleRecord, { foreignKey: 'harvest_record_id', as: 'sales' });
    }
  }

  FisheryHarvestRecord.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pond_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'fishery_ponds', key: 'id' },
      },
      harvest_date: { type: DataTypes.DATEONLY, allowNull: false },
      total_harvest_kg: { type: DataTypes.INTEGER, allowNull: true },
      average_fish_weight_grams: { type: DataTypes.INTEGER, allowNull: true },
      survival_rate_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      loss_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      loss_reason: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FisheryHarvestRecord', tableName: 'fishery_harvest_records',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['pond_id'] }, { fields: ['harvest_date'] }],
    }
  );

  return FisheryHarvestRecord;
};
