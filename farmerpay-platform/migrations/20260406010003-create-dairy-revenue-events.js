'use strict';

/**
 * Migration: Create dairy_revenue_events — the master revenue ledger.
 * Captures milk sales (cooperative or direct), animal/calf sales, manure sales,
 * insurance payouts and subsidies. Manual data entry only — no OCR.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dairy_revenue_events', {
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
      scope: { type: Sequelize.ENUM('HERD', 'ANIMAL'), allowNull: false, defaultValue: 'HERD' },
      animal_id: { type: Sequelize.STRING(36), allowNull: true },
      category: {
        type: Sequelize.ENUM(
          'MILK_SALE_COOP', 'MILK_SALE_DIRECT', 'ANIMAL_SALE', 'CALF_SALE',
          'MANURE_SALE', 'INSURANCE_PAYOUT', 'SUBSIDY', 'OTHER',
        ),
        allowNull: false,
      },
      quantity_liters: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      fat_pct: { type: Sequelize.DECIMAL(4, 2), allowNull: true },
      snf_pct: { type: Sequelize.DECIMAL(4, 2), allowNull: true },
      rate_per_liter: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      payer_name: { type: Sequelize.STRING(120), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      source_table: { type: Sequelize.STRING(50), allowNull: true },
      source_event_uuid: { type: Sequelize.STRING(36), allowNull: true },
      is_estimated: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_correction: { type: Sequelize.BOOLEAN, defaultValue: false },
      corrects_event_uuid: { type: Sequelize.STRING(36), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('dairy_revenue_events', ['farmer_id', 'event_date'], { name: 'idx_dre_farmer_date' });
    await queryInterface.addIndex('dairy_revenue_events', ['animal_id'], { name: 'idx_dre_animal' });
    await queryInterface.addIndex('dairy_revenue_events', ['category', 'event_date'], { name: 'idx_dre_cat_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dairy_revenue_events');
  },
};
