'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_score_appeals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      appeal_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      appeal_against_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      appeal_reason: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      appeal_submitted_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      reviewed_by_admin: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      appeal_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'under_review'),
        defaultValue: 'pending',
      },
      appeal_decision_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      decision_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trust_score_appeals');
  },
};
