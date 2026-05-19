'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vendor_profiles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      vendor_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      vendor_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      vendor_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      vendor_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      vendor_type: {
        type: Sequelize.ENUM('seeds_distributor', 'fertilizer_supplier', 'pesticide_dealer', 'equipment_supplier', 'multipurpose_dealer'),
        allowNull: false,
      },
      business_registration_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      business_pan: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      shop_name: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      shop_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      shop_longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
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
    await queryInterface.dropTable('vendor_profiles');
  },
};
