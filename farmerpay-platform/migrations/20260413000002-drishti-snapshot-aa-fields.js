'use strict';

/**
 * Add AA financial intelligence columns to drishti_farmer_snapshots.
 * Supports the DRISHTI ↔ AA integration (V2).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('drishti_farmer_snapshots', 'aa_data_available', {
      type: Sequelize.BOOLEAN, defaultValue: false, after: 'primary_non_farm_occupation',
    });
    await queryInterface.addColumn('drishti_farmer_snapshots', 'income_verification_source', {
      type: Sequelize.ENUM('self_reported', 'account_aggregator', 'mixed'),
      defaultValue: 'self_reported', after: 'aa_data_available',
    });
    await queryInterface.addColumn('drishti_farmer_snapshots', 'aa_seasonality', {
      type: Sequelize.JSON, allowNull: true, after: 'income_verification_source',
    });
    await queryInterface.addColumn('drishti_farmer_snapshots', 'aa_emi_capacity', {
      type: Sequelize.JSON, allowNull: true, after: 'aa_seasonality',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('drishti_farmer_snapshots', 'aa_emi_capacity').catch(() => {});
    await queryInterface.removeColumn('drishti_farmer_snapshots', 'aa_seasonality').catch(() => {});
    await queryInterface.removeColumn('drishti_farmer_snapshots', 'income_verification_source').catch(() => {});
    await queryInterface.removeColumn('drishti_farmer_snapshots', 'aa_data_available').catch(() => {});
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_drishti_farmer_snapshots_income_verification_source";');
  },
};
