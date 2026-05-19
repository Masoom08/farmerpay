'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_validation_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      validation_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      validation_target: { type: Sequelize.ENUM('name', 'aadhaar', 'address_permanent', 'address_current', 'address_farm', 'mobile', 'bank_account', 'land_ownership', 'farm_gps'), allowNull: false },
      level_1_self_declared: { type: Sequelize.BOOLEAN, defaultValue: false },
      level_1_at: { type: Sequelize.DATE, allowNull: true },
      level_2_app_validated: { type: Sequelize.BOOLEAN, defaultValue: false },
      level_2_at: { type: Sequelize.DATE, allowNull: true },
      level_2_method: { type: Sequelize.STRING(50), allowNull: true },
      level_3_geo_tagged: { type: Sequelize.BOOLEAN, defaultValue: false },
      level_3_at: { type: Sequelize.DATE, allowNull: true },
      level_3_lat: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      level_3_lng: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      level_3_accuracy_m: { type: Sequelize.INTEGER, allowNull: true },
      level_4_field_officer: { type: Sequelize.BOOLEAN, defaultValue: false },
      level_4_at: { type: Sequelize.DATE, allowNull: true },
      level_4_officer_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      level_4_photo_url: { type: Sequelize.STRING(500), allowNull: true },
      level_4_notes: { type: Sequelize.TEXT, allowNull: true },
      level_5_dpi_confirmed: { type: Sequelize.BOOLEAN, defaultValue: false },
      level_5_at: { type: Sequelize.DATE, allowNull: true },
      level_5_source: { type: Sequelize.ENUM('agristack', 'uidai', 'bank_cbs', 'uli', 'none'), allowNull: true },
      level_5_reference_id: { type: Sequelize.STRING(100), allowNull: true },
      composite_validation_level: { type: Sequelize.INTEGER, defaultValue: 0 },
      composite_confidence: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('farmer_validation_records', ['farmer_id', 'validation_target'], { name: 'idx_fvr_unique', unique: true, where: { is_active: true } });
    await queryInterface.addIndex('farmer_validation_records', ['composite_validation_level'], { name: 'idx_fvr_level' });
    await queryInterface.addIndex('farmer_validation_records', ['farmer_id'], { name: 'idx_fvr_farmer' });
  },
  async down(queryInterface) { await queryInterface.dropTable('farmer_validation_records'); },
};
