'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('aa_consents', 'pending_data_fetch', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Set when a data fetch was needed but the queue was unreachable',
    });
    await queryInterface.addIndex('aa_consents', ['pending_data_fetch'], {
      name: 'idx_aa_consents_pending_fetch',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('aa_consents', 'idx_aa_consents_pending_fetch');
    await queryInterface.removeColumn('aa_consents', 'pending_data_fetch');
  },
};
