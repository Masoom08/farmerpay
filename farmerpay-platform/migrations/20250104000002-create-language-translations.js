'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('language_translations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      translatable_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      translatable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      language_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      key_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      translated_value: {
        type: Sequelize.TEXT,
        allowNull: false,
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

    await queryInterface.addIndex('language_translations', ['translatable_type', 'translatable_id', 'language_code', 'key_name'], {
      unique: true,
      name: 'idx_language_translations_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('language_translations');
  },
};
