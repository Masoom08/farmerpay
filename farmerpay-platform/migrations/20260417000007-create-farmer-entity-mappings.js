'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_entity_mappings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mapping_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      entity_type: { type: Sequelize.ENUM('bank_branch', 'pacs', 'fpo', 'vendor_cluster', 'agro_climatic_zone', 'sati_zone', 'mandi', 'insurance_unit', 'krishi_vigyan_kendra'), allowNull: false },
      entity_code: { type: Sequelize.STRING(50), allowNull: false },
      entity_name: { type: Sequelize.STRING(150), allowNull: true },
      entity_metadata: { type: Sequelize.JSON, allowNull: true },
      source: { type: Sequelize.ENUM('self_declared', 'geo_inferred', 'agent_assigned', 'bank_linked', 'agristack', 'system'), allowNull: false },
      confidence_score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      linked_at: { type: Sequelize.DATE, allowNull: false },
      verified_at: { type: Sequelize.DATE, allowNull: true },
      verified_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('farmer_entity_mappings', ['farmer_id', 'entity_type', 'entity_code'], { name: 'idx_fem_unique', unique: true, where: { is_active: true } });
    await queryInterface.addIndex('farmer_entity_mappings', ['entity_type', 'entity_code'], { name: 'idx_fem_type_code' });
    await queryInterface.addIndex('farmer_entity_mappings', ['farmer_id', 'entity_type'], { name: 'idx_fem_farmer_type' });
  },
  async down(queryInterface) { await queryInterface.dropTable('farmer_entity_mappings'); },
};
