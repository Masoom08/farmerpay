'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ==================== DAIRY TABLES (13) ====================

    // 1. dairy_herd_registers
    await queryInterface.createTable('dairy_herd_registers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      register_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      register_name: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_herd_registers', ['farmer_id'], {
      name: 'dairy_herd_registers_farmer_id_index',
    });

    // 2. dairy_animals
    await queryInterface.createTable('dairy_animals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      animal_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      herd_register_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_herd_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      animal_type: {
        type: Sequelize.ENUM('cow', 'buffalo', 'goat', 'sheep'),
        allowNull: false,
      },
      breed: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      animal_identification_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      age_years: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      acquisition_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      acquisition_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      current_market_value: {
        type: Sequelize.DECIMAL(15, 2),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_animals', ['herd_register_id'], {
      name: 'dairy_animals_herd_register_id_index',
    });

    // 3. dairy_animal_health_records
    await queryInterface.createTable('dairy_animal_health_records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      animal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_animals',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      record_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      weight_kg: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      milk_production_liters: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      milk_quality: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      health_status: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      vaccinations_done: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      disease_detected: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      disease_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      treatment_given: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_animal_health_records', ['animal_id'], {
      name: 'dairy_animal_health_records_animal_id_index',
    });
    await queryInterface.addIndex('dairy_animal_health_records', ['record_date'], {
      name: 'dairy_animal_health_records_record_date_index',
    });

    // 4. dairy_milk_production_logs
    await queryInterface.createTable('dairy_milk_production_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      animal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_animals',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      production_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      morning_milk_liters: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      evening_milk_liters: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      total_daily_milk: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      milk_sold_liters: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      milk_price_per_liter: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      daily_income: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      buyer_name: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_milk_production_logs', ['animal_id'], {
      name: 'dairy_milk_production_logs_animal_id_index',
    });
    await queryInterface.addIndex('dairy_milk_production_logs', ['production_date'], {
      name: 'dairy_milk_production_logs_production_date_index',
    });

    // 5. dairy_feed_usage_logs
    await queryInterface.createTable('dairy_feed_usage_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      herd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_herd_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      feed_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      feed_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      feed_quantity_kg: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      feed_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      is_concentrate: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      is_fodder: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_feed_usage_logs', ['herd_id'], {
      name: 'dairy_feed_usage_logs_herd_id_index',
    });
    await queryInterface.addIndex('dairy_feed_usage_logs', ['feed_date'], {
      name: 'dairy_feed_usage_logs_feed_date_index',
    });

    // 6. dairy_breeding_records
    await queryInterface.createTable('dairy_breeding_records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      animal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_animals',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      breeding_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      male_partner_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      offspring_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      offspring_born_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      offspring_survival_rate: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_breeding_records', ['animal_id'], {
      name: 'dairy_breeding_records_animal_id_index',
    });

    // 7. dairy_expense_summaries
    await queryInterface.createTable('dairy_expense_summaries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      herd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_herd_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      expense_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expense_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      feed_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      veterinary_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      labor_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      other_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      total_expense: {
        type: Sequelize.DECIMAL(15, 2),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_expense_summaries', ['herd_id'], {
      name: 'dairy_expense_summaries_herd_id_index',
    });
    await queryInterface.addIndex('dairy_expense_summaries', ['expense_month', 'expense_year'], {
      name: 'dairy_expense_summaries_expense_month_expense_year_index',
    });

    // 8. dairy_income_summaries
    await queryInterface.createTable('dairy_income_summaries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      herd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_herd_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      income_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      income_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      milk_sold_liters: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      milk_income: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      animal_sale_income: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      manure_income: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      total_income: {
        type: Sequelize.DECIMAL(15, 2),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_income_summaries', ['herd_id'], {
      name: 'dairy_income_summaries_herd_id_index',
    });
    await queryInterface.addIndex('dairy_income_summaries', ['income_month', 'income_year'], {
      name: 'dairy_income_summaries_income_month_income_year_index',
    });

    // 9. dairy_profitability_summaries
    await queryInterface.createTable('dairy_profitability_summaries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      herd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_herd_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      summary_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      summary_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_income: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      total_expense: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      net_profit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      roi_percent: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_profitability_summaries', ['herd_id'], {
      name: 'dairy_profitability_summaries_herd_id_index',
    });
    await queryInterface.addIndex('dairy_profitability_summaries', ['summary_month', 'summary_year'], {
      name: 'dairy_profitability_summaries_summary_month_summary_year_index',
    });

    // 10. dairy_linked_loan_utilization
    await queryInterface.createTable('dairy_linked_loan_utilization', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      herd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_herd_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      linked_loan_application_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'loan_applications',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      utilization_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      utilized_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      utilization_purpose: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      verification_photo_url: {
        type: Sequelize.STRING(255),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_linked_loan_utilization', ['herd_id'], {
      name: 'dairy_linked_loan_utilization_herd_id_index',
    });
    await queryInterface.addIndex('dairy_linked_loan_utilization', ['linked_loan_application_id'], {
      name: 'dairy_linked_loan_utilization_linked_loan_application_id_index',
    });

    // 11. dairy_quality_metrics
    await queryInterface.createTable('dairy_quality_metrics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      herd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_herd_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      test_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      fat_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      protein_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      lactose_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      snf_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      somatic_cell_count: {
        type: Sequelize.INTEGER,
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_quality_metrics', ['herd_id'], {
      name: 'dairy_quality_metrics_herd_id_index',
    });
    await queryInterface.addIndex('dairy_quality_metrics', ['test_date'], {
      name: 'dairy_quality_metrics_test_date_index',
    });

    // 12. dairy_market_linkages
    await queryInterface.createTable('dairy_market_linkages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      herd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_herd_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      buyer_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      buyer_type: {
        type: Sequelize.ENUM('dairy_cooperative', 'private_dealer', 'retail'),
        allowNull: true,
      },
      agreement_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      agreement_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      agreed_price_per_liter: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      daily_collection: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      transport_cost_shared: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_market_linkages', ['herd_id'], {
      name: 'dairy_market_linkages_herd_id_index',
    });

    // 13. dairy_insurance_linkages
    await queryInterface.createTable('dairy_insurance_linkages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      herd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'dairy_herd_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      insurance_product: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      insurance_provider: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      premium_paid: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      coverage_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      animals_covered: {
        type: Sequelize.INTEGER,
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('dairy_insurance_linkages', ['herd_id'], {
      name: 'dairy_insurance_linkages_herd_id_index',
    });

    // ==================== FISHERY TABLES (10) ====================

    // 14. fishery_pond_registers
    await queryInterface.createTable('fishery_pond_registers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      register_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      register_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      total_pond_area_hectares: {
        type: Sequelize.DECIMAL(10, 4),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('fishery_pond_registers', ['farmer_id'], {
      name: 'fishery_pond_registers_farmer_id_index',
    });

    // 15. fishery_ponds
    await queryInterface.createTable('fishery_ponds', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pond_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      register_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fishery_pond_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      pond_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      pond_area_hectares: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true,
      },
      pond_depth_meters: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      water_source: {
        type: Sequelize.ENUM('well', 'canal', 'river', 'rainwater', 'groundwater'),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('fishery_ponds', ['register_id'], {
      name: 'fishery_ponds_register_id_index',
    });

    // 16. fishery_species_stocked
    await queryInterface.createTable('fishery_species_stocked', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pond_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fishery_ponds',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      species_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      species_type: {
        type: Sequelize.ENUM('carp', 'catfish', 'tilapia', 'shrimp', 'other'),
        allowNull: true,
      },
      stocking_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      fingerlings_stocked: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      fingerling_cost_per_unit: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      expected_survival_rate: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('fishery_species_stocked', ['pond_id'], {
      name: 'fishery_species_stocked_pond_id_index',
    });

    // 17. fishery_feeding_logs
    await queryInterface.createTable('fishery_feeding_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pond_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fishery_ponds',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      feeding_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      feed_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      quantity_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      feed_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      percentage_of_biomass: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('fishery_feeding_logs', ['pond_id'], {
      name: 'fishery_feeding_logs_pond_id_index',
    });
    await queryInterface.addIndex('fishery_feeding_logs', ['feeding_date'], {
      name: 'fishery_feeding_logs_feeding_date_index',
    });

    // 18. fishery_water_quality_logs
    await queryInterface.createTable('fishery_water_quality_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pond_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fishery_ponds',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      test_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      water_ph: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      dissolved_oxygen_ppm: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      ammonia_ppm: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      temperature_celsius: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      turbidity_cm: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      action_taken: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('fishery_water_quality_logs', ['pond_id'], {
      name: 'fishery_water_quality_logs_pond_id_index',
    });
    await queryInterface.addIndex('fishery_water_quality_logs', ['test_date'], {
      name: 'fishery_water_quality_logs_test_date_index',
    });

    // 19. fishery_health_monitoring
    await queryInterface.createTable('fishery_health_monitoring', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pond_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fishery_ponds',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      monitoring_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      disease_observed: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      disease_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      affected_fish_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      mortality_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      treatment_given: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('fishery_health_monitoring', ['pond_id'], {
      name: 'fishery_health_monitoring_pond_id_index',
    });
    await queryInterface.addIndex('fishery_health_monitoring', ['monitoring_date'], {
      name: 'fishery_health_monitoring_monitoring_date_index',
    });

    // 20. fishery_harvest_records
    await queryInterface.createTable('fishery_harvest_records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pond_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fishery_ponds',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      harvest_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      total_harvest_kg: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      average_fish_weight_grams: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      survival_rate_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      loss_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      loss_reason: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('fishery_harvest_records', ['pond_id'], {
      name: 'fishery_harvest_records_pond_id_index',
    });
    await queryInterface.addIndex('fishery_harvest_records', ['harvest_date'], {
      name: 'fishery_harvest_records_harvest_date_index',
    });

    // 21. fishery_sale_records
    await queryInterface.createTable('fishery_sale_records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      harvest_record_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fishery_harvest_records',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sale_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      quantity_sold_kg: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      price_per_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      total_sale_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      transportation_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      buyer_name: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('fishery_sale_records', ['harvest_record_id'], {
      name: 'fishery_sale_records_harvest_record_id_index',
    });

    // 22. fishery_expense_summaries
    await queryInterface.createTable('fishery_expense_summaries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      register_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fishery_pond_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      expense_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expense_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      fingerling_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      feed_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      water_management_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      labor_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      other_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      total_expense: {
        type: Sequelize.DECIMAL(15, 2),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('fishery_expense_summaries', ['register_id'], {
      name: 'fishery_expense_summaries_register_id_index',
    });
    await queryInterface.addIndex('fishery_expense_summaries', ['expense_month', 'expense_year'], {
      name: 'fishery_expense_summaries_expense_month_expense_year_index',
    });

    // 23. fishery_income_summaries
    await queryInterface.createTable('fishery_income_summaries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      register_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fishery_pond_registers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      income_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      income_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      fish_sale_kg: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      fish_sale_income: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      byproduct_income: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      total_income: {
        type: Sequelize.DECIMAL(15, 2),
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('fishery_income_summaries', ['register_id'], {
      name: 'fishery_income_summaries_register_id_index',
    });
    await queryInterface.addIndex('fishery_income_summaries', ['income_month', 'income_year'], {
      name: 'fishery_income_summaries_income_month_income_year_index',
    });
  },

  async down(queryInterface) {
    // Drop tables in reverse order to respect foreign key constraints
    await queryInterface.dropTable('fishery_income_summaries');
    await queryInterface.dropTable('fishery_expense_summaries');
    await queryInterface.dropTable('fishery_sale_records');
    await queryInterface.dropTable('fishery_harvest_records');
    await queryInterface.dropTable('fishery_health_monitoring');
    await queryInterface.dropTable('fishery_water_quality_logs');
    await queryInterface.dropTable('fishery_feeding_logs');
    await queryInterface.dropTable('fishery_species_stocked');
    await queryInterface.dropTable('fishery_ponds');
    await queryInterface.dropTable('fishery_pond_registers');
    await queryInterface.dropTable('dairy_insurance_linkages');
    await queryInterface.dropTable('dairy_market_linkages');
    await queryInterface.dropTable('dairy_quality_metrics');
    await queryInterface.dropTable('dairy_linked_loan_utilization');
    await queryInterface.dropTable('dairy_profitability_summaries');
    await queryInterface.dropTable('dairy_income_summaries');
    await queryInterface.dropTable('dairy_expense_summaries');
    await queryInterface.dropTable('dairy_breeding_records');
    await queryInterface.dropTable('dairy_feed_usage_logs');
    await queryInterface.dropTable('dairy_milk_production_logs');
    await queryInterface.dropTable('dairy_animal_health_records');
    await queryInterface.dropTable('dairy_animals');
    await queryInterface.dropTable('dairy_herd_registers');
  },
};
