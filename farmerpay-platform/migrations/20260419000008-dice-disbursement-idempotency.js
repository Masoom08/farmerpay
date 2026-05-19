'use strict';

module.exports = {
  async up(queryInterface) {
    // Enforce disbursement idempotency at the DB level. Two rows with the
    // same (application_id, utr_reference_number) are a duplicate-disbursement bug,
    // not a valid business state. MySQL treats NULL UTRs as distinct, so
    // legacy rows without a UTR are unaffected.
    await queryInterface.addIndex('loan_disbursements', ['application_id', 'utr_reference_number'], {
      name: 'uniq_loan_disbursement_app_utr',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('loan_disbursements', 'uniq_loan_disbursement_app_utr');
  },
};
