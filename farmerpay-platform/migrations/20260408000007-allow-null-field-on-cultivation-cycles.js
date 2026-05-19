'use strict';

/**
 * Phase 2A — relax cultivation_cycles.field_id to allow NULL.
 *
 * The farmer-app "Plant a new crop" card creates a cycle without forcing
 * the farmer through the farm-register + field-add flow first. Field is
 * an optional v1 attachment; the SAGE engine gracefully degrades when
 * it's null (no district resolution → falls back to "any latest weather
 * observation in the last 24h").
 *
 * The FK constraint to fields(id) stays in place — null is allowed by
 * the FK semantics.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('cultivation_cycles', 'field_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'fields', key: 'id' },
    });
  },

  async down(queryInterface, Sequelize) {
    // Existing rows with NULL field_id will block this — clean them up
    // before reverting.
    await queryInterface.changeColumn('cultivation_cycles', 'field_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'fields', key: 'id' },
    });
  },
};
