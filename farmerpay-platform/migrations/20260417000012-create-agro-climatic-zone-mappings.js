'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('agro_climatic_zone_mappings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      climate_zone_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'climate_zones', key: 'id' }, onUpdate: 'CASCADE' },
      lgd_state_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'lgd_states', key: 'id' } },
      lgd_district_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'lgd_districts', key: 'id' } },
      lgd_block_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'lgd_blocks', key: 'id' } },
      mapping_source: { type: Sequelize.ENUM('icar', 'state_govt', 'manual'), defaultValue: 'icar' },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('agro_climatic_zone_mappings', ['climate_zone_id', 'lgd_block_id'], { name: 'idx_aczm_zone_block' });
    await queryInterface.addIndex('agro_climatic_zone_mappings', ['climate_zone_id', 'lgd_district_id'], { name: 'idx_aczm_zone_district' });
  },
  async down(queryInterface) { await queryInterface.dropTable('agro_climatic_zone_mappings'); },
};
