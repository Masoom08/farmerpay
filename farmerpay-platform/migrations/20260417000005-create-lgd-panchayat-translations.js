'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lgd_panchayat_translations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      lgd_panchayat_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'lgd_panchayats', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      language_code: { type: Sequelize.STRING(5), allowNull: false },
      translated_name: { type: Sequelize.STRING(100), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('lgd_panchayat_translations', ['lgd_panchayat_id', 'language_code'], { name: 'idx_panchayat_trans_unique', unique: true });
  },
  async down(queryInterface) { await queryInterface.dropTable('lgd_panchayat_translations'); },
};
