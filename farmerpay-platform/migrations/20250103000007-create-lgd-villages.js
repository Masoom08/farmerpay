'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lgd_villages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      village_code: {
        type: Sequelize.STRING(15),
        allowNull: false,
        unique: true,
      },
      block_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lgd_blocks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      village_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      village_name_en: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      total_households: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      population: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      has_bank_branch: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      has_primary_school: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      has_secondary_school: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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

    await queryInterface.addIndex('lgd_villages', ['block_id'], {
      name: 'lgd_villages_block_id_index',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('lgd_villages');
  },
};
