'use strict';

/**
 * Adds the self-declared / AgriStack cross-check + self-declared insurance
 * fields to cultivation_cycles. Phase 1 only collects the self-declared
 * side; Phase 2 fills the AgriStack and DICE-verified columns.
 *
 * Index on agristack_crop_match so DICE / fund-diversion dashboards can
 * filter mismatches fast in Phase 2.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cultivation_cycles', 'self_declared_crop', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
    await queryInterface.addColumn('cultivation_cycles', 'self_declared_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // AgriStack cross-check (Phase 2 fills these)
    await queryInterface.addColumn('cultivation_cycles', 'agristack_crop', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
    await queryInterface.addColumn('cultivation_cycles', 'agristack_crop_checked_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('cultivation_cycles', 'agristack_crop_match', {
      type: Sequelize.ENUM('match', 'mismatch', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
    });

    // Self-declared insurance (Phase 2 verifies via DICE/PMFBY)
    await queryInterface.addColumn('cultivation_cycles', 'self_declared_insurance_status', {
      type: Sequelize.ENUM('insured', 'not_insured', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
    });
    await queryInterface.addColumn('cultivation_cycles', 'self_declared_policy_no', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('cultivation_cycles', 'dice_insurance_verified_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex('cultivation_cycles', {
      name: 'idx_cycles_agristack_match',
      fields: ['agristack_crop_match'],
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('cultivation_cycles', 'idx_cycles_agristack_match');
    await queryInterface.removeColumn('cultivation_cycles', 'dice_insurance_verified_at');
    await queryInterface.removeColumn('cultivation_cycles', 'self_declared_policy_no');
    await queryInterface.removeColumn('cultivation_cycles', 'self_declared_insurance_status');
    await queryInterface.removeColumn('cultivation_cycles', 'agristack_crop_match');
    await queryInterface.removeColumn('cultivation_cycles', 'agristack_crop_checked_at');
    await queryInterface.removeColumn('cultivation_cycles', 'agristack_crop');
    await queryInterface.removeColumn('cultivation_cycles', 'self_declared_at');
    await queryInterface.removeColumn('cultivation_cycles', 'self_declared_crop');

    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cultivation_cycles_agristack_crop_match";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cultivation_cycles_self_declared_insurance_status";');
    }
  },
};
