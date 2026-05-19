'use strict';

/**
 * Migration: Extend fishery_ponds table for v2 financial logbook.
 * Adds direct farmer_id (for query simplicity, bypassing register_id),
 * cycle tracking, and exit columns. Makes register_id nullable so v2
 * farmers can create ponds without going through the legacy register flow.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Make register_id nullable (v2 ponds live under farmer_id directly)
    await queryInterface.changeColumn('fishery_ponds', 'register_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Direct farmer_id so we don't need to join through register
    await queryInterface.addColumn('fishery_ponds', 'farmer_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addColumn('fishery_ponds', 'status', {
      type: Sequelize.ENUM('ACTIVE', 'DORMANT', 'DECOMMISSIONED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    });

    // Cycle tracking
    await queryInterface.addColumn('fishery_ponds', 'current_cycle_start_date', {
      type: Sequelize.DATEONLY, allowNull: true,
    });
    await queryInterface.addColumn('fishery_ponds', 'current_species', {
      type: Sequelize.STRING(50), allowNull: true,
    });
    await queryInterface.addColumn('fishery_ponds', 'expected_harvest_date', {
      type: Sequelize.DATEONLY, allowNull: true,
    });

    // Purchase/construction economics
    await queryInterface.addColumn('fishery_ponds', 'construction_date', {
      type: Sequelize.DATEONLY, allowNull: true,
    });
    await queryInterface.addColumn('fishery_ponds', 'construction_cost', {
      type: Sequelize.DECIMAL(12, 2), allowNull: true,
    });
    await queryInterface.addColumn('fishery_ponds', 'notes', {
      type: Sequelize.TEXT, allowNull: true,
    });

    // Exit tracking
    await queryInterface.addColumn('fishery_ponds', 'exit_date', {
      type: Sequelize.DATEONLY, allowNull: true,
    });
    await queryInterface.addColumn('fishery_ponds', 'exit_reason', {
      type: Sequelize.STRING(50), allowNull: true,
    });

    await queryInterface.addIndex('fishery_ponds', ['farmer_id', 'status'], { name: 'idx_fp_farmer_status' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('fishery_ponds', 'idx_fp_farmer_status');
    await queryInterface.removeColumn('fishery_ponds', 'exit_reason');
    await queryInterface.removeColumn('fishery_ponds', 'exit_date');
    await queryInterface.removeColumn('fishery_ponds', 'notes');
    await queryInterface.removeColumn('fishery_ponds', 'construction_cost');
    await queryInterface.removeColumn('fishery_ponds', 'construction_date');
    await queryInterface.removeColumn('fishery_ponds', 'expected_harvest_date');
    await queryInterface.removeColumn('fishery_ponds', 'current_species');
    await queryInterface.removeColumn('fishery_ponds', 'current_cycle_start_date');
    await queryInterface.removeColumn('fishery_ponds', 'status');
    await queryInterface.removeColumn('fishery_ponds', 'farmer_id');
  },
};
