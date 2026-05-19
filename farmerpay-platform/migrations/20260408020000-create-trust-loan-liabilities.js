'use strict';

/**
 * Migration: Create trust_loan_liabilities.
 *
 * Captures every existing loan a farmer has — formal (KCC, NBFC, MFI) AND
 * informal (moneylender, relatives, SHG, FPO). This is the structured
 * counterpart to the FINANCIAL_LITERACY / REPAYMENT_CAPACITY questionnaire:
 * once we have real numbers we can compute true debt-to-income, leverage
 * headroom, and repayment discipline (via trust_loan_repayments).
 *
 * One row per active loan. Soft-delete via is_active.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_loan_liabilities', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      loan_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      lender_type: {
        type: Sequelize.ENUM(
          'BANK', 'NBFC', 'MFI', 'COOP', 'SHG', 'MONEYLENDER',
          'RELATIVE', 'FPO', 'GOVT_SCHEME', 'OTHER',
        ),
        allowNull: false,
      },
      lender_name: { type: Sequelize.STRING(120), allowNull: true },
      loan_purpose: {
        type: Sequelize.ENUM(
          'KCC', 'CROP', 'DAIRY', 'FISHERY', 'GOLD', 'PERSONAL',
          'HOUSING', 'EDUCATION', 'CONSUMER', 'BUSINESS', 'OTHER',
        ),
        allowNull: false,
      },
      principal_inr: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      outstanding_inr: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      interest_rate_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      tenure_months: { type: Sequelize.INTEGER, allowNull: true },
      emi_inr: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      emi_frequency: {
        type: Sequelize.ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'BULLET'),
        allowNull: false,
        defaultValue: 'MONTHLY',
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: true },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'CLOSED', 'DEFAULTED', 'RESTRUCTURED', 'WRITTEN_OFF'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      is_secured: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      collateral_description: { type: Sequelize.TEXT, allowNull: true },
      source: {
        type: Sequelize.ENUM('FARMER_DECLARED', 'AGENT_VERIFIED', 'BUREAU', 'INTERNAL', 'BACKFILL'),
        allowNull: false,
        defaultValue: 'FARMER_DECLARED',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('trust_loan_liabilities', ['farmer_id', 'is_active'], {
      name: 'idx_tll_farmer_active',
    });
    await queryInterface.addIndex('trust_loan_liabilities', ['farmer_id', 'status'], {
      name: 'idx_tll_farmer_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trust_loan_liabilities');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_loan_liabilities_lender_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_loan_liabilities_loan_purpose";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_loan_liabilities_emi_frequency";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_loan_liabilities_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_loan_liabilities_source";');
  },
};
