'use strict';

/**
 * Migration — Expand bank_loan_accounts for the May 2026 bank pilot.
 *
 * Background: the existing BankLoanAccount model was built for Finacle
 * gold-loan CSV imports. The May pilot needs to support non-gold loan
 * types (KCC, crop, dairy, horti, livestock, fisheries, input, JLG, SHG)
 * and adds geography + cohort columns so the pilot report can slice by
 * (bank, district, cohort).
 *
 * Changes (all additive — no data loss, existing gold-loan rows
 * continue to work unchanged):
 *
 * 1. `loan_type` ENUM expanded from 4 → 13 values
 * 2. New columns: scheme_name, scheme_code, borrower_aadhaar_last4,
 *    district, lgd_district_code, cohort_tag, cohort_assigned_at
 * 3. New composite index (bank_name comes from `bank_portfolio_imports`
 *    join — so the real useful index is on (district, cohort_tag,
 *    sma_classification) on bank_loan_accounts itself, and the join to
 *    bank_portfolio_imports is cheap via the existing import_id FK)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Expand loan_type enum. MySQL needs ALTER TABLE MODIFY for ENUM changes.
    await queryInterface.sequelize.query(`
      ALTER TABLE bank_loan_accounts
      MODIFY COLUMN loan_type ENUM(
        'agri_gold', 'consumption_gold', 'kcc_gold', 'allied_gold',
        'kcc', 'crop_loan', 'dairy_loan', 'livestock_loan',
        'horticulture_loan', 'fisheries_loan', 'animal_husbandry_loan',
        'input_loan', 'jlg', 'shg'
      ) NULL
    `);

    // 2. Add the new pilot columns
    await queryInterface.addColumn('bank_loan_accounts', 'scheme_name', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Bank scheme name e.g. "KCC Kharif 2025", "Dairy Entrepreneurship"',
    });
    await queryInterface.addColumn('bank_loan_accounts', 'scheme_code', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('bank_loan_accounts', 'borrower_aadhaar_last4', {
      type: Sequelize.STRING(4),
      allowNull: true,
      comment: 'Last 4 digits of Aadhaar for farmer linkage — never store full Aadhaar',
    });
    await queryInterface.addColumn('bank_loan_accounts', 'district', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'LGD district name — critical for the 6-district pilot geography dimension',
    });
    await queryInterface.addColumn('bank_loan_accounts', 'lgd_district_code', {
      type: Sequelize.STRING(10),
      allowNull: true,
    });
    await queryInterface.addColumn('bank_loan_accounts', 'cohort_tag', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'unassigned',
      comment: 'test | control | unassigned — supplied by the bank in the Excel upload',
    });
    await queryInterface.addColumn('bank_loan_accounts', 'cohort_assigned_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 3. Indexes — two composite indexes for the pilot weekly roll-up.
    //    Index A: (district, cohort_tag, sma_classification) — powers the
    //      per-district cohort report endpoint
    //    Index B: (cohort_tag, sma_classification) — powers the aggregate
    //      pilot report endpoint (all banks, all districts)
    await queryInterface.addIndex('bank_loan_accounts', {
      name: 'idx_bla_district_cohort_sma',
      fields: ['district', 'cohort_tag', 'sma_classification'],
    });
    await queryInterface.addIndex('bank_loan_accounts', {
      name: 'idx_bla_cohort_sma',
      fields: ['cohort_tag', 'sma_classification'],
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('bank_loan_accounts', 'idx_bla_cohort_sma');
    await queryInterface.removeIndex('bank_loan_accounts', 'idx_bla_district_cohort_sma');

    // Drop pilot columns in reverse order
    await queryInterface.removeColumn('bank_loan_accounts', 'cohort_assigned_at');
    await queryInterface.removeColumn('bank_loan_accounts', 'cohort_tag');
    await queryInterface.removeColumn('bank_loan_accounts', 'lgd_district_code');
    await queryInterface.removeColumn('bank_loan_accounts', 'district');
    await queryInterface.removeColumn('bank_loan_accounts', 'borrower_aadhaar_last4');
    await queryInterface.removeColumn('bank_loan_accounts', 'scheme_code');
    await queryInterface.removeColumn('bank_loan_accounts', 'scheme_name');

    // Shrink loan_type enum back to gold-only.
    // NOTE: if any rows use the new enum values, this down-migration will
    // lose that data — the rows' loan_type will be truncated/NULLed.
    // This is acceptable because down-migrations are development-only.
    await queryInterface.sequelize.query(`
      ALTER TABLE bank_loan_accounts
      MODIFY COLUMN loan_type ENUM(
        'agri_gold', 'consumption_gold', 'kcc_gold', 'allied_gold'
      ) NULL
    `);
  },
};
