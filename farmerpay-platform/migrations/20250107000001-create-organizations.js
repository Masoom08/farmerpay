'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('organizations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      org_code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
      },
      org_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      org_type: {
        type: Sequelize.ENUM('government', 'private', 'ngo', 'research_institute', 'cooperative'),
        allowNull: false,
      },
      headquarters_state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.dropTable('organizations');
  },
};
