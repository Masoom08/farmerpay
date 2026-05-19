'use strict';

/**
 * Migration: Create dairy_treatment_events for vet visits and treatments.
 * Splits medicine cost, vet fee, and other (transport etc.) and supports
 * formal/informal capture. Auto-creates a corresponding dairy_cost_events row
 * via the service layer.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dairy_treatment_events', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      animal_id: { type: Sequelize.STRING(36), allowNull: true },
      treatment_date: { type: Sequelize.DATEONLY, allowNull: false },
      condition: { type: Sequelize.STRING(200), allowNull: true },
      treatment_type: {
        type: Sequelize.ENUM(
          'VACCINATION', 'DEWORMING', 'MASTITIS', 'FEVER', 'INJURY',
          'REPRODUCTIVE', 'NUTRITIONAL', 'OTHER',
        ),
        allowNull: false,
        defaultValue: 'OTHER',
      },
      vet_name: { type: Sequelize.STRING(120), allowNull: true },
      vet_type: {
        type: Sequelize.ENUM('GOVT', 'PRIVATE', 'PARAVET', 'SELF'),
        allowNull: true,
      },
      medicine_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      vet_fee: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      other_cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      cost_formal: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      cost_informal: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      cost_total: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      outcome: {
        type: Sequelize.ENUM('RECOVERED', 'IMPROVING', 'NO_CHANGE', 'WORSENED', 'DIED'),
        allowNull: true,
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('dairy_treatment_events', ['farmer_id'], { name: 'idx_dte_farmer' });
    await queryInterface.addIndex('dairy_treatment_events', ['animal_id'], { name: 'idx_dte_animal' });
    await queryInterface.addIndex('dairy_treatment_events', ['treatment_date'], { name: 'idx_dte_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dairy_treatment_events');
  },
};
