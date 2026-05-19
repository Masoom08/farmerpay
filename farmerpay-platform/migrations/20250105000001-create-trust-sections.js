'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_sections', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      section_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      section_code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
      },
      section_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      section_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      section_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      weight_in_total_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      max_points: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
    await queryInterface.dropTable('trust_sections');
  },
};
