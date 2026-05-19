'use strict';

/**
 * Migration: Create fishery_cost_events — the master cost ledger.
 * Append-only events with polymorphic scope (FARM / POND / VESSEL / TRIP).
 * Splits formal (receipted) and informal (cash/tip) amounts. Used by the P&L
 * allocation engine. Cost categories cover both inland and sea operations.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fishery_cost_events', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      event_date: { type: Sequelize.DATEONLY, allowNull: false },
      scope: {
        type: Sequelize.ENUM('FARM', 'POND', 'VESSEL', 'TRIP'),
        allowNull: false,
        defaultValue: 'FARM',
      },
      pond_id: { type: Sequelize.STRING(36), allowNull: true },
      vessel_id: { type: Sequelize.STRING(36), allowNull: true },
      trip_id: { type: Sequelize.STRING(36), allowNull: true },
      category: {
        type: Sequelize.ENUM(
          // Common
          'LABOR', 'LICENSE', 'INSURANCE', 'EQUIPMENT', 'TRANSPORT', 'OTHER',
          // Inland
          'FINGERLINGS', 'FEED', 'POND_PREP', 'AERATION_ELECTRICITY',
          'WATER_MGMT', 'HARVEST_LABOR', 'HEALTH_TREATMENT',
          // Sea
          'FUEL', 'ICE', 'NETS_GEAR', 'BAIT', 'CREW_WAGES',
          'BOAT_MAINTENANCE', 'AUCTION_COMMISSION', 'LANDING_FEES',
          // Asset purchase
          'POND_CONSTRUCTION', 'VESSEL_PURCHASE',
        ),
        allowNull: false,
      },
      subcategory: { type: Sequelize.STRING(50), allowNull: true },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      unit_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      amount_formal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      amount_informal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      payment_mode: {
        type: Sequelize.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },
      vendor_name: { type: Sequelize.STRING(120), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      source_table: { type: Sequelize.STRING(50), allowNull: true },
      source_event_uuid: { type: Sequelize.STRING(36), allowNull: true },
      is_recurring: { type: Sequelize.BOOLEAN, defaultValue: false },
      recurring_template_id: { type: Sequelize.INTEGER, allowNull: true },
      is_pending: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_estimated: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_correction: { type: Sequelize.BOOLEAN, defaultValue: false },
      corrects_event_uuid: { type: Sequelize.STRING(36), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('fishery_cost_events', ['farmer_id', 'event_date'], { name: 'idx_fce_farmer_date' });
    await queryInterface.addIndex('fishery_cost_events', ['pond_id'], { name: 'idx_fce_pond' });
    await queryInterface.addIndex('fishery_cost_events', ['vessel_id'], { name: 'idx_fce_vessel' });
    await queryInterface.addIndex('fishery_cost_events', ['trip_id'], { name: 'idx_fce_trip' });
    await queryInterface.addIndex('fishery_cost_events', ['category', 'event_date'], { name: 'idx_fce_cat_date' });
    await queryInterface.addIndex('fishery_cost_events', ['source_table', 'source_event_uuid'], { name: 'idx_fce_source' });
    await queryInterface.addIndex('fishery_cost_events', ['is_pending'], { name: 'idx_fce_pending' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fishery_cost_events');
  },
};
