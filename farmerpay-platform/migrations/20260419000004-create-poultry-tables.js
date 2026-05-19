'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. poultry_flocks
    await queryInterface.createTable('poultry_flocks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      batch_name: { type: Sequelize.STRING(100), allowNull: false },
      bird_type: { type: Sequelize.ENUM('BROILER', 'LAYER', 'COUNTRY', 'DUCK', 'QUAIL'), allowNull: false },
      breed: { type: Sequelize.STRING(100), allowNull: true },
      placement_date: { type: Sequelize.DATEONLY, allowNull: false },
      initial_count: { type: Sequelize.INTEGER, allowNull: false },
      current_count: { type: Sequelize.INTEGER, allowNull: false },
      avg_initial_weight_g: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.ENUM('ACTIVE', 'COMPLETED', 'TERMINATED'), defaultValue: 'ACTIVE' },
      completion_date: { type: Sequelize.DATEONLY, allowNull: true },
      shed_type: { type: Sequelize.STRING(50), allowNull: true },
      farm_register_id: { type: Sequelize.INTEGER, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('poultry_flocks', ['farmer_id', 'status'], { name: 'idx_pf_farmer_status' });

    // 2. poultry_daily_logs
    await queryInterface.createTable('poultry_daily_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      flock_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'poultry_flocks', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      log_date: { type: Sequelize.DATEONLY, allowNull: false },
      mortality_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      feed_consumed_kg: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      water_consumed_liters: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      egg_count: { type: Sequelize.INTEGER, allowNull: true },
      sample_weight_g: { type: Sequelize.INTEGER, allowNull: true },
      temperature_high: { type: Sequelize.DECIMAL(4, 1), allowNull: true },
      temperature_low: { type: Sequelize.DECIMAL(4, 1), allowNull: true },
      humidity_pct: { type: Sequelize.INTEGER, allowNull: true },
      disease_observed: { type: Sequelize.BOOLEAN, defaultValue: false },
      disease_notes: { type: Sequelize.TEXT, allowNull: true },
      photo_url: { type: Sequelize.STRING(500), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('poultry_daily_logs', ['flock_id', 'log_date'], { name: 'idx_pdl_flock_date', unique: true });

    // 3. poultry_health_events
    await queryInterface.createTable('poultry_health_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      flock_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'poultry_flocks', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      event_date: { type: Sequelize.DATEONLY, allowNull: false },
      event_type: { type: Sequelize.ENUM('VACCINATION', 'DISEASE', 'MEDICATION', 'DEWORMING', 'CULLING'), allowNull: false },
      vaccine_name: { type: Sequelize.STRING(100), allowNull: true },
      disease_name: { type: Sequelize.STRING(100), allowNull: true },
      medicine_name: { type: Sequelize.STRING(100), allowNull: true },
      dosage: { type: Sequelize.STRING(100), allowNull: true },
      birds_affected: { type: Sequelize.INTEGER, allowNull: true },
      cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      administered_by: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('poultry_health_events', ['flock_id', 'event_type'], { name: 'idx_phe_flock_type' });

    // 4. poultry_cost_events
    await queryInterface.createTable('poultry_cost_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      flock_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'poultry_flocks', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      event_date: { type: Sequelize.DATEONLY, allowNull: false },
      category: { type: Sequelize.ENUM('FEED', 'MEDICINE', 'LABOR', 'ENERGY', 'CHICK_PURCHASE', 'EQUIPMENT', 'LITTER', 'TRANSPORT', 'OTHER'), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      is_recurring: { type: Sequelize.BOOLEAN, defaultValue: false },
      recurring_frequency: { type: Sequelize.ENUM('DAILY', 'WEEKLY', 'MONTHLY'), allowNull: true },
      source: { type: Sequelize.ENUM('FARMER', 'SATHI', 'VYAPAR', 'AUTO'), defaultValue: 'FARMER' },
      vendor_transaction_id: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('poultry_cost_events', ['flock_id', 'category'], { name: 'idx_pce_flock_cat' });

    // 5. poultry_revenue_events
    await queryInterface.createTable('poultry_revenue_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      flock_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'poultry_flocks', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      event_date: { type: Sequelize.DATEONLY, allowNull: false },
      category: { type: Sequelize.ENUM('EGG_SALE', 'BIRD_SALE', 'MANURE_SALE', 'OTHER'), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      rate_per_unit: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      total_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      buyer_name: { type: Sequelize.STRING(200), allowNull: true },
      buyer_type: { type: Sequelize.ENUM('TRADER', 'RETAIL', 'HOTEL', 'MARKET', 'OTHER'), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('poultry_revenue_events', ['flock_id', 'category'], { name: 'idx_pre_flock_cat' });

    // 6. poultry_batch_summaries
    await queryInterface.createTable('poultry_batch_summaries', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      flock_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'poultry_flocks', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      summary_date: { type: Sequelize.DATEONLY, allowNull: false },
      cumulative_mortality: { type: Sequelize.INTEGER, defaultValue: 0 },
      mortality_rate_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      cumulative_feed_kg: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      fcr: { type: Sequelize.DECIMAL(5, 3), allowNull: true, comment: 'Feed Conversion Ratio' },
      avg_weight_g: { type: Sequelize.INTEGER, allowNull: true },
      total_egg_count: { type: Sequelize.INTEGER, allowNull: true },
      egg_production_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      total_cost: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      total_revenue: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      profit_per_bird: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      cost_per_bird: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('poultry_batch_summaries', ['flock_id', 'summary_date'], { name: 'idx_pbs_flock_date' });

    // 7. poultry_pop_templates
    await queryInterface.createTable('poultry_pop_templates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      bird_type: { type: Sequelize.ENUM('BROILER', 'LAYER'), allowNull: false },
      breed: { type: Sequelize.STRING(100), allowNull: true },
      week_number: { type: Sequelize.INTEGER, allowNull: false },
      expected_feed_g_per_bird: { type: Sequelize.INTEGER, allowNull: true },
      expected_weight_g: { type: Sequelize.INTEGER, allowNull: true },
      expected_egg_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      expected_mortality_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      vaccination_due: { type: Sequelize.STRING(200), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('poultry_pop_templates', ['bird_type', 'week_number'], { name: 'idx_ppt_type_week' });
  },

  async down(queryInterface) {
    // Drop in reverse dependency order
    await queryInterface.dropTable('poultry_pop_templates');
    await queryInterface.dropTable('poultry_batch_summaries');
    await queryInterface.dropTable('poultry_revenue_events');
    await queryInterface.dropTable('poultry_cost_events');
    await queryInterface.dropTable('poultry_health_events');
    await queryInterface.dropTable('poultry_daily_logs');
    await queryInterface.dropTable('poultry_flocks');
  },
};
