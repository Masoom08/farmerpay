/**
 * FisheryHealthMonitoring Model
 * Fish health monitoring: disease detection, mortality, treatment.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryHealthMonitoring extends Model {
    static associate(models) {
      FisheryHealthMonitoring.belongsTo(models.FisheryPond, { foreignKey: 'pond_id', as: 'pond' });
    }
  }

  FisheryHealthMonitoring.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pond_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'fishery_ponds', key: 'id' },
      },
      monitoring_date: { type: DataTypes.DATEONLY, allowNull: false },
      disease_observed: { type: DataTypes.BOOLEAN, defaultValue: false },
      disease_name: { type: DataTypes.STRING(100), allowNull: true },
      affected_fish_count: { type: DataTypes.INTEGER, allowNull: true },
      mortality_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      treatment_given: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FisheryHealthMonitoring', tableName: 'fishery_health_monitoring',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['pond_id'] }, { fields: ['monitoring_date'] }],
    }
  );

  return FisheryHealthMonitoring;
};
