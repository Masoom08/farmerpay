'use strict';

/**
 * Extend vendor_type ENUM with aggregator roles and add vendor_id FK
 * to harvest_sale_records so post-harvest sales can be linked to
 * registered aggregator vendors.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Extend vendor_type ENUM
    await queryInterface.changeColumn('vendor_profiles', 'vendor_type', {
      type: Sequelize.ENUM(
        // existing
        'seeds_distributor', 'fertilizer_supplier', 'pesticide_dealer',
        'equipment_supplier', 'multipurpose_dealer',
        // new aggregator roles
        'aggregator', 'multipurpose_aggregator'
      ),
      allowNull: false,
    });

    // Add vendor_id to harvest_sale_records (nullable FK)
    const [[exists]] = await queryInterface.sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'harvest_sale_records' AND COLUMN_NAME = 'vendor_id'`
    );
    if (!exists) {
      await queryInterface.addColumn('harvest_sale_records', 'vendor_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'vendor_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Linked aggregator vendor for this sale',
      });
      await queryInterface.addIndex('harvest_sale_records', ['vendor_id'], {
        name: 'idx_harvest_sales_vendor',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('harvest_sale_records', 'idx_harvest_sales_vendor').catch(() => {});
    await queryInterface.removeColumn('harvest_sale_records', 'vendor_id').catch(() => {});
    await queryInterface.changeColumn('vendor_profiles', 'vendor_type', {
      type: Sequelize.ENUM(
        'seeds_distributor', 'fertilizer_supplier', 'pesticide_dealer',
        'equipment_supplier', 'multipurpose_dealer'
      ),
      allowNull: false,
    });
  },
};
