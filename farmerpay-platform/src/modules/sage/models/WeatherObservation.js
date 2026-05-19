/**
 * WeatherObservation
 * Ambient weather snapshots, written by the IMD scrape job, the manual
 * /sage/weather/observe endpoint, or future Krishi-DSS adapters. The crop
 * advisory engine reads from here.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WeatherObservation extends Model {
    static associate() { /* loose FK to lgd_districts (no enforced ref) */ }
  }

  WeatherObservation.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      lgd_district_id: { type: DataTypes.INTEGER, allowNull: true },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      observed_at: { type: DataTypes.DATE, allowNull: false },
      temp_celsius: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      humidity_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      rainfall_mm_24h: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
      wind_speed_kmh: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      condition_text: { type: DataTypes.STRING(120), allowNull: true },
      source: {
        type: DataTypes.ENUM('imd_scrape', 'imd_api', 'krishi_dss', 'manual_seed'),
        allowNull: false, defaultValue: 'manual_seed',
      },
      source_station_id: { type: DataTypes.STRING(40), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'WeatherObservation',
      tableName: 'weather_observations',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['lgd_district_id', 'observed_at'] }],
    }
  );

  return WeatherObservation;
};
