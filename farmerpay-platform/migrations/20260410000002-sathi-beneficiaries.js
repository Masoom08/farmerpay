'use strict';

/**
 * sathi_beneficiaries — tracks farmers that "count" toward a Sathi's revenue
 * share and 100-beneficiary incentive. One row per (intermediary, farmer).
 *
 * A beneficiary becomes "counted" when first_product_activated_at is set
 * (first loan disbursed OR policy issued OR activity subscription active).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sathi_beneficiaries', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      intermediary_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'intermediaries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assignment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'intermediary_assignments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      first_product_activated_at: { type: Sequelize.DATE, allowNull: true },
      first_product_type: {
        type: Sequelize.ENUM('loan', 'insurance', 'activity'),
        allowNull: true,
      },
      first_product_ref_id: { type: Sequelize.INTEGER, allowNull: true },
      is_counted_for_incentive: { type: Sequelize.BOOLEAN, defaultValue: false },
      status: {
        type: Sequelize.ENUM('pending', 'active', 'dormant', 'churned'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('sathi_beneficiaries', ['intermediary_id', 'farmer_id'], {
      unique: true,
      name: 'uk_sathi_beneficiaries_intermediary_farmer',
    });
    await queryInterface.addIndex('sathi_beneficiaries', ['intermediary_id', 'status']);
    await queryInterface.addIndex('sathi_beneficiaries', ['first_product_activated_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sathi_beneficiaries');
  },
};
