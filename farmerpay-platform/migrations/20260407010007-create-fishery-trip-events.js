'use strict';

/**
 * Migration: Create fishery_trip_events (sea-only domain event).
 * Sea fishing is organized by trips — this is the P&L unit for sea farmers.
 * Captures trip diary (depart/return, fuel, crew, catch, landing) and
 * auto-creates FUEL/CREW_WAGES/ICE cost events + a landing revenue event.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fishery_trip_events', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      trip_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      vessel_id: { type: Sequelize.STRING(36), allowNull: false },
      depart_date: { type: Sequelize.DATEONLY, allowNull: false },
      depart_time: { type: Sequelize.TIME, allowNull: true },
      return_date: { type: Sequelize.DATEONLY, allowNull: true },
      return_time: { type: Sequelize.TIME, allowNull: true },
      trip_hours: { type: Sequelize.DECIMAL(6, 2), allowNull: true },

      // Inputs
      fuel_liters: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      fuel_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      ice_kg: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      ice_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      bait_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      crew_count: { type: Sequelize.INTEGER, allowNull: true },
      crew_wages_total: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      other_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

      // Catch
      catch_total_kg: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      catch_species_mix: { type: Sequelize.JSON, allowNull: true }, // [{species, kg}]
      landing_port: { type: Sequelize.STRING(120), allowNull: true },

      // Sale (auto-generates revenue event if provided)
      sale_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      sale_buyer: { type: Sequelize.STRING(120), allowNull: true },
      sale_buyer_type: {
        type: Sequelize.ENUM('WHOLESALER', 'AUCTION', 'DIRECT', 'EXPORTER', 'COOPERATIVE', 'RESTAURANT', 'OTHER'),
        allowNull: true,
      },
      auction_commission: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

      // Split across cost events
      cost_formal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      cost_informal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      payment_mode: {
        type: Sequelize.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },

      status: {
        type: Sequelize.ENUM('IN_PROGRESS', 'COMPLETED', 'ABORTED'),
        allowNull: false,
        defaultValue: 'COMPLETED',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('fishery_trip_events', ['farmer_id', 'depart_date'], { name: 'idx_fte_farmer_date' });
    await queryInterface.addIndex('fishery_trip_events', ['vessel_id'], { name: 'idx_fte_vessel' });
    await queryInterface.addIndex('fishery_trip_events', ['status'], { name: 'idx_fte_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fishery_trip_events');
  },
};
