'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('variety_trait_assignments', {
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
      trait_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'traits',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      trait_value: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      trait_rating: {
        type: Sequelize.ENUM('poor', 'average', 'good', 'excellent'),
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
    await queryInterface.dropTable('variety_trait_assignments');
  },
};
