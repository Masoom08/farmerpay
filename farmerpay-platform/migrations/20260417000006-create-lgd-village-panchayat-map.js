'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lgd_village_panchayat_map', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      lgd_village_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'lgd_villages', key: 'id' }, onUpdate: 'CASCADE' },
      lgd_panchayat_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'lgd_panchayats', key: 'id' }, onUpdate: 'CASCADE' },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('lgd_village_panchayat_map', ['lgd_village_id', 'lgd_panchayat_id'], { name: 'idx_village_panchayat_unique', unique: true });
  },
  async down(queryInterface) { await queryInterface.dropTable('lgd_village_panchayat_map'); },
};
