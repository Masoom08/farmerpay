'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ===== SAGE TABLES =====

    // 1. sage_advisory_types
    await queryInterface.createTable('sage_advisory_types', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      advisory_type_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      advisory_type_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      advisory_category: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      typical_urgency: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 2. sage_advisories
    await queryInterface.createTable('sage_advisories', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      advisory_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      advisory_type_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'sage_advisory_types', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      advisory_content: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      advisory_language: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      advisory_urgency: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium',
      },
      delivery_channel: {
        type: Sequelize.ENUM('sms', 'email', 'push', 'in_app', 'voice_call'),
        allowNull: true,
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      acknowledged_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      action_taken_by_farmer: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      action_outcome: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sage_advisories', ['farmer_id'], { name: 'idx_sage_advisories_farmer_id' });
    await queryInterface.addIndex('sage_advisories', ['advisory_type_id'], { name: 'idx_sage_advisories_advisory_type_id' });
    await queryInterface.addIndex('sage_advisories', ['advisory_urgency'], { name: 'idx_sage_advisories_advisory_urgency' });

    // 3. sage_weather_events
    await queryInterface.createTable('sage_weather_events', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      event_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      lgd_village_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'lgd_villages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      weather_event_type: {
        type: Sequelize.ENUM('extreme_rain', 'drought', 'hail', 'frost', 'heat_wave', 'flood'),
        allowNull: false,
      },
      event_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: true,
      },
      impact_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      advisory_generated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sage_weather_events', ['farmer_id'], { name: 'idx_sage_weather_events_farmer_id' });
    await queryInterface.addIndex('sage_weather_events', ['lgd_village_id'], { name: 'idx_sage_weather_events_lgd_village_id' });
    await queryInterface.addIndex('sage_weather_events', ['weather_event_type'], { name: 'idx_sage_weather_events_weather_event_type' });

    // 4. sage_crop_health_observations
    await queryInterface.createTable('sage_crop_health_observations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      observation_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      cycle_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
      },
      observation_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      health_status: {
        type: Sequelize.ENUM('excellent', 'good', 'average', 'poor'),
        allowNull: true,
      },
      pest_observed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      pest_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      affected_area_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      disease_observed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      disease_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      recommended_action: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sage_crop_health_observations', ['farmer_id'], { name: 'idx_sage_crop_health_farmer_id' });
    await queryInterface.addIndex('sage_crop_health_observations', ['cycle_id'], { name: 'idx_sage_crop_health_cycle_id' });

    // 5. sage_farmer_interactions
    await queryInterface.createTable('sage_farmer_interactions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      interaction_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      interaction_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      interaction_type: {
        type: Sequelize.ENUM('question_asked', 'advisory_acknowledged', 'action_taken_reported', 'feedback_provided'),
        allowNull: false,
      },
      interaction_query: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      interaction_response: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      confidence_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sage_farmer_interactions', ['farmer_id'], { name: 'idx_sage_farmer_interactions_farmer_id' });
    await queryInterface.addIndex('sage_farmer_interactions', ['interaction_type'], { name: 'idx_sage_farmer_interactions_type' });

    // 6. sage_feedback
    await queryInterface.createTable('sage_feedback', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      feedback_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      advisory_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'sage_advisories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      feedback_rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      feedback_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      feedback_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      was_advice_helpful: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      did_action_succeed: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sage_feedback', ['advisory_id'], { name: 'idx_sage_feedback_advisory_id' });
    await queryInterface.addIndex('sage_feedback', ['farmer_id'], { name: 'idx_sage_feedback_farmer_id' });

    // 7. sage_alerts
    await queryInterface.createTable('sage_alerts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      alert_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      alert_type: {
        type: Sequelize.ENUM('weather', 'pest_disease', 'input_availability', 'market_price', 'loan_due'),
        allowNull: false,
      },
      alert_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      alert_urgency: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium',
      },
      alert_triggered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      alert_acknowledged_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      action_recommended: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sage_alerts', ['farmer_id'], { name: 'idx_sage_alerts_farmer_id' });
    await queryInterface.addIndex('sage_alerts', ['alert_type'], { name: 'idx_sage_alerts_alert_type' });
    await queryInterface.addIndex('sage_alerts', ['alert_urgency'], { name: 'idx_sage_alerts_alert_urgency' });

    // ===== PULSE TABLES =====

    // 8. pulse_mandis
    await queryInterface.createTable('pulse_mandis', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      mandi_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      mandi_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      mandi_state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'lgd_states', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mandi_district_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'lgd_districts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mandi_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      mandi_longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      mandi_regulated_by: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pulse_mandis', ['mandi_state_id'], { name: 'idx_pulse_mandis_state_id' });
    await queryInterface.addIndex('pulse_mandis', ['mandi_district_id'], { name: 'idx_pulse_mandis_district_id' });

    // 9. pulse_commodities
    await queryInterface.createTable('pulse_commodities', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      commodity_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      commodity_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      commodity_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      commodity_type: {
        type: Sequelize.ENUM('food_grain', 'cash_crop', 'vegetable', 'fruit', 'spice'),
        allowNull: true,
      },
      unit_of_measurement: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // 10. pulse_commodity_translations
    await queryInterface.createTable('pulse_commodity_translations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      commodity_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      language_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      commodity_name_translated: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pulse_commodity_translations', ['commodity_id', 'language_code'], {
      name: 'idx_pulse_commodity_translations_unique',
      unique: true,
    });

    // 11. pulse_price_records
    await queryInterface.createTable('pulse_price_records', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      record_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      mandi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'pulse_mandis', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      commodity_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      record_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      opening_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      closing_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      highest_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      lowest_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      quantity_traded_quintals: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      price_trend: {
        type: Sequelize.ENUM('rising', 'stable', 'falling'),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pulse_price_records', ['mandi_id', 'commodity_id', 'record_date'], {
      name: 'idx_pulse_price_records_mandi_commodity_date',
    });

    // 12. pulse_price_forecasts
    await queryInterface.createTable('pulse_price_forecasts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      forecast_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      commodity_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      forecast_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      forecast_price_min: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      forecast_price_max: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      forecast_confidence: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      forecast_factors: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pulse_price_forecasts', ['commodity_id'], { name: 'idx_pulse_price_forecasts_commodity_id' });

    // 13. pulse_msps
    await queryInterface.createTable('pulse_msps', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      msp_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      commodity_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      msp_season: {
        type: Sequelize.ENUM('kharif', 'rabi', 'summer'),
        allowNull: true,
      },
      msp_year: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      msp_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      msp_announced_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pulse_msps', ['commodity_id'], { name: 'idx_pulse_msps_commodity_id' });

    // 14. pulse_market_alerts
    await queryInterface.createTable('pulse_market_alerts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      alert_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      commodity_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      alert_type: {
        type: Sequelize.ENUM('price_spike', 'price_crash', 'supply_shortage', 'demand_surge'),
        allowNull: false,
      },
      alert_triggered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      alert_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      alert_impact_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pulse_market_alerts', ['commodity_id'], { name: 'idx_pulse_market_alerts_commodity_id' });
    await queryInterface.addIndex('pulse_market_alerts', ['alert_type'], { name: 'idx_pulse_market_alerts_alert_type' });

    // 15. pulse_farmer_price_alerts
    await queryInterface.createTable('pulse_farmer_price_alerts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      alert_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      commodity_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      target_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      alert_type: {
        type: Sequelize.ENUM('price_reached', 'price_exceeded', 'price_below'),
        allowNull: false,
      },
      alert_triggered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      alert_acknowledged_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pulse_farmer_price_alerts', ['farmer_id'], { name: 'idx_pulse_farmer_price_alerts_farmer_id' });
    await queryInterface.addIndex('pulse_farmer_price_alerts', ['commodity_id'], { name: 'idx_pulse_farmer_price_alerts_commodity_id' });

    // 16. pulse_sell_recommendations
    await queryInterface.createTable('pulse_sell_recommendations', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      recommendation_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      cycle_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
      },
      commodity_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      recommended_timing: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      recommended_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      rationale: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      mandi_recommendations: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      recommendation_generated_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      farmer_followed_recommendation: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      actual_price_achieved: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('pulse_sell_recommendations', ['farmer_id'], { name: 'idx_pulse_sell_recommendations_farmer_id' });
    await queryInterface.addIndex('pulse_sell_recommendations', ['commodity_id'], { name: 'idx_pulse_sell_recommendations_commodity_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pulse_sell_recommendations');
    await queryInterface.dropTable('pulse_farmer_price_alerts');
    await queryInterface.dropTable('pulse_market_alerts');
    await queryInterface.dropTable('pulse_msps');
    await queryInterface.dropTable('pulse_price_forecasts');
    await queryInterface.dropTable('pulse_price_records');
    await queryInterface.dropTable('pulse_commodity_translations');
    await queryInterface.dropTable('pulse_commodities');
    await queryInterface.dropTable('pulse_mandis');
    await queryInterface.dropTable('sage_alerts');
    await queryInterface.dropTable('sage_feedback');
    await queryInterface.dropTable('sage_farmer_interactions');
    await queryInterface.dropTable('sage_crop_health_observations');
    await queryInterface.dropTable('sage_weather_events');
    await queryInterface.dropTable('sage_advisories');
    await queryInterface.dropTable('sage_advisory_types');
  },
};
