'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('duplicate_detection_results', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      detection_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id_a: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE' },
      farmer_id_b: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE' },
      match_type: { type: Sequelize.ENUM('aadhaar_hash', 'phone_number', 'name_phonetic', 'address_cluster', 'device_fingerprint', 'bank_account', 'composite'), allowNull: false },
      match_score: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      match_details: { type: Sequelize.JSON, allowNull: true },
      status: { type: Sequelize.ENUM('pending_review', 'confirmed_duplicate', 'false_positive', 'merged', 'escalated'), defaultValue: 'pending_review' },
      reviewed_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      resolution_notes: { type: Sequelize.TEXT, allowNull: true },
      detected_at: { type: Sequelize.DATE, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('duplicate_detection_results', ['farmer_id_a', 'farmer_id_b', 'match_type'], { name: 'idx_ddr_pair_type', unique: true });
    await queryInterface.addIndex('duplicate_detection_results', ['status'], { name: 'idx_ddr_status' });
    await queryInterface.addIndex('duplicate_detection_results', ['farmer_id_a'], { name: 'idx_ddr_farmer_a' });
    await queryInterface.addIndex('duplicate_detection_results', ['farmer_id_b'], { name: 'idx_ddr_farmer_b' });

    await queryInterface.createTable('ghost_detection_flags', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      flag_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE' },
      flag_type: { type: Sequelize.ENUM('no_gps_activity', 'no_transactions', 'no_field_visits', 'no_crop_cycle', 'no_login_180d', 'suspicious_onboarding', 'device_farm'), allowNull: false },
      flag_severity: { type: Sequelize.ENUM('low', 'medium', 'high', 'critical'), allowNull: false },
      evidence: { type: Sequelize.JSON, allowNull: true },
      auto_detected: { type: Sequelize.BOOLEAN, defaultValue: true },
      status: { type: Sequelize.ENUM('open', 'investigating', 'cleared', 'confirmed_ghost', 'suspended'), defaultValue: 'open' },
      resolved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      resolution_notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('ghost_detection_flags', ['farmer_id'], { name: 'idx_gdf_farmer' });
    await queryInterface.addIndex('ghost_detection_flags', ['flag_type', 'status'], { name: 'idx_gdf_type_status' });
    await queryInterface.addIndex('ghost_detection_flags', ['flag_severity'], { name: 'idx_gdf_severity' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ghost_detection_flags');
    await queryInterface.dropTable('duplicate_detection_results');
  },
};
