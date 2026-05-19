'use strict';

/**
 * Migration — Create bank_loan_account_histories
 *
 * Audit trail + time-series store for the May 2026 bank pilot cohort
 * report. Every time the NPA calculation cron runs (daily, 02:00 local),
 * it writes one row per active bank_loan_account capturing the current
 * outstanding, DPD, and SMA classification.
 *
 * The cohort report endpoints read from this table to plot weekly NPA%
 * trends for test vs control cohorts over the 3-month pilot window.
 *
 * Design choice: separate history table instead of appending directly
 * to bank_loan_accounts. Keeps the live table compact and lets us query
 * "SMA % by week for bank X in district Y" with a single GROUP BY.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bank_loan_account_histories', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      bank_loan_account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bank_loan_accounts', key: 'id' },
      },
      // Denormalized pilot dimensions so the cohort report doesn't need
      // to join back to bank_loan_accounts / bank_portfolio_imports on
      // every aggregation query. Written at snapshot time.
      bank_name: { type: Sequelize.STRING(100), allowNull: true },
      district: { type: Sequelize.STRING(100), allowNull: true },
      cohort_tag: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'unassigned' },
      loan_type: { type: Sequelize.STRING(40), allowNull: true },

      // Snapshot values at the date of the cron run
      sma_classification: {
        type: Sequelize.ENUM('standard', 'sma_0', 'sma_1', 'sma_2', 'npa'),
        allowNull: false,
        defaultValue: 'standard',
      },
      days_past_due: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      outstanding_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      overdue_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },

      snapshot_date: { type: Sequelize.DATEONLY, allowNull: false },

      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Core index: the cohort report query shape is always
    //   WHERE bank_name = ? AND snapshot_date BETWEEN ? AND ?
    //   GROUP BY district, cohort_tag, sma_classification, snapshot_date
    await queryInterface.addIndex('bank_loan_account_histories', {
      name: 'idx_blah_bank_date',
      fields: ['bank_name', 'snapshot_date'],
    });
    await queryInterface.addIndex('bank_loan_account_histories', {
      name: 'idx_blah_district_date',
      fields: ['district', 'snapshot_date'],
    });
    await queryInterface.addIndex('bank_loan_account_histories', {
      name: 'idx_blah_account_date',
      fields: ['bank_loan_account_id', 'snapshot_date'],
    });
    // Aggregate query shape — pilot-wide cohort comparison
    await queryInterface.addIndex('bank_loan_account_histories', {
      name: 'idx_blah_cohort_sma_date',
      fields: ['cohort_tag', 'sma_classification', 'snapshot_date'],
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bank_loan_account_histories');
  },
};
