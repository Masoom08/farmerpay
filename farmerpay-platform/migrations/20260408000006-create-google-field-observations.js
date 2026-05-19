'use strict';

/**
 * Phase 2A.1 — Google ALU + Sentinel crop identification observations.
 *
 * Stores satellite-derived field observations from Google's pan-India,
 * in-season crop identification product (paper: arXiv:2507.02972). One
 * row per (farmer, cycle, observation date). The fetcher writes here;
 * cycleStageService and cropAdvisoryEngine read from here.
 *
 * The schema is source-agnostic so a future Krishi-DSS satellite product
 * (or any other vendor) can write into the same table.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('google_field_observations', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      cycle_id: { type: Sequelize.INTEGER, allowNull: true },
      field_id: { type: Sequelize.INTEGER, allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      polygon_geojson: { type: Sequelize.TEXT, allowNull: true },
      area_hectares: { type: Sequelize.DECIMAL(10, 4), allowNull: true },
      // Detected crop — string + resolved FK to crop_masters when matched
      detected_crop_code: { type: Sequelize.STRING(20), allowNull: true },
      detected_crop_id: { type: Sequelize.STRING(36), allowNull: true },
      sowing_date: { type: Sequelize.DATEONLY, allowNull: true },
      harvest_date: { type: Sequelize.DATEONLY, allowNull: true },
      confidence: { type: Sequelize.DECIMAL(4, 3), allowNull: true },
      // Latest spectral indices + time series for the polygon
      latest_ndvi: { type: Sequelize.DECIMAL(4, 3), allowNull: true },
      latest_ndwi: { type: Sequelize.DECIMAL(4, 3), allowNull: true },
      ndvi_time_series: { type: Sequelize.JSON, allowNull: true },
      // Season classification
      season: {
        type: Sequelize.ENUM('kharif', 'rabi', 'summer'),
        allowNull: true,
      },
      season_year: { type: Sequelize.INTEGER, allowNull: true },
      source: {
        type: Sequelize.ENUM('google_alu_mock', 'google_alu_api', 'krishi_dss_sat', 'manual_seed'),
        allowNull: false, defaultValue: 'google_alu_mock',
      },
      last_observed_at: { type: Sequelize.DATE, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('google_field_observations', {
      name: 'idx_gfo_farmer_cycle',
      fields: ['farmer_id', 'cycle_id'],
    });
    await queryInterface.addIndex('google_field_observations', {
      name: 'idx_gfo_latlng',
      fields: ['latitude', 'longitude'],
    });
    await queryInterface.addIndex('google_field_observations', {
      name: 'idx_gfo_observed',
      fields: ['last_observed_at'],
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('google_field_observations');
  },
};
