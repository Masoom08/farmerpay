'use strict';

/**
 * Phase 2A — denormalize farmer_id onto cultivation_cycles.
 *
 * The SAGE crop advisory engine resolves a cycle's farmer_id by walking
 * cycle → field → farm_register → farmer_id. When the new "Plant a new
 * crop" card creates a cycle without a field (field_id is nullable as of
 * migration 20260408000007), that walk fails and the engine bails with
 * { reason: 'no_farmer' }.
 *
 * Adding farmer_id directly on cultivation_cycles makes engine resolution
 * trivial regardless of field attachment.
 *
 * Backfill: existing rows get farmer_id populated from the field walk.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cultivation_cycles', 'farmer_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    });

    // Backfill existing rows from the field → farm_register chain.
    await queryInterface.sequelize.query(`
      UPDATE cultivation_cycles cc
      JOIN fields f ON f.id = cc.field_id
      JOIN farm_registers fr ON fr.id = f.farm_register_id
      SET cc.farmer_id = fr.farmer_id
      WHERE cc.farmer_id IS NULL
    `);

    await queryInterface.addIndex('cultivation_cycles', {
      name: 'idx_cycles_farmer',
      fields: ['farmer_id'],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('cultivation_cycles', 'idx_cycles_farmer');
    await queryInterface.removeColumn('cultivation_cycles', 'farmer_id');
  },
};
