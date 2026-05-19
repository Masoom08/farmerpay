'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. vendor_transactions
    await queryInterface.createTable('vendor_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      transaction_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
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
      transaction_type: {
        type: Sequelize.ENUM('cash_sale', 'credit_sale', 'return', 'exchange'),
        allowNull: false,
      },
      transaction_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      transaction_amount: {
        type: Sequelize.DECIMAL(15, 2),
      },
      transaction_status: {
        type: Sequelize.ENUM('pending', 'completed', 'cancelled', 'disputed'),
        defaultValue: 'pending',
      },
      payment_status: {
        type: Sequelize.ENUM('paid', 'credit_given', 'partially_paid', 'overdue'),
        defaultValue: 'paid',
      },
      loan_application_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
    await queryInterface.addIndex('vendor_transactions', ['vendor_id']);
    await queryInterface.addIndex('vendor_transactions', ['farmer_id']);
    await queryInterface.addIndex('vendor_transactions', ['transaction_date']);

    // 2. vendor_transaction_items
    await queryInterface.createTable('vendor_transaction_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendor_transactions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      input_item_id: {
        type: Sequelize.STRING(36),
      },
      input_pack_id: {
        type: Sequelize.STRING(36),
      },
      quantity: {
        type: Sequelize.INTEGER,
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
      },
      line_total: {
        type: Sequelize.DECIMAL(15, 2),
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
    await queryInterface.addIndex('vendor_transaction_items', ['transaction_id']);

    // 3. vendor_transaction_evidence
    await queryInterface.createTable('vendor_transaction_evidence', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendor_transactions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      evidence_type: {
        type: Sequelize.ENUM('receipt_photo', 'invoice_scan', 'signature', 'gps_location'),
      },
      evidence_url: {
        type: Sequelize.STRING(255),
      },
      gps_latitude: {
        type: Sequelize.DECIMAL(10, 8),
      },
      gps_longitude: {
        type: Sequelize.DECIMAL(11, 8),
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
    await queryInterface.addIndex('vendor_transaction_evidence', ['transaction_id']);

    // 4. vendor_credit_ledgers
    await queryInterface.createTable('vendor_credit_ledgers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
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
      current_balance: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      credit_limit: {
        type: Sequelize.DECIMAL(15, 2),
      },
      last_payment_date: {
        type: Sequelize.DATEONLY,
      },
      last_payment_amount: {
        type: Sequelize.DECIMAL(15, 2),
      },
      total_credit_given: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      total_payments_received: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
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
    await queryInterface.addIndex('vendor_credit_ledgers', ['vendor_id', 'farmer_id'], { unique: true });

    // 5. vendor_farmer_links
    await queryInterface.createTable('vendor_farmer_links', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
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
      link_type: {
        type: Sequelize.ENUM('regular_customer', 'credit_customer', 'loan_linked'),
      },
      last_transaction_date: {
        type: Sequelize.DATEONLY,
      },
      transaction_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      total_value: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
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
    await queryInterface.addIndex('vendor_farmer_links', ['vendor_id', 'farmer_id'], { unique: true });

    // 6. vendor_loan_mappings
    await queryInterface.createTable('vendor_loan_mappings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      loan_application_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mapping_status: {
        type: Sequelize.ENUM('active', 'completed', 'cancelled'),
        defaultValue: 'active',
      },
      total_utilized: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      remaining_amount: {
        type: Sequelize.DECIMAL(15, 2),
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
    await queryInterface.addIndex('vendor_loan_mappings', ['vendor_id']);
    await queryInterface.addIndex('vendor_loan_mappings', ['loan_application_id']);

    // 7. vendor_loan_utilizations
    await queryInterface.createTable('vendor_loan_utilizations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      mapping_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendor_loan_mappings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      utilization_date: {
        type: Sequelize.DATEONLY,
      },
      utilized_amount: {
        type: Sequelize.DECIMAL(15, 2),
      },
      utilization_description: {
        type: Sequelize.STRING(255),
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
    await queryInterface.addIndex('vendor_loan_utilizations', ['mapping_id']);

    // 8. vendor_inventories
    await queryInterface.createTable('vendor_inventories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      input_item_id: {
        type: Sequelize.STRING(36),
      },
      input_pack_id: {
        type: Sequelize.STRING(36),
      },
      current_stock: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      reorder_level: {
        type: Sequelize.INTEGER,
      },
      last_restocked_date: {
        type: Sequelize.DATEONLY,
      },
      last_restocked_quantity: {
        type: Sequelize.INTEGER,
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
    await queryInterface.addIndex('vendor_inventories', ['vendor_id']);

    // 9. vendor_performances
    await queryInterface.createTable('vendor_performances', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      performance_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      performance_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_transactions: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      total_revenue: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      total_credit_given: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      total_credit_recovered: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      unique_farmers_served: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      average_rating: {
        type: Sequelize.DECIMAL(3, 1),
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
    await queryInterface.addIndex('vendor_performances', ['vendor_id']);
    await queryInterface.addIndex('vendor_performances', ['performance_month', 'performance_year']);

    // 10. vendor_ratings
    await queryInterface.createTable('vendor_ratings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
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
      rating_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      rating_feedback: {
        type: Sequelize.TEXT,
      },
      rated_on: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('vendor_ratings', ['vendor_id']);
    await queryInterface.addIndex('vendor_ratings', ['farmer_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vendor_ratings');
    await queryInterface.dropTable('vendor_performances');
    await queryInterface.dropTable('vendor_inventories');
    await queryInterface.dropTable('vendor_loan_utilizations');
    await queryInterface.dropTable('vendor_loan_mappings');
    await queryInterface.dropTable('vendor_farmer_links');
    await queryInterface.dropTable('vendor_credit_ledgers');
    await queryInterface.dropTable('vendor_transaction_evidence');
    await queryInterface.dropTable('vendor_transaction_items');
    await queryInterface.dropTable('vendor_transactions');
  },
};
