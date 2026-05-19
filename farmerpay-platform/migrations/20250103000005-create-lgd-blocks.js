'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lgd_blocks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      block_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
      },
      district_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lgd_districts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      block_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      block_name_en: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
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

    await queryInterface.addIndex('lgd_blocks', ['district_id'], {
      name: 'lgd_blocks_district_id_index',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('lgd_blocks');
  },
};
