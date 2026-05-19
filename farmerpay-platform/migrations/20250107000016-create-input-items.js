'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('input_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      item_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'input_categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      item_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      item_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      item_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      unit_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'input_units',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      manufacturer: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      active_ingredient: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      is_organic: {
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
    await queryInterface.dropTable('input_items');
  },
};
