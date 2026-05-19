'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_score_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      score_history_uuid: {
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
      total_trust_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      score_band: {
        type: Sequelize.ENUM('poor', 'fair', 'good', 'excellent'),
        defaultValue: 'poor',
      },
      score_band_min: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      score_band_max: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      section_scores: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      calculated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    await queryInterface.addIndex('trust_score_history', ['farmer_id', 'calculated_at'], {
      unique: true,
    });

    await queryInterface.addIndex('trust_score_history', ['farmer_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trust_score_history');
  },
};
