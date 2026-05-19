'use strict';

/**
 * sathi_incentive_ledger — milestone bonuses (10% extra) for hitting
 * 100 beneficiaries (first-product-activated) in a qualifying period.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sathi_incentive_ledger', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      intermediary_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'intermediaries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      milestone: {
        type: Sequelize.ENUM('100_beneficiaries', '250_beneficiaries', '500_beneficiaries'),
        allowNull: false,
        defaultValue: '100_beneficiaries',
      },
      beneficiary_count_snapshot: { type: Sequelize.INTEGER, allowNull: false },
      qualifying_period_start: { type: Sequelize.DATEONLY, allowNull: false },
      qualifying_period_end: { type: Sequelize.DATEONLY, allowNull: false },
      base_amount_paise: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Sum of commission_amount_paise for the period',
      },
      bonus_rate: { type: Sequelize.DECIMAL(5, 4), allowNull: false, defaultValue: 0.1000 },
      bonus_amount_paise: { type: Sequelize.BIGINT, allowNull: false },
      payout_status: {
        type: Sequelize.ENUM('accrued', 'approved', 'paid', 'clawed_back'),
        allowNull: false,
        defaultValue: 'accrued',
      },
      payout_batch_id: { type: Sequelize.STRING(36), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex(
      'sathi_incentive_ledger',
      ['intermediary_id', 'milestone', 'qualifying_period_start'],
      {
        unique: true,
        name: 'uk_sathi_incentive_intermediary_period',
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sathi_incentive_ledger');
  },
};
