'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. goat_herds
    await queryInterface.createTable('goat_herds', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      herd_name: { type: Sequelize.STRING(100), allowNull: false },
      herd_type: { type: Sequelize.ENUM('STALL_FED', 'GRAZING', 'MIXED'), allowNull: false },
      primary_breed: { type: Sequelize.STRING(100), allowNull: true },
      location_village: { type: Sequelize.STRING(200), allowNull: true },
      farm_register_id: { type: Sequelize.INTEGER, allowNull: true },
      total_animals: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: { type: Sequelize.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('goat_herds', ['farmer_id', 'status'], { name: 'idx_gh_farmer_status' });

    // 2. goat_animals
    await queryInterface.createTable('goat_animals', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      herd_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'goat_herds', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tag_id: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: true },
      breed: { type: Sequelize.STRING(100), allowNull: true },
      sex: { type: Sequelize.ENUM('MALE', 'FEMALE'), allowNull: false },
      dob: { type: Sequelize.DATEONLY, allowNull: true },
      approximate_age_months: { type: Sequelize.INTEGER, allowNull: true },
      weight_kg: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      dam_id: { type: Sequelize.INTEGER, allowNull: true },
      sire_id: { type: Sequelize.INTEGER, allowNull: true },
      purchase_date: { type: Sequelize.DATEONLY, allowNull: true },
      purchase_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      source: { type: Sequelize.STRING(200), allowNull: true },
      status: { type: Sequelize.ENUM('ACTIVE', 'SOLD', 'DEAD', 'TRANSFERRED'), defaultValue: 'ACTIVE' },
      status_date: { type: Sequelize.DATEONLY, allowNull: true },
      photo_url: { type: Sequelize.STRING(500), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('goat_animals', ['herd_id', 'status'], { name: 'idx_ga_herd_status' });

    // 3. goat_growth_logs
    await queryInterface.createTable('goat_growth_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      animal_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'goat_animals', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      log_date: { type: Sequelize.DATEONLY, allowNull: false },
      weight_kg: { type: Sequelize.DECIMAL(6, 2), allowNull: false },
      body_condition_score: { type: Sequelize.INTEGER, allowNull: true, comment: '1-5 scale' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      photo_url: { type: Sequelize.STRING(500), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('goat_growth_logs', ['animal_id', 'log_date'], { name: 'idx_ggl_animal_date' });

    // 4. goat_health_events
    await queryInterface.createTable('goat_health_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      animal_id: { type: Sequelize.INTEGER, allowNull: true, comment: 'NULL = herd-wide event' },
      herd_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'goat_herds', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      event_date: { type: Sequelize.DATEONLY, allowNull: false },
      event_type: { type: Sequelize.ENUM('VACCINATION', 'DEWORMING', 'DISEASE', 'TREATMENT', 'INJURY'), allowNull: false },
      vaccine_name: { type: Sequelize.STRING(100), allowNull: true },
      disease_name: { type: Sequelize.STRING(100), allowNull: true },
      medicine_name: { type: Sequelize.STRING(100), allowNull: true },
      vet_name: { type: Sequelize.STRING(200), allowNull: true },
      cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      animals_affected: { type: Sequelize.INTEGER, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('goat_health_events', ['herd_id', 'event_type'], { name: 'idx_ghe_herd_type' });

    // 5. goat_breeding_events
    await queryInterface.createTable('goat_breeding_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      doe_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'goat_animals', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      buck_id: { type: Sequelize.INTEGER, allowNull: true },
      service_date: { type: Sequelize.DATEONLY, allowNull: false },
      service_type: { type: Sequelize.ENUM('NATURAL', 'AI'), allowNull: false },
      expected_kidding_date: { type: Sequelize.DATEONLY, allowNull: true },
      actual_kidding_date: { type: Sequelize.DATEONLY, allowNull: true },
      kid_count: { type: Sequelize.INTEGER, allowNull: true },
      kid_details: { type: Sequelize.JSON, allowNull: true },
      complications: { type: Sequelize.TEXT, allowNull: true },
      cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      status: { type: Sequelize.ENUM('SERVICED', 'CONFIRMED', 'KIDDED', 'FAILED'), defaultValue: 'SERVICED' },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('goat_breeding_events', ['doe_id', 'status'], { name: 'idx_gbe_doe_status' });

    // 6. goat_feed_logs
    await queryInterface.createTable('goat_feed_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      herd_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'goat_herds', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      log_date: { type: Sequelize.DATEONLY, allowNull: false },
      feed_type: { type: Sequelize.ENUM('GRAZING', 'DRY_FODDER', 'GREEN_FODDER', 'CONCENTRATE', 'MINERAL_MIX', 'OTHER'), allowNull: false },
      quantity_kg: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      grazing_hours: { type: Sequelize.DECIMAL(4, 1), allowNull: true },
      cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('goat_feed_logs', ['herd_id', 'log_date'], { name: 'idx_gfl_herd_date' });

    // 7. goat_cost_events
    await queryInterface.createTable('goat_cost_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      herd_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'goat_herds', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      event_date: { type: Sequelize.DATEONLY, allowNull: false },
      category: { type: Sequelize.ENUM('FEED', 'MEDICINE', 'LABOR', 'TRANSPORT', 'SHELTER', 'EQUIPMENT', 'BREEDING', 'OTHER'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      source: { type: Sequelize.ENUM('FARMER', 'SATHI', 'VYAPAR', 'AUTO'), defaultValue: 'FARMER' },
      vendor_transaction_id: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('goat_cost_events', ['herd_id', 'category'], { name: 'idx_gce_herd_cat' });

    // 8. goat_revenue_events
    await queryInterface.createTable('goat_revenue_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      herd_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'goat_herds', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      animal_id: { type: Sequelize.INTEGER, allowNull: true },
      event_date: { type: Sequelize.DATEONLY, allowNull: false },
      category: { type: Sequelize.ENUM('LIVE_SALE', 'MEAT_SALE', 'MANURE_SALE', 'MILK_SALE', 'OTHER'), allowNull: false },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      rate_per_unit: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      total_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      buyer_name: { type: Sequelize.STRING(200), allowNull: true },
      sale_weight_kg: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('goat_revenue_events', ['herd_id', 'category'], { name: 'idx_gre_herd_cat' });

    // 9. goat_pop_templates
    await queryInterface.createTable('goat_pop_templates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      breed: { type: Sequelize.STRING(100), allowNull: false },
      sex: { type: Sequelize.ENUM('MALE', 'FEMALE'), allowNull: false },
      age_months_start: { type: Sequelize.INTEGER, allowNull: false },
      age_months_end: { type: Sequelize.INTEGER, allowNull: false },
      expected_weight_kg: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      daily_feed_requirement_kg: { type: Sequelize.DECIMAL(4, 2), allowNull: true },
      vaccination_schedule: { type: Sequelize.JSON, allowNull: true },
      deworming_interval_days: { type: Sequelize.INTEGER, allowNull: true },
      expected_kidding_rate: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('goat_pop_templates', ['breed', 'sex', 'age_months_start'], { name: 'idx_gpt_breed_sex_age' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('goat_pop_templates');
    await queryInterface.dropTable('goat_revenue_events');
    await queryInterface.dropTable('goat_cost_events');
    await queryInterface.dropTable('goat_feed_logs');
    await queryInterface.dropTable('goat_breeding_events');
    await queryInterface.dropTable('goat_health_events');
    await queryInterface.dropTable('goat_growth_logs');
    await queryInterface.dropTable('goat_animals');
    await queryInterface.dropTable('goat_herds');
  },
};
