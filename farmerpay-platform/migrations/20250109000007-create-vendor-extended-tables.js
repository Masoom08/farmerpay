'use strict';

/**
 * Vyapar Extended Tables Migration
 * Creates 7 additional tables for credit summaries, behavior scoring, feeds, offline, commissions.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. vendor_credit_summaries
    await queryInterface.createTable('vendor_credit_summaries', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      vendor_id: {
        type: Sequelize.INTEGER, allowNull: false, unique: true,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      total_credit_given: { type: Sequelize.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      total_credit_collected: { type: Sequelize.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      total_credit_outstanding: { type: Sequelize.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      credit_default_rate_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      number_of_credit_farmers: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      average_credit_period_days: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // 2. vendor_purchase_behavior_scores
    await queryInterface.createTable('vendor_purchase_behavior_scores', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      vendor_id: {
        type: Sequelize.INTEGER, allowNull: false, unique: true,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      farmer_count_score: { type: Sequelize.INTEGER, allowNull: true },
      sales_consistency_score: { type: Sequelize.INTEGER, allowNull: true },
      credit_repayment_score: { type: Sequelize.INTEGER, allowNull: true },
      customer_satisfaction_score: { type: Sequelize.INTEGER, allowNull: true },
      product_quality_score: { type: Sequelize.INTEGER, allowNull: true },
      overall_performance_score: { type: Sequelize.INTEGER, allowNull: true },
      scoring_date: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // 3. vendor_sentinel_feeds
    await queryInterface.createTable('vendor_sentinel_feeds', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      vendor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      feed_date: { type: Sequelize.DATEONLY, allowNull: false },
      high_credit_exposure_farmers: { type: Sequelize.INTEGER, allowNull: true },
      overdue_credit_above_30days: { type: Sequelize.INTEGER, allowNull: true },
      total_overdue_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      credit_default_risk: { type: Sequelize.ENUM('low', 'medium', 'high'), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('vendor_sentinel_feeds', ['feed_date']);

    // 4. vendor_trust_feeds
    await queryInterface.createTable('vendor_trust_feeds', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      vendor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      feed_date: { type: Sequelize.DATEONLY, allowNull: false },
      farmers_served_with_credit: { type: Sequelize.INTEGER, allowNull: true },
      credit_repayment_rate_percent: { type: Sequelize.INTEGER, allowNull: true },
      average_credit_tenure_days: { type: Sequelize.INTEGER, allowNull: true },
      repeat_customer_percentage: { type: Sequelize.INTEGER, allowNull: true },
      farmer_satisfaction_rating: { type: Sequelize.DECIMAL(3, 1), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('vendor_trust_feeds', ['feed_date']);

    // 5. vendor_offline_queues
    await queryInterface.createTable('vendor_offline_queues', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      vendor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      offline_transaction_id: { type: Sequelize.STRING(36), allowNull: false },
      transaction_data: { type: Sequelize.JSON, allowNull: true },
      sync_status: {
        type: Sequelize.ENUM('pending', 'synced', 'failed'),
        allowNull: false, defaultValue: 'pending',
      },
      synced_at: { type: Sequelize.DATE, allowNull: true },
      failed_reason: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    // vendor_id index auto-created by FK
    await queryInterface.addIndex('vendor_offline_queues', ['sync_status']);

    // 6. vendor_commissions
    await queryInterface.createTable('vendor_commissions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      vendor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      commission_period_month: { type: Sequelize.INTEGER, allowNull: false },
      commission_period_year: { type: Sequelize.INTEGER, allowNull: false },
      sales_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      commission_rate_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      commission_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      commission_paid: { type: Sequelize.BOOLEAN, defaultValue: false },
      commission_paid_date: { type: Sequelize.DATEONLY, allowNull: true },
      payment_method: { type: Sequelize.STRING(50), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('vendor_commissions', {
      fields: ['vendor_id', 'commission_period_month', 'commission_period_year'],
      unique: true,
      name: 'idx_vendor_commission_period',
    });

    // 7. vendor_crp_mappings
    await queryInterface.createTable('vendor_crp_mappings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      vendor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      crp_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'field_agent_profiles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      mapping_status: {
        type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active',
      },
      mapped_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    // vendor_id index auto-created by FK
    await queryInterface.addIndex('vendor_crp_mappings', ['crp_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vendor_crp_mappings');
    await queryInterface.dropTable('vendor_commissions');
    await queryInterface.dropTable('vendor_offline_queues');
    await queryInterface.dropTable('vendor_trust_feeds');
    await queryInterface.dropTable('vendor_sentinel_feeds');
    await queryInterface.dropTable('vendor_purchase_behavior_scores');
    await queryInterface.dropTable('vendor_credit_summaries');
  },
};
