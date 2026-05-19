'use strict';

/**
 * Migration — Add nullable `bank_loan_account_id` FK to
 * `loan_repayment_schedules` and `loan_repayments` so that EMI schedules
 * and payment history imported from a bank's Excel workbook (the May 2026
 * pilot) can be linked to a `bank_loan_accounts` row instead of a
 * FarmerPay-originated `loan_applications` row.
 *
 * Also relaxes `application_id` to nullable on both tables so a row can
 * point at EITHER the bank loan account (external, bank-imported) OR the
 * FarmerPay loan application (internal origination), never both.
 *
 * The exactly-one-of constraint is enforced at the service layer, not at
 * the DB layer, because MySQL < 8.0.16 doesn't enforce CHECK constraints.
 * Both service paths (applicationService.generateRepaymentSchedule and
 * bankPortfolioBulkService.importWorkbook) already know which FK they're
 * populating, so this is safe.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── loan_repayment_schedules ────────────────────────────────
    // 1. Relax application_id nullability using raw SQL — Sequelize's
    //    changeColumn() silently leaves the NOT NULL intact in MySQL
    //    when a `references` clause is present, so use ALTER TABLE directly.
    await queryInterface.sequelize.query(
      'ALTER TABLE loan_repayment_schedules MODIFY COLUMN application_id INT NULL'
    );

    // 2. Add bank_loan_account_id FK
    await queryInterface.addColumn('loan_repayment_schedules', 'bank_loan_account_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'bank_loan_accounts', key: 'id' },
      comment: 'Set for bank-imported rows (pilot). Mutually exclusive with application_id.',
    });

    // 3. Index for fast lookup by bank account
    await queryInterface.addIndex('loan_repayment_schedules', {
      name: 'idx_lrs_bank_loan_account_id',
      fields: ['bank_loan_account_id'],
    });

    // ─── loan_repayments ─────────────────────────────────────────
    await queryInterface.sequelize.query(
      'ALTER TABLE loan_repayments MODIFY COLUMN application_id INT NULL'
    );

    await queryInterface.addColumn('loan_repayments', 'bank_loan_account_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'bank_loan_accounts', key: 'id' },
      comment: 'Set for bank-imported rows (pilot). Mutually exclusive with application_id.',
    });

    await queryInterface.addIndex('loan_repayments', {
      name: 'idx_lr_bank_loan_account_id',
      fields: ['bank_loan_account_id'],
    });

    // Composite index used by the NPA cron job (walk every bank loan
    // and find its oldest unpaid installment quickly)
    await queryInterface.addIndex('loan_repayment_schedules', {
      name: 'idx_lrs_bla_due_date',
      fields: ['bank_loan_account_id', 'due_date'],
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes
    await queryInterface.removeIndex('loan_repayment_schedules', 'idx_lrs_bla_due_date');
    await queryInterface.removeIndex('loan_repayments', 'idx_lr_bank_loan_account_id');
    await queryInterface.removeIndex('loan_repayment_schedules', 'idx_lrs_bank_loan_account_id');

    // Drop FK columns (also drops the FK constraint automatically)
    await queryInterface.removeColumn('loan_repayments', 'bank_loan_account_id');
    await queryInterface.removeColumn('loan_repayment_schedules', 'bank_loan_account_id');

    // Restore NOT NULL on application_id
    // NOTE: this will fail if any pilot rows exist with application_id = NULL.
    // Acceptable for dev rollback; in production never run down-migrations.
    await queryInterface.changeColumn('loan_repayments', 'application_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'loan_applications', key: 'id' },
    });
    await queryInterface.changeColumn('loan_repayment_schedules', 'application_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'loan_applications', key: 'id' },
    });
  },
};
