'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bank_product_configs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      config_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      bank_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_providers', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      product_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'loan_products', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      trust_cutoff: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 60 },
      fhs_cutoff: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 50 },
      version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      change_reason: { type: Sequelize.STRING(500), allowNull: true },
      updated_by: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      effective_from: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('bank_product_configs', ['bank_id', 'product_id', 'is_active']);
    await queryInterface.addIndex('bank_product_configs', ['bank_id', 'is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bank_product_configs');
  },
};
