/**
 * PopWorkbandTrigger
 * Per-stage environmental thresholds — read by the SAGE crop advisory engine.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PopWorkbandTrigger extends Model {
    static associate(models) {
      PopWorkbandTrigger.belongsTo(models.PopWorkband, { foreignKey: 'pop_workband_id', as: 'workband' });
    }
  }

  PopWorkbandTrigger.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pop_workband_id: { type: DataTypes.INTEGER, allowNull: false },
      parameter_code: {
        type: DataTypes.ENUM(
          'temp_celsius', 'humidity_percent',
          'rainfall_mm_24h', 'soil_moisture_percent', 'wind_speed_kmh'
        ),
        allowNull: false,
      },
      optimal_min: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      optimal_max: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      critical_min: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      critical_max: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      urgency_below: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false, defaultValue: 'medium',
      },
      urgency_above: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false, defaultValue: 'medium',
      },
      advisory_template_en: { type: DataTypes.TEXT, allowNull: true },
      advisory_template_hi: { type: DataTypes.TEXT, allowNull: true },
      recommended_action_en: { type: DataTypes.TEXT, allowNull: true },
      icon: { type: DataTypes.STRING(8), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'PopWorkbandTrigger',
      tableName: 'pop_workband_triggers',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['pop_workband_id', 'parameter_code'] }],
    }
  );

  return PopWorkbandTrigger;
};
