'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('media_renditions', {
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
      rendition_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      file_size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      dimensions: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      s3_key: {
        type: Sequelize.STRING(255),
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('media_renditions');
  },
};
