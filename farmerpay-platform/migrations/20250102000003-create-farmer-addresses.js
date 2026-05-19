'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_addresses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      address_type: {
        type: Sequelize.ENUM('permanent', 'current', 'farm'),
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
      lgd_village_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      street_address: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      postal_code: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      is_primary_address: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      address_verified_by_agent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      agent_verification_timestamp: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      verification_photo_url: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('farmer_addresses', ['farmer_id', 'address_type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('farmer_addresses');
  },
};
