'use strict';

/**
 * Phase 2A — SAGE Crop Advisory Engine schema.
 *
 * Adds 4 tables that turn ROOTS PoP workbands into the trigger surface for
 * stage-aware advisories:
 *
 *   1. pop_workband_triggers              — env thresholds per (workband, parameter)
 *   2. pop_workband_pest_susceptibilities — pest risk profile per (workband, pest)
 *   3. weather_observations                — ambient weather (IMD scrape / manual seed)
 *   4. regional_pest_alerts                — district + crop pest pressure window
 *
 * The engine reads workband + triggers + pest susceptibilities for the
 * farmer's current stage, joins it with the latest weather observation +
 * active pest alert for the field's district, and emits SageAdvisory rows
 * tagged source = 'crop_advisory_engine'.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── 1. pop_workband_triggers ─────────────────────────────────────
    await queryInterface.createTable('pop_workband_triggers', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      pop_workband_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'pop_workbands', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      parameter_code: {
        type: Sequelize.ENUM(
          'temp_celsius', 'humidity_percent',
          'rainfall_mm_24h', 'soil_moisture_percent', 'wind_speed_kmh'
        ),
        allowNull: false,
      },
      optimal_min: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      optimal_max: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      critical_min: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      critical_max: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      urgency_below: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false, defaultValue: 'medium',
      },
      urgency_above: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false, defaultValue: 'medium',
      },
      advisory_template_en: { type: Sequelize.TEXT, allowNull: true },
      advisory_template_hi: { type: Sequelize.TEXT, allowNull: true },
      recommended_action_en: { type: Sequelize.TEXT, allowNull: true },
      icon: { type: Sequelize.STRING(8), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('pop_workband_triggers', {
      name: 'idx_pwt_workband_param',
      fields: ['pop_workband_id', 'parameter_code'],
    });

    // ─── 2. pop_workband_pest_susceptibilities ───────────────────────
    await queryInterface.createTable('pop_workband_pest_susceptibilities', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      pop_workband_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'pop_workbands', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      pest_code: { type: Sequelize.STRING(40), allowNull: false },
      pest_name_en: { type: Sequelize.STRING(120), allowNull: true },
      pest_name_hi: { type: Sequelize.STRING(120), allowNull: true },
      susceptibility_level: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'very_high'),
        allowNull: false, defaultValue: 'medium',
      },
      triggered_when_regional_severity_at_least: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: false, defaultValue: 'medium',
      },
      advisory_template_en: { type: Sequelize.TEXT, allowNull: true },
      advisory_template_hi: { type: Sequelize.TEXT, allowNull: true },
      recommended_action_en: { type: Sequelize.TEXT, allowNull: true },
      icon: { type: Sequelize.STRING(8), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('pop_workband_pest_susceptibilities', {
      name: 'idx_pwps_workband_pest',
      fields: ['pop_workband_id', 'pest_code'],
    });

    // ─── 3. weather_observations ─────────────────────────────────────
    await queryInterface.createTable('weather_observations', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      lgd_district_id: { type: Sequelize.INTEGER, allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      observed_at: { type: Sequelize.DATE, allowNull: false },
      temp_celsius: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      humidity_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      rainfall_mm_24h: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      wind_speed_kmh: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      condition_text: { type: Sequelize.STRING(120), allowNull: true },
      source: {
        type: Sequelize.ENUM('imd_scrape', 'imd_api', 'krishi_dss', 'manual_seed'),
        allowNull: false, defaultValue: 'manual_seed',
      },
      source_station_id: { type: Sequelize.STRING(40), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('weather_observations', {
      name: 'idx_wo_district_observed',
      fields: ['lgd_district_id', 'observed_at'],
    });

    // ─── 4. regional_pest_alerts ─────────────────────────────────────
    await queryInterface.createTable('regional_pest_alerts', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      lgd_district_id: { type: Sequelize.INTEGER, allowNull: true },
      crop_id: { type: Sequelize.STRING(36), allowNull: false },
      pest_code: { type: Sequelize.STRING(40), allowNull: false },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: false, defaultValue: 'medium',
      },
      observed_from: { type: Sequelize.DATEONLY, allowNull: false },
      observed_until: { type: Sequelize.DATEONLY, allowNull: false },
      source: {
        type: Sequelize.ENUM('farmer_self_report_rollup', 'npss', 'manual_seed', 'krishi_dss'),
        allowNull: false, defaultValue: 'manual_seed',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('regional_pest_alerts', {
      name: 'idx_rpa_district_crop_until',
      fields: ['lgd_district_id', 'crop_id', 'observed_until'],
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('regional_pest_alerts');
    await queryInterface.dropTable('weather_observations');
    await queryInterface.dropTable('pop_workband_pest_susceptibilities');
    await queryInterface.dropTable('pop_workband_triggers');
  },
};
