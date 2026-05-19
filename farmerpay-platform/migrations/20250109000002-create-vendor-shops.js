'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vendor_shops', {
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
      shop_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      shop_name: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      shop_address: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      lgd_state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      lgd_district_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      lgd_block_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      shop_contact_phone: {
        type: Sequelize.STRING(13),
        allowNull: true,
      },
      shop_contact_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      shop_hours_open_time: {
        type: Sequelize.STRING(5),
        allowNull: true,
      },
      shop_hours_close_time: {
        type: Sequelize.STRING(5),
        allowNull: true,
      },
      is_physical_shop: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      is_online_delivery: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_home_delivery: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('vendor_shops');
  },
};
