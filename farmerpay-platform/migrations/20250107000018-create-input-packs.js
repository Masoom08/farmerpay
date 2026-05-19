'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('input_packs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pack_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      item_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      pack_size_value: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      pack_size_unit_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'input_units',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      pack_quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      pack_price_rupees: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      is_retail_pack: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      distributor_name: {
        type: Sequelize.STRING(100),
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
    await queryInterface.dropTable('input_packs');
  },
};
