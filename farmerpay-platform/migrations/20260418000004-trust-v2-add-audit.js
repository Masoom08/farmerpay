'use strict';

/**
 * TRUST v2 — CREATE trust_audit_events.
 * Generic actor-action audit trail for banker / sathi / system actions.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_audit_events', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      event_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      actor_type: {
        type: Sequelize.ENUM('BANKER', 'SATHI', 'SYSTEM', 'FARMER'),
        allowNull: false,
      },
      actor_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      action: { type: Sequelize.STRING(64), allowNull: false },
      payload: { type: Sequelize.JSON, allowNull: true },
      score_history_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'trust_score_history', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('trust_audit_events', ['farmer_id', 'created_at'], { name: 'idx_audit_farmer_created' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trust_audit_events');
  },
};
