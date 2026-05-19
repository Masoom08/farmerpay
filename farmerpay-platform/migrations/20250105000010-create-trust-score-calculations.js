'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_score_calculations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      calculation_uuid: {
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
      section_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'trust_sections',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      raw_points: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      max_possible_points: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      normalized_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      contribution_to_total: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
      },
      calculated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      calculation_basis: {
        type: Sequelize.STRING(200),
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

    await queryInterface.addIndex('trust_score_calculations', ['farmer_id', 'calculated_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trust_score_calculations');
  },
};
