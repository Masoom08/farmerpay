'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bank_portfolio_imports', 'payload_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'SHA-256 of file bytes + normalized metadata, for idempotency',
    });
    await queryInterface.addIndex('bank_portfolio_imports', ['payload_hash', 'created_at'], {
      name: 'idx_bank_imports_payload_hash',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('bank_portfolio_imports', 'idx_bank_imports_payload_hash');
    await queryInterface.removeColumn('bank_portfolio_imports', 'payload_hash');
  },
};
