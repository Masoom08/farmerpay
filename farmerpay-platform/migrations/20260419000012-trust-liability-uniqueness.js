'use strict';

module.exports = {
  async up(queryInterface) {
    // Defense-in-depth unique index. Service code already scopes liability
    // lookups by farmer_id, but a unique (farmer_id, loan_uuid) at the DB
    // level also makes it impossible for two farmers to share a loan UUID
    // should the loan_uuid generator ever collide or be spoofed.
    await queryInterface.addIndex('trust_loan_liabilities', ['farmer_id', 'loan_uuid'], {
      name: 'uq_trust_liability_farmer_loan',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('trust_loan_liabilities', 'uq_trust_liability_farmer_loan');
  },
};
