/**
 * FisheryWaterQualityLog Model
 * Water quality testing: pH, dissolved oxygen, ammonia, temperature, turbidity.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryWaterQualityLog extends Model {
    static associate(models) {
      FisheryWaterQualityLog.belongsTo(models.FisheryPond, { foreignKey: 'pond_id', as: 'pond' });
    }
  }

  FisheryWaterQualityLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pond_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'fishery_ponds', key: 'id' },
      },
      test_date: { type: DataTypes.DATEONLY, allowNull: false },
      water_ph: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      dissolved_oxygen_ppm: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      ammonia_ppm: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      temperature_celsius: { type: DataTypes.INTEGER, allowNull: true },
      turbidity_cm: { type: DataTypes.INTEGER, allowNull: true },
      action_taken: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FisheryWaterQualityLog', tableName: 'fishery_water_quality_logs',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['pond_id'] }, { fields: ['test_date'] }],
    }
  );

  return FisheryWaterQualityLog;
};
