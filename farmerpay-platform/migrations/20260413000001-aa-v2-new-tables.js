'use strict';

/**
 * AA V2 Migration: New tables (aa_transactions, aa_financial_analyses, aa_consent_audit_logs)
 * and ALTER aa_consents to add 'setu' provider + V2 columns.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. ALTER aa_consents: extend aa_provider ENUM with 'setu' ──
    await queryInterface.changeColumn('aa_consents', 'aa_provider', {
      type: Sequelize.ENUM('finvu', 'onemoney', 'cams', 'nsdl', 'setu'),
      allowNull: false,
    });

    // ── 2. ALTER aa_consents: add V2 columns ──
    await queryInterface.addColumn('aa_consents', 'consent_handle', {
      type: Sequelize.STRING(100), allowNull: true, after: 'is_active',
    });
    await queryInterface.addColumn('aa_consents', 'redirect_url', {
      type: Sequelize.TEXT, allowNull: true, after: 'consent_handle',
    });
    await queryInterface.addColumn('aa_consents', 'provider_consent_id', {
      type: Sequelize.STRING(100), allowNull: true, after: 'redirect_url',
    });
    await queryInterface.addColumn('aa_consents', 'approved_at', {
      type: Sequelize.DATE, allowNull: true, after: 'provider_consent_id',
    });
    await queryInterface.addColumn('aa_consents', 'expires_at', {
      type: Sequelize.DATE, allowNull: true, after: 'approved_at',
    });
    await queryInterface.addColumn('aa_consents', 'last_fetch_at', {
      type: Sequelize.DATE, allowNull: true, after: 'expires_at',
    });
    await queryInterface.addColumn('aa_consents', 'fetch_count', {
      type: Sequelize.INTEGER, defaultValue: 0, after: 'last_fetch_at',
    });

    // ── 3. CREATE aa_transactions ──
    await queryInterface.createTable('aa_transactions', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      transaction_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      consent_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'aa_consents', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      summary_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'aa_bank_statement_summaries', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      txn_date: { type: Sequelize.DATEONLY, allowNull: false },
      txn_type: { type: Sequelize.ENUM('credit', 'debit'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      balance_after: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      narration: { type: Sequelize.STRING(500), allowNull: true },
      reference: { type: Sequelize.STRING(100), allowNull: true },
      mode: { type: Sequelize.STRING(30), allowNull: true },
      income_category: { type: Sequelize.STRING(30), allowNull: true },
      expense_category: { type: Sequelize.STRING(30), allowNull: true },
      classification_confidence: { type: Sequelize.DECIMAL(3, 2), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('aa_transactions', ['farmer_id'], { name: 'idx_aa_txn_farmer' });
    await queryInterface.addIndex('aa_transactions', ['consent_id'], { name: 'idx_aa_txn_consent' });
    await queryInterface.addIndex('aa_transactions', ['txn_date'], { name: 'idx_aa_txn_date' });
    await queryInterface.addIndex('aa_transactions', ['income_category'], { name: 'idx_aa_txn_income_cat' });
    await queryInterface.addIndex('aa_transactions', ['expense_category'], { name: 'idx_aa_txn_expense_cat' });
    await queryInterface.addIndex('aa_transactions', ['farmer_id', 'txn_date'], { name: 'idx_aa_txn_farmer_date' });

    // ── 4. CREATE aa_financial_analyses ──
    await queryInterface.createTable('aa_financial_analyses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      analysis_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      consent_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'aa_consents', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      analysis_type: { type: Sequelize.ENUM('full', 'health_score_only', 'summary_only'), allowNull: false },
      health_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      health_grade: { type: Sequelize.CHAR(1), allowNull: true },
      score_components: { type: Sequelize.JSON, allowNull: true },
      income_summary: { type: Sequelize.JSON, allowNull: true },
      expense_summary: { type: Sequelize.JSON, allowNull: true },
      seasonality_data: { type: Sequelize.JSON, allowNull: true },
      risk_flags: { type: Sequelize.JSON, allowNull: true },
      bridge_data: { type: Sequelize.JSON, allowNull: true },
      analysis_mode: { type: Sequelize.ENUM('raw_transactions', 'summary_fallback'), allowNull: true },
      transaction_count: { type: Sequelize.INTEGER, allowNull: true },
      period_from: { type: Sequelize.DATEONLY, allowNull: true },
      period_to: { type: Sequelize.DATEONLY, allowNull: true },
      is_latest: { type: Sequelize.BOOLEAN, defaultValue: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('aa_financial_analyses', ['farmer_id'], { name: 'idx_aa_analysis_farmer' });
    await queryInterface.addIndex('aa_financial_analyses', ['consent_id'], { name: 'idx_aa_analysis_consent' });
    await queryInterface.addIndex('aa_financial_analyses', ['farmer_id', 'is_latest'], { name: 'idx_aa_analysis_farmer_latest' });

    // ── 5. CREATE aa_consent_audit_logs (immutable — no updated_at) ──
    await queryInterface.createTable('aa_consent_audit_logs', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      consent_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'aa_consents', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      event_type: {
        type: Sequelize.ENUM(
          'consent_requested', 'consent_approved', 'consent_rejected',
          'consent_revoked', 'consent_expired', 'data_fetched',
          'data_fetch_failed', 'analysis_run', 'consent_renewed'
        ),
        allowNull: false,
      },
      event_source: {
        type: Sequelize.ENUM('farmer', 'system', 'webhook', 'admin', 'scheduler'),
        allowNull: false,
      },
      provider: { type: Sequelize.STRING(20), allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('aa_consent_audit_logs', ['consent_id'], { name: 'idx_aa_audit_consent' });
    await queryInterface.addIndex('aa_consent_audit_logs', ['farmer_id'], { name: 'idx_aa_audit_farmer' });
    await queryInterface.addIndex('aa_consent_audit_logs', ['event_type'], { name: 'idx_aa_audit_event_type' });
    await queryInterface.addIndex('aa_consent_audit_logs', ['created_at'], { name: 'idx_aa_audit_created' });
  },

  async down(queryInterface) {
    // Drop new tables
    await queryInterface.dropTable('aa_consent_audit_logs');
    await queryInterface.dropTable('aa_financial_analyses');
    await queryInterface.dropTable('aa_transactions');

    // Drop ENUM types created by the tables
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_aa_transactions_txn_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_aa_financial_analyses_analysis_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_aa_financial_analyses_analysis_mode";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_aa_consent_audit_logs_event_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_aa_consent_audit_logs_event_source";');

    // Remove V2 columns from aa_consents
    await queryInterface.removeColumn('aa_consents', 'fetch_count').catch(() => {});
    await queryInterface.removeColumn('aa_consents', 'last_fetch_at').catch(() => {});
    await queryInterface.removeColumn('aa_consents', 'expires_at').catch(() => {});
    await queryInterface.removeColumn('aa_consents', 'approved_at').catch(() => {});
    await queryInterface.removeColumn('aa_consents', 'provider_consent_id').catch(() => {});
    await queryInterface.removeColumn('aa_consents', 'redirect_url').catch(() => {});
    await queryInterface.removeColumn('aa_consents', 'consent_handle').catch(() => {});

    // Revert aa_provider ENUM (remove 'setu')
    await queryInterface.changeColumn('aa_consents', 'aa_provider', {
      type: require('sequelize').ENUM('finvu', 'onemoney', 'cams', 'nsdl'),
      allowNull: false,
    });
  },
};
