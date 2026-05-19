'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_name_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      name_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      full_name_en: { type: Sequelize.STRING(150), allowNull: true },
      first_name_en: { type: Sequelize.STRING(60), allowNull: false },
      middle_name_en: { type: Sequelize.STRING(60), allowNull: true },
      last_name_en: { type: Sequelize.STRING(60), allowNull: true },
      full_name_vernacular: { type: Sequelize.STRING(200), allowNull: true },
      vernacular_language_code: { type: Sequelize.STRING(5), allowNull: true },
      phonetic_key_soundex: { type: Sequelize.STRING(20), allowNull: true },
      phonetic_key_metaphone: { type: Sequelize.STRING(30), allowNull: true },
      name_source: { type: Sequelize.ENUM('self_declared', 'aadhaar_ekyc', 'agent_verified', 'bank_cbs', 'agristack'), allowNull: true },
      name_match_confidence: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      standardized_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('farmer_name_records', ['farmer_id'], { name: 'idx_fnr_farmer_active', unique: true, where: { is_active: true } });
    await queryInterface.addIndex('farmer_name_records', ['phonetic_key_soundex'], { name: 'idx_fnr_soundex' });
    await queryInterface.addIndex('farmer_name_records', ['phonetic_key_metaphone'], { name: 'idx_fnr_metaphone' });
    await queryInterface.addIndex('farmer_name_records', ['full_name_en'], { name: 'idx_fnr_name_en' });
  },
  async down(queryInterface) { await queryInterface.dropTable('farmer_name_records'); },
};
