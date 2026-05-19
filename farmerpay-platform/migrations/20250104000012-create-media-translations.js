'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('media_translations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      media_asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'media_assets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      language_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      title_translated: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      description_translated: {
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

    await queryInterface.addIndex('media_translations', ['media_asset_id', 'language_code'], {
      unique: true,
      name: 'idx_media_translations_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('media_translations');
  },
};
