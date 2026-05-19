'use strict';

/**
 * Migration: Create fishery_stocking_events (inland-only domain event).
 * When a farmer stocks a pond with fingerlings, this event captures the
 * stocking details and auto-creates a FINGERLINGS cost event.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fishery_stocking_events', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      pond_id: { type: Sequelize.STRING(36), allowNull: false },
      stocking_date: { type: Sequelize.DATEONLY, allowNull: false },
      species_name: { type: Sequelize.STRING(80), allowNull: false },
      species_type: {
        type: Sequelize.ENUM('CARP', 'CATFISH', 'TILAPIA', 'SHRIMP', 'PRAWN', 'ROHU', 'KATLA', 'PANGASIUS', 'OTHER'),
        allowNull: false,
      },
      fingerlings_count: { type: Sequelize.INTEGER, allowNull: false },
      cost_per_fingerling: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      total_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      cost_formal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      cost_informal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      payment_mode: {
        type: Sequelize.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },
      supplier_name: { type: Sequelize.STRING(120), allowNull: true },
      expected_survival_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      expected_harvest_date: { type: Sequelize.DATEONLY, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      cost_event_uuid: { type: Sequelize.STRING(36), allowNull: true }, // link to auto-created cost event
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('fishery_stocking_events', ['farmer_id', 'stocking_date'], { name: 'idx_fse_farmer_date' });
    await queryInterface.addIndex('fishery_stocking_events', ['pond_id'], { name: 'idx_fse_pond' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fishery_stocking_events');
  },
};
