'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lgd_panchayats', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      panchayat_code: { type: Sequelize.STRING(15), allowNull: false, unique: true },
      block_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'lgd_blocks', key: 'id' }, onUpdate: 'CASCADE' },
      panchayat_name: { type: Sequelize.STRING(100), allowNull: false },
      panchayat_name_en: { type: Sequelize.STRING(100), allowNull: true },
      panchayat_type: { type: Sequelize.ENUM('gram_panchayat', 'town_panchayat', 'nagar_panchayat'), defaultValue: 'gram_panchayat' },
      total_villages: { type: Sequelize.INTEGER, allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('lgd_panchayats', ['block_id'], { name: 'idx_panchayat_block' });
  },
  async down(queryInterface) { await queryInterface.dropTable('lgd_panchayats'); },
};
