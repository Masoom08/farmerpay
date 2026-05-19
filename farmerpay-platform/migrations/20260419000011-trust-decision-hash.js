'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trust_decisions', 'decision_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'SHA-256 integrity hash over decision fields',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('trust_decisions', 'decision_hash');
  },
};
