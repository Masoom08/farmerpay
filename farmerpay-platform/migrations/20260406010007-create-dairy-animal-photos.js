'use strict';

/**
 * Migration: Create dairy_animal_photos.
 * Manual photo upload only — no AI processing, no vision tokens. Photos are
 * stored on the filesystem (or S3 in prod) and resized via sharp at upload
 * time. Each animal can have multiple photos with one marked primary.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dairy_animal_photos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      photo_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      animal_id: { type: Sequelize.STRING(36), allowNull: false },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      photo_url: { type: Sequelize.STRING(500), allowNull: false },
      photo_type: {
        type: Sequelize.ENUM('PROFILE', 'HEALTH', 'TAG_VERIFICATION', 'OTHER'),
        allowNull: false,
        defaultValue: 'PROFILE',
      },
      caption: { type: Sequelize.STRING(200), allowNull: true },
      taken_at: { type: Sequelize.DATE, allowNull: true },
      is_primary: { type: Sequelize.BOOLEAN, defaultValue: false },
      file_size_kb: { type: Sequelize.INTEGER, allowNull: true },
      width_px: { type: Sequelize.INTEGER, allowNull: true },
      height_px: { type: Sequelize.INTEGER, allowNull: true },
      uploaded_via: {
        type: Sequelize.ENUM('CAMERA', 'GALLERY'),
        allowNull: true,
      },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('dairy_animal_photos', ['animal_id'], { name: 'idx_dap_animal' });
    await queryInterface.addIndex('dairy_animal_photos', ['farmer_id'], { name: 'idx_dap_farmer' });
    await queryInterface.addIndex('dairy_animal_photos', ['animal_id', 'is_primary'], { name: 'idx_dap_animal_primary' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dairy_animal_photos');
  },
};
