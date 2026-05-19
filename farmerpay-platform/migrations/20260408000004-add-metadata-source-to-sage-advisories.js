'use strict';

/**
 * Adds two columns to sage_advisories so the Phase 1 mock seeder can write
 * structured ₹-framed data and so Phase 2 cleanup can purge mocks cleanly:
 *
 *   - advisory_metadata (JSON) — { title, body, rupeeImpact, linkedEmiDueDate,
 *                                  linkedLoanApplicationId, advisoryClass, ... }
 *   - source           (STRING) — e.g. 'mock_phase1', 'sage_generator', 'manual'
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sage_advisories', 'advisory_metadata', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('sage_advisories', 'source', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });
    await queryInterface.addIndex('sage_advisories', {
      name: 'idx_sage_advisories_source',
      fields: ['source'],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('sage_advisories', 'idx_sage_advisories_source');
    await queryInterface.removeColumn('sage_advisories', 'source');
    await queryInterface.removeColumn('sage_advisories', 'advisory_metadata');
  },
};
