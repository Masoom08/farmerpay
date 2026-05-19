'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_address_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      history_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_address_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'farmer_addresses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      version_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      change_type: { type: Sequelize.ENUM('created', 'updated', 'deactivated'), allowNull: false },
      changed_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      change_reason: { type: Sequelize.STRING(255), allowNull: true },
      snapshot_data: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('farmer_address_history', ['farmer_address_id', 'version_number'], { name: 'idx_addr_hist_version' });
    await queryInterface.addIndex('farmer_address_history', ['farmer_id'], { name: 'idx_addr_hist_farmer' });
  },
  async down(queryInterface) { await queryInterface.dropTable('farmer_address_history'); },
};
