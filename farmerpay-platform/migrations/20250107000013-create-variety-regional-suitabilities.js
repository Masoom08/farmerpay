'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('variety_regional_suitabilities', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      variety_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      district_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      suitability: {
        type: Sequelize.ENUM('not_suitable', 'marginal', 'suitable', 'ideal'),
        allowNull: true,
      },
      adoption_percentage: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      success_stories: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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
    await queryInterface.dropTable('variety_regional_suitabilities');
  },
};
