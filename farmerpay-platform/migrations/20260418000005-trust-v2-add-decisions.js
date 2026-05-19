'use strict';

/**
 * TRUST v2 — CREATE trust_decisions.
 * Banker SANCTION / RECONSIDER / REJECT records (distinct from farmer-initiated trust_score_appeals).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_decisions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      decision_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      score_history_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'trust_score_history', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      banker_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      decision: {
        type: Sequelize.ENUM('SANCTION', 'RECONSIDER', 'REJECT'),
        allowNull: false,
      },
      reason_code: {
        type: Sequelize.ENUM('BELOW_THRESHOLD', 'ADVERSE_CIBIL', 'FIELD_PENDING', 'POLICY_EXCEPTION', 'OTHER'),
        allowNull: true,
      },
      reason_text: { type: Sequelize.TEXT, allowNull: true },
      cibil_acknowledged: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('trust_decisions', {
      fields: ['score_history_id', 'banker_id'],
      type: 'unique',
      name: 'uq_decision_snapshot_banker',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trust_decisions');
  },
};
