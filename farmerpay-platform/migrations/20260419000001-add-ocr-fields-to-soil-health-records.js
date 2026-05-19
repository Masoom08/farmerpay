'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('soil_health_records', 'ph', { type: Sequelize.DECIMAL(4, 2), allowNull: true });
    await queryInterface.addColumn('soil_health_records', 'ec_ds_per_m', { type: Sequelize.DECIMAL(6, 3), allowNull: true, comment: 'Electrical conductivity dS/m' });
    await queryInterface.addColumn('soil_health_records', 'zinc_ppm', { type: Sequelize.DECIMAL(6, 3), allowNull: true });
    await queryInterface.addColumn('soil_health_records', 'manganese_ppm', { type: Sequelize.DECIMAL(6, 3), allowNull: true });
    await queryInterface.addColumn('soil_health_records', 'copper_ppm', { type: Sequelize.DECIMAL(6, 3), allowNull: true });
    await queryInterface.addColumn('soil_health_records', 'card_id', { type: Sequelize.STRING(64), allowNull: true, comment: 'Soil health card reference number' });
    await queryInterface.addColumn('soil_health_records', 'valid_until', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('soil_health_records', 'image_url', { type: Sequelize.STRING(512), allowNull: true });
    await queryInterface.addColumn('soil_health_records', 'raw_ocr_text', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('soil_health_records', 'confidence_scores', { type: Sequelize.JSON, allowNull: true });
    await queryInterface.addColumn('soil_health_records', 'source', { type: Sequelize.ENUM('manual_entry', 'photo_ocr', 'photo_plus_manual'), allowNull: false, defaultValue: 'manual_entry' });
    await queryInterface.addColumn('soil_health_records', 'soil_type', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addIndex('soil_health_records', ['card_id'], { name: 'idx_shr_card_id' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('soil_health_records', 'idx_shr_card_id');
    await queryInterface.removeColumn('soil_health_records', 'soil_type');
    await queryInterface.removeColumn('soil_health_records', 'source');
    await queryInterface.removeColumn('soil_health_records', 'confidence_scores');
    await queryInterface.removeColumn('soil_health_records', 'raw_ocr_text');
    await queryInterface.removeColumn('soil_health_records', 'image_url');
    await queryInterface.removeColumn('soil_health_records', 'valid_until');
    await queryInterface.removeColumn('soil_health_records', 'card_id');
    await queryInterface.removeColumn('soil_health_records', 'copper_ppm');
    await queryInterface.removeColumn('soil_health_records', 'manganese_ppm');
    await queryInterface.removeColumn('soil_health_records', 'zinc_ppm');
    await queryInterface.removeColumn('soil_health_records', 'ec_ds_per_m');
    await queryInterface.removeColumn('soil_health_records', 'ph');
  },
};
