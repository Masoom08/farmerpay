'use strict';

/**
 * Migration: Create fishery_treatment_events.
 * Disease/health treatment for ponds (analogous to dairy vet treatment).
 * Auto-creates a HEALTH_TREATMENT cost event on save.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fishery_treatment_events', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      pond_id: { type: Sequelize.STRING(36), allowNull: true },
      treatment_date: { type: Sequelize.DATEONLY, allowNull: false },
      condition: { type: Sequelize.STRING(200), allowNull: true },
      treatment_type: {
        type: Sequelize.ENUM(
          'DISEASE_TREATMENT', 'PROPHYLACTIC', 'WATER_TREATMENT',
          'PROBIOTIC', 'ANTIBIOTIC', 'PARASITE', 'NUTRITIONAL', 'OTHER',
        ),
        allowNull: false,
        defaultValue: 'OTHER',
      },
      affected_species: { type: Sequelize.STRING(80), allowNull: true },
      mortality_before_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      mortality_after_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      vet_name: { type: Sequelize.STRING(120), allowNull: true },
      vet_type: {
        type: Sequelize.ENUM('GOVT', 'PRIVATE', 'PARAVET', 'SELF'),
        allowNull: true,
      },
      medicine_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      vet_fee: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      other_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      cost_formal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      cost_informal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      payment_mode: {
        type: Sequelize.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },
      outcome: {
        type: Sequelize.ENUM('RECOVERED', 'IMPROVING', 'NO_CHANGE', 'WORSENED', 'TOTAL_LOSS'),
        allowNull: true,
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      cost_event_uuid: { type: Sequelize.STRING(36), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('fishery_treatment_events', ['farmer_id', 'treatment_date'], { name: 'idx_fte2_farmer_date' });
    await queryInterface.addIndex('fishery_treatment_events', ['pond_id'], { name: 'idx_fte2_pond' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fishery_treatment_events');
  },
};
