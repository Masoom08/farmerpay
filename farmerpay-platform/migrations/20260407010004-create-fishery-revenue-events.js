'use strict';

/**
 * Migration: Create fishery_revenue_events — the master revenue ledger.
 * Append-only events with polymorphic scope (FARM / POND / VESSEL / TRIP).
 * Captures kg / rate / buyer details for sale events.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fishery_revenue_events', {
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
          'FISH_SALE_WHOLESALE', 'FISH_SALE_AUCTION', 'FISH_SALE_DIRECT',
          'FISH_SALE_EXPORT', 'FISH_SALE_COOPERATIVE',
          'BYPRODUCT_SALE', 'POND_LEASE_INCOME', 'VESSEL_SALE',
          'INSURANCE_PAYOUT', 'SUBSIDY', 'OTHER',
        ),
        allowNull: false,
      },
      species: { type: Sequelize.STRING(50), allowNull: true },
      quantity_kg: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      avg_weight_grams: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      rate_per_kg: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      amount_formal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      amount_informal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      buyer_name: { type: Sequelize.STRING(120), allowNull: true },
      buyer_type: {
        type: Sequelize.ENUM('WHOLESALER', 'AUCTION', 'DIRECT', 'EXPORTER', 'COOPERATIVE', 'RESTAURANT', 'OTHER'),
        allowNull: true,
      },
      payment_mode: {
        type: Sequelize.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },
      landing_port: { type: Sequelize.STRING(120), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      source_table: { type: Sequelize.STRING(50), allowNull: true },
      source_event_uuid: { type: Sequelize.STRING(36), allowNull: true },
      is_estimated: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_correction: { type: Sequelize.BOOLEAN, defaultValue: false },
      corrects_event_uuid: { type: Sequelize.STRING(36), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('fishery_revenue_events', ['farmer_id', 'event_date'], { name: 'idx_fre_farmer_date' });
    await queryInterface.addIndex('fishery_revenue_events', ['pond_id'], { name: 'idx_fre_pond' });
    await queryInterface.addIndex('fishery_revenue_events', ['vessel_id'], { name: 'idx_fre_vessel' });
    await queryInterface.addIndex('fishery_revenue_events', ['trip_id'], { name: 'idx_fre_trip' });
    await queryInterface.addIndex('fishery_revenue_events', ['category', 'event_date'], { name: 'idx_fre_cat_date' });
    await queryInterface.addIndex('fishery_revenue_events', ['source_table', 'source_event_uuid'], { name: 'idx_fre_source' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fishery_revenue_events');
  },
};
