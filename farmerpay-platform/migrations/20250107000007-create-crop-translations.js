'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('crop_translations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      crop_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      language_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      crop_name_translated: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      crop_description_translated: {
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

    await queryInterface.addConstraint('crop_translations', {
      fields: ['crop_id', 'language_code'],
      type: 'unique',
      name: 'uq_crop_translations_crop_id_language_code',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('crop_translations');
  },
};
