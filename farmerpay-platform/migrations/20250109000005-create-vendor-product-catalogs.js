'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vendor_product_catalogs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'vendor_profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      input_item_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
      },
      input_pack_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
      },
      mrp_rupees: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      vendor_selling_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      stock_quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      last_stock_update_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      availability_status: {
        type: Sequelize.ENUM('in_stock', 'low_stock', 'out_of_stock'),
        defaultValue: 'in_stock',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addConstraint('vendor_product_catalogs', {
      fields: ['vendor_id', 'input_item_id', 'input_pack_id'],
      type: 'unique',
      name: 'vendor_product_catalogs_vendor_item_pack_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('vendor_product_catalogs');
  },
};
