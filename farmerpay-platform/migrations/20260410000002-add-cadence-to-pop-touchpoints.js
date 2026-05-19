'use strict';

/**
 * Add cadence column to activity_pop_touchpoints.
 *
 * Cadence drives the tier-aware data-entry fatigue reduction strategy:
 * SMALL herds only see DAILY essentials, MEDIUM adds WEEKLY,
 * LARGE collapses dailies into weekly bulk entry. Cadence values also
 * let us group touchpoints in the UI and drive reminder scheduling.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('activity_pop_touchpoints', 'cadence', {
      type: Sequelize.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'PER_EVENT'),
      allowNull: true,
      after: 'stage_key',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('activity_pop_touchpoints', 'cadence');
    // Drop the ENUM type cleanly (Postgres-style; no-op on MySQL)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_activity_pop_touchpoints_cadence";');
    }
  },
};
