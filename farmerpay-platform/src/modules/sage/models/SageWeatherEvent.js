/**
 * SageWeatherEvent Model
 * Extreme weather events with impact assessment and advisory generation.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SageWeatherEvent extends Model {
    static associate(models) {
      SageWeatherEvent.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      SageWeatherEvent.belongsTo(models.LgdVillage, { foreignKey: 'lgd_village_id', as: 'village' });
    }
  }

  SageWeatherEvent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      lgd_village_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'lgd_villages', key: 'id' },
      },
      weather_event_type: {
        type: DataTypes.ENUM('extreme_rain', 'drought', 'hail', 'frost', 'heat_wave', 'flood'),
        allowNull: false,
      },
      event_date: { type: DataTypes.DATEONLY, allowNull: true },
      severity: {
        type: DataTypes.ENUM('low', 'medium', 'high'), allowNull: true,
      },
      impact_description: { type: DataTypes.TEXT, allowNull: true },
      advisory_generated_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'SageWeatherEvent', tableName: 'sage_weather_events',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['event_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['lgd_village_id'] },
        { fields: ['weather_event_type'] },
      ],
    }
  );

  return SageWeatherEvent;
};
