'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('input_translations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      item_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      language_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      item_name_translated: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      item_description_translated: {
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

    await queryInterface.addConstraint('input_translations', {
      fields: ['item_id', 'language_code'],
      type: 'unique',
      name: 'uq_input_translations_item_id_language_code',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('input_translations');
  },
};
