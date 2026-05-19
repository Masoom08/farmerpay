'use strict';

/**
 * Migration: Extend dairy_animals with farmer-direct ownership, tag number,
 * lifecycle stage, purchase economics, and exit tracking. Adds nullable
 * columns so existing rows remain valid; the existing herd_register_id stays
 * as a soft anchor.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'dairy_animals';

    await queryInterface.addColumn(table, 'farmer_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addColumn(table, 'tag_number', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn(table, 'name', { type: Sequelize.STRING(80), allowNull: true });
    await queryInterface.addColumn(table, 'species', {
      type: Sequelize.ENUM('CATTLE', 'BUFFALO'),
      allowNull: true,
    });
    await queryInterface.addColumn(table, 'breed_code', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn(table, 'gender', {
      type: Sequelize.ENUM('FEMALE', 'MALE'),
      allowNull: true,
    });
    await queryInterface.addColumn(table, 'date_of_birth', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn(table, 'age_months', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn(table, 'purchase_date', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn(table, 'purchase_cost', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.addColumn(table, 'purchase_source', { type: Sequelize.STRING(120), allowNull: true });
    await queryInterface.addColumn(table, 'acquisition_mode', {
      type: Sequelize.ENUM('PURCHASED', 'BORN_ON_FARM', 'GIFTED'),
      allowNull: true,
    });
    await queryInterface.addColumn(table, 'current_lifecycle_stage', {
      type: Sequelize.ENUM(
        'CALF',
        'HEIFER',
        'DRY',
        'EARLY_LACTATION',
        'PEAK_LACTATION',
        'LATE_LACTATION',
        'PREGNANT',
        'BREEDING',
      ),
      allowNull: true,
    });
    await queryInterface.addColumn(table, 'status', {
      type: Sequelize.ENUM('ACTIVE', 'SOLD', 'DIED', 'CULLED'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    });
    await queryInterface.addColumn(table, 'exit_date', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn(table, 'exit_reason', { type: Sequelize.STRING(200), allowNull: true });
    await queryInterface.addColumn(table, 'exit_value', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.addColumn(table, 'primary_photo_url', { type: Sequelize.STRING(500), allowNull: true });
    await queryInterface.addColumn(table, 'notes', { type: Sequelize.TEXT, allowNull: true });

    // herd_register_id was previously NOT NULL — relax it so animals can exist
    // without belonging to a herd register row.
    await queryInterface.changeColumn(table, 'herd_register_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'dairy_herd_registers', key: 'id' },
    });

    await queryInterface.addIndex(table, ['farmer_id'], { name: 'idx_dairy_animals_farmer' });
    await queryInterface.addIndex(table, ['farmer_id', 'tag_number'], { name: 'idx_dairy_animals_farmer_tag' });
    await queryInterface.addIndex(table, ['status'], { name: 'idx_dairy_animals_status' });
  },

  async down(queryInterface, Sequelize) {
    const table = 'dairy_animals';
    await queryInterface.removeIndex(table, 'idx_dairy_animals_farmer').catch(() => {});
    await queryInterface.removeIndex(table, 'idx_dairy_animals_farmer_tag').catch(() => {});
    await queryInterface.removeIndex(table, 'idx_dairy_animals_status').catch(() => {});

    const cols = [
      'farmer_id', 'tag_number', 'name', 'species', 'breed_code', 'gender',
      'date_of_birth', 'age_months', 'purchase_date', 'purchase_cost',
      'purchase_source', 'acquisition_mode', 'current_lifecycle_stage', 'status',
      'exit_date', 'exit_reason', 'exit_value', 'primary_photo_url', 'notes',
    ];
    for (const col of cols) {
      await queryInterface.removeColumn(table, col).catch(() => {});
    }
  },
};
