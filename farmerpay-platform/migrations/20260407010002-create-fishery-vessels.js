'use strict';

/**
 * Migration: Create fishery_vessels table.
 * First-class asset for sea fisheries. Sea-fishing economics revolve around
 * trips, and trips belong to a vessel — tracking vessels individually lets us
 * produce per-vessel P&L (analogous to per-animal P&L in dairy).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fishery_vessels', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      vessel_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      vessel_name: { type: Sequelize.STRING(100), allowNull: true },
      registration_number: { type: Sequelize.STRING(50), allowNull: true },
      vessel_type: {
        type: Sequelize.ENUM('CATAMARAN', 'MECHANIZED_BOAT', 'TRAWLER', 'CANOE', 'OTHER'),
        allowNull: false,
        defaultValue: 'MECHANIZED_BOAT',
      },
      length_meters: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      engine_hp: { type: Sequelize.INTEGER, allowNull: true },
      fuel_type: {
        type: Sequelize.ENUM('DIESEL', 'PETROL', 'KEROSENE', 'NONE'),
        allowNull: true,
      },
      crew_size: { type: Sequelize.INTEGER, allowNull: true },
      license_type: { type: Sequelize.STRING(50), allowNull: true },
      license_number: { type: Sequelize.STRING(50), allowNull: true },
      license_expiry: { type: Sequelize.DATEONLY, allowNull: true },
      home_port: { type: Sequelize.STRING(120), allowNull: true },
      purchase_date: { type: Sequelize.DATEONLY, allowNull: true },
      purchase_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      purchase_cost_formal: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      purchase_cost_informal: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      acquisition_mode: {
        type: Sequelize.ENUM('PURCHASED', 'INHERITED', 'GIFTED', 'LEASED'),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'SOLD', 'LOST', 'SCRAPPED', 'DORMANT'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      exit_date: { type: Sequelize.DATEONLY, allowNull: true },
      exit_reason: { type: Sequelize.STRING(50), allowNull: true },
      exit_value: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      primary_photo_url: { type: Sequelize.STRING(500), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('fishery_vessels', ['farmer_id', 'status'], { name: 'idx_fv_farmer_status' });
    await queryInterface.addIndex('fishery_vessels', ['registration_number'], { name: 'idx_fv_reg' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fishery_vessels');
  },
};
