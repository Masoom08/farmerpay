'use strict';

/**
 * TRUST v2 — CREATE trust_evidence.
 *
 * External-source evidence rows (AA, CIBIL, ROOTS, POP, PMFBY).
 * For SATHI / FARMER_DECLARED / AGENT_VERIFIED evidence, use trust_responses.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_evidence', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      evidence_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      score_history_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'trust_score_history', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      pillar_code: {
        type: Sequelize.ENUM('P1', 'P2', 'P3', 'P4', 'P5', 'P6'),
        allowNull: false,
      },
      feature_code: { type: Sequelize.STRING(64), allowNull: false },
      band: { type: Sequelize.TINYINT, allowNull: false, comment: '1..5 band level' },
      band_label: { type: Sequelize.STRING(80), allowNull: true },
      source: {
        type: Sequelize.ENUM('AA', 'CIBIL', 'ROOTS', 'POP', 'PMFBY'),
        allowNull: false, comment: 'External source only',
      },
      fetched_at: { type: Sequelize.DATE, allowNull: false },
      raw_ref: { type: Sequelize.STRING(255), allowNull: true, comment: 'External system reference ID' },
      confidence: {
        type: Sequelize.ENUM('HIGH', 'MEDIUM', 'LOW'),
        defaultValue: 'HIGH',
      },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('trust_evidence', ['score_history_id'], { name: 'idx_evidence_score_history' });
    await queryInterface.addIndex('trust_evidence', ['farmer_id', 'source', 'fetched_at'], { name: 'idx_evidence_farmer_source' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trust_evidence');
  },
};
