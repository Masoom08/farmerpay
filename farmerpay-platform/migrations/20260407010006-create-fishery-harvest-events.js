'use strict';

/**
 * Migration: Create fishery_harvest_events (inland-only domain event).
 * Records pond harvest details: yield, survival, loss. Closes the
 * stocking-to-harvest cycle. Subsequent sale revenue events reference
 * this harvest via source_event_uuid.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fishery_harvest_events', {
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
      stocking_event_uuid: { type: Sequelize.STRING(36), allowNull: true },
      harvest_date: { type: Sequelize.DATEONLY, allowNull: false },
      total_kg: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      avg_weight_grams: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      survival_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      loss_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      loss_reason: { type: Sequelize.STRING(100), allowNull: true },
      harvest_method: {
        type: Sequelize.ENUM('FULL_HARVEST', 'PARTIAL_HARVEST', 'THINNING'),
        allowNull: false,
        defaultValue: 'FULL_HARVEST',
      },
      labor_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('fishery_harvest_events', ['farmer_id', 'harvest_date'], { name: 'idx_fhe_farmer_date' });
    await queryInterface.addIndex('fishery_harvest_events', ['pond_id'], { name: 'idx_fhe_pond' });
    await queryInterface.addIndex('fishery_harvest_events', ['stocking_event_uuid'], { name: 'idx_fhe_stocking' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fishery_harvest_events');
  },
};
