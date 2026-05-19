/**
 * GoogleFieldObservation
 * Satellite-derived field observation (Google ALU + Sentinel + season
 * detection — paper arXiv:2507.02972). One row per (farmer, cycle, fetch).
 *
 * Read by:
 *   - cycleStageService.getCycleCurrentStage (preferred sowing-date source)
 *   - cropAdvisoryEngine (3-way fund-diversion check + NDVI metadata)
 *   - sageService.getAdvisoriesForFarmer (returns googleConfirmation in feed)
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoogleFieldObservation extends Model {
    static associate(models) {
      GoogleFieldObservation.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  GoogleFieldObservation.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      cycle_id: { type: DataTypes.INTEGER, allowNull: true },
      field_id: { type: DataTypes.INTEGER, allowNull: true },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      polygon_geojson: { type: DataTypes.TEXT, allowNull: true },
      area_hectares: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
      detected_crop_code: { type: DataTypes.STRING(20), allowNull: true },
      detected_crop_id: { type: DataTypes.STRING(36), allowNull: true },
      sowing_date: { type: DataTypes.DATEONLY, allowNull: true },
      harvest_date: { type: DataTypes.DATEONLY, allowNull: true },
      confidence: { type: DataTypes.DECIMAL(4, 3), allowNull: true },
      latest_ndvi: { type: DataTypes.DECIMAL(4, 3), allowNull: true },
      latest_ndwi: { type: DataTypes.DECIMAL(4, 3), allowNull: true },
      ndvi_time_series: { type: DataTypes.JSON, allowNull: true },
      season: {
        type: DataTypes.ENUM('kharif', 'rabi', 'summer'),
        allowNull: true,
      },
      season_year: { type: DataTypes.INTEGER, allowNull: true },
      source: {
        type: DataTypes.ENUM('google_alu_mock', 'google_alu_api', 'krishi_dss_sat', 'manual_seed'),
        allowNull: false, defaultValue: 'google_alu_mock',
      },
      last_observed_at: { type: DataTypes.DATE, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'GoogleFieldObservation',
      tableName: 'google_field_observations',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['farmer_id', 'cycle_id'] },
        { fields: ['latitude', 'longitude'] },
        { fields: ['last_observed_at'] },
      ],
    }
  );

  return GoogleFieldObservation;
};
