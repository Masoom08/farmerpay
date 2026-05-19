'use strict';

/**
 * sathi_commission_ledger — immutable per-revenue-event ledger.
 * 20% of each FP revenue event earned from a farmer is credited to
 * the Sathi who "owns" that farmer's active assignment.
 *
 * All amounts in paise (INT) to avoid float rounding.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sathi_commission_ledger', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      intermediary_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'intermediaries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      revenue_event_type: {
        type: Sequelize.ENUM(
          'loan_processing_fee',
          'insurance_commission',
          'txn_fee',
          'subsidy_facilitation_fee',
          'other'
        ),
        allowNull: false,
      },
      revenue_event_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Polymorphic FK — points to loan_application / insurance / txn id depending on event_type',
      },
      gross_amount_paise: { type: Sequelize.BIGINT, allowNull: false },
      commission_rate: { type: Sequelize.DECIMAL(5, 4), allowNull: false, defaultValue: 0.2000 },
      commission_amount_paise: { type: Sequelize.BIGINT, allowNull: false },
      accrual_period: {
        type: Sequelize.STRING(7),
        allowNull: false,
        comment: 'YYYY-MM — the month the commission is booked to',
      },
      payout_status: {
        type: Sequelize.ENUM('accrued', 'approved', 'paid', 'clawed_back'),
        allowNull: false,
        defaultValue: 'accrued',
      },
      payout_batch_id: { type: Sequelize.STRING(36), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('sathi_commission_ledger', ['intermediary_id', 'accrual_period']);
    await queryInterface.addIndex('sathi_commission_ledger', ['farmer_id']);
    await queryInterface.addIndex('sathi_commission_ledger', ['payout_status']);
    await queryInterface.addIndex('sathi_commission_ledger', ['revenue_event_type', 'revenue_event_ref_id'], {
      name: 'idx_sathi_commission_revenue_ref',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sathi_commission_ledger');
  },
};
