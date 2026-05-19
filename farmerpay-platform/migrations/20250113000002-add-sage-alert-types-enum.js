/**
 * Migration: Add harvest_timing and storage_opportunity to sage_alerts.alert_type ENUM.
 * Required for PULSE × SAGE integration (post-harvest advisory flow).
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    // For MySQL/MariaDB: ALTER COLUMN to extend ENUM
    await queryInterface.changeColumn('sage_alerts', 'alert_type', {
      type: queryInterface.sequelize.constructor.DataTypes.ENUM(
        'weather', 'pest_disease', 'input_availability', 'market_price',
        'loan_due', 'harvest_timing', 'storage_opportunity'
      ),
      allowNull: false,
    });
  },

  async down(queryInterface) {
    // Revert to original ENUM (note: rows with new values will fail constraint)
    await queryInterface.changeColumn('sage_alerts', 'alert_type', {
      type: queryInterface.sequelize.constructor.DataTypes.ENUM(
        'weather', 'pest_disease', 'input_availability', 'market_price', 'loan_due'
      ),
      allowNull: false,
    });
  },
};
