'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pacs_registry', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pacs_code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      pacs_name: { type: Sequelize.STRING(150), allowNull: false },
      lgd_block_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'lgd_blocks', key: 'id' } },
      lgd_district_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'lgd_districts', key: 'id' } },
      affiliated_bank_name: { type: Sequelize.STRING(100), allowNull: true },
      affiliated_bank_ifsc: { type: Sequelize.STRING(11), allowNull: true },
      cbs_enabled: { type: Sequelize.BOOLEAN, defaultValue: false },
      total_members: { type: Sequelize.INTEGER, allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('pacs_registry', ['lgd_block_id'], { name: 'idx_pacs_block' });
    await queryInterface.addIndex('pacs_registry', ['lgd_district_id'], { name: 'idx_pacs_district' });
  },
  async down(queryInterface) { await queryInterface.dropTable('pacs_registry'); },
};
