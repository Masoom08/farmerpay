'use strict';

/**
 * Migration: Create trust_loan_repayments.
 *
 * One row per scheduled or actual installment for a trust_loan_liabilities row.
 * Captures BOTH expected (due_date / due_amount) AND actual (paid_date /
 * paid_amount). The status enum + days_late are the basis for the repayment-
 * discipline signal that feeds the TRUST score and the leverage calculator.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_loan_repayments', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      repayment_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      liability_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'trust_loan_liabilities', key: 'id' },
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
      installment_number: { type: Sequelize.INTEGER, allowNull: true },
      due_date: { type: Sequelize.DATEONLY, allowNull: false },
      due_amount_inr: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      paid_date: { type: Sequelize.DATEONLY, allowNull: true },
      paid_amount_inr: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      status: {
        type: Sequelize.ENUM('UPCOMING', 'PAID_ONTIME', 'PAID_LATE', 'PARTIAL', 'MISSED'),
        allowNull: false,
        defaultValue: 'UPCOMING',
      },
      days_late: { type: Sequelize.INTEGER, allowNull: true },
      payment_channel: {
        type: Sequelize.ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER'),
        allowNull: true,
      },
      reference_number: { type: Sequelize.STRING(120), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('trust_loan_repayments', ['liability_id'], {
      name: 'idx_tlr_liability',
    });
    await queryInterface.addIndex('trust_loan_repayments', ['farmer_id', 'due_date'], {
      name: 'idx_tlr_farmer_due',
    });
    await queryInterface.addIndex('trust_loan_repayments', ['farmer_id', 'status'], {
      name: 'idx_tlr_farmer_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trust_loan_repayments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_loan_repayments_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_loan_repayments_payment_channel";');
  },
};
