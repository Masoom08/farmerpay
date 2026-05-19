'use strict';

/**
 * sathi_nudges — outbound soft nudges (repayment, renewal, KYC refresh).
 * linked_action_taken_at is set by a correlator that matches a repayment
 * event back to the most-recent relevant nudge for that farmer, giving
 * the "repaid via nudge" dashboard KPI.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sathi_nudges', {
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
      nudge_type: {
        type: Sequelize.ENUM(
          'repayment_due',
          'policy_renewal',
          'kyc_refresh',
          'subsidy_claim',
          'document_upload',
          'custom'
        ),
        allowNull: false,
      },
      channel: {
        type: Sequelize.ENUM('sms', 'push', 'whatsapp', 'ivr', 'in_app'),
        allowNull: false,
      },
      payload_json: { type: Sequelize.JSON, allowNull: true },
      scheduled_for: { type: Sequelize.DATE, allowNull: true },
      sent_at: { type: Sequelize.DATE, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      acknowledged_at: { type: Sequelize.DATE, allowNull: true },
      linked_action_taken_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Set when the nudged action (repayment, renewal, etc.) is actually completed',
      },
      linked_action_ref_id: { type: Sequelize.INTEGER, allowNull: true },
      status: {
        type: Sequelize.ENUM('scheduled', 'sent', 'delivered', 'failed', 'acknowledged'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('sathi_nudges', ['intermediary_id', 'status']);
    await queryInterface.addIndex('sathi_nudges', ['farmer_id', 'nudge_type']);
    await queryInterface.addIndex('sathi_nudges', ['scheduled_for']);
    await queryInterface.addIndex('sathi_nudges', ['linked_action_taken_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sathi_nudges');
  },
};
