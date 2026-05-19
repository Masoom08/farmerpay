'use strict';

/**
 * TRUST v2 — Extend trust_score_history with v2 scoring columns.
 *
 * Adds: total_score_1000, decision, cibil_flag, cibil_overdue_inr,
 *        cibil_overdue_issuer, inputs_fingerprint, previous_snapshot_id.
 * Keeps: total_trust_score, score_band (backwards compat for BANK, DRISHTI, SENTINEL).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('trust_score_history', 'total_score_1000', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'TRUST v2 score on 0-1000 scale (derived: total_trust_score * 10)',
    });

    await queryInterface.addColumn('trust_score_history', 'decision', {
      type: Sequelize.ENUM('SANCTION', 'RECONSIDER', 'REJECT'),
      allowNull: true,
      comment: 'TRUST v2 decision band: >600=SANCTION, 500-600=RECONSIDER, <500=REJECT',
    });

    await queryInterface.addColumn('trust_score_history', 'cibil_flag', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'True if CIBIL adverse data present',
    });

    await queryInterface.addColumn('trust_score_history', 'cibil_overdue_inr', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Total overdue amount from CIBIL (INR)',
    });

    await queryInterface.addColumn('trust_score_history', 'cibil_overdue_issuer', {
      type: Sequelize.STRING(120),
      allowNull: true,
      comment: 'Name of issuer with largest overdue',
    });

    await queryInterface.addColumn('trust_score_history', 'inputs_fingerprint', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'SHA-256 hash of all scoring inputs; used for re-score detection',
    });

    await queryInterface.addColumn('trust_score_history', 'previous_snapshot_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'trust_score_history', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'FK to previous snapshot for delta computation',
    });

    await queryInterface.addIndex('trust_score_history',
      ['farmer_id', 'is_active', 'calculated_at'],
      { name: 'idx_trust_history_farmer_active_calc' },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('trust_score_history', 'idx_trust_history_farmer_active_calc');
    await queryInterface.removeColumn('trust_score_history', 'previous_snapshot_id');
    await queryInterface.removeColumn('trust_score_history', 'inputs_fingerprint');
    await queryInterface.removeColumn('trust_score_history', 'cibil_overdue_issuer');
    await queryInterface.removeColumn('trust_score_history', 'cibil_overdue_inr');
    await queryInterface.removeColumn('trust_score_history', 'cibil_flag');
    await queryInterface.removeColumn('trust_score_history', 'decision');
    await queryInterface.removeColumn('trust_score_history', 'total_score_1000');
  },
};
