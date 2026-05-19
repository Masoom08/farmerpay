'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('variety_soil_compatibilities', {
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
      soil_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'soil_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      suitability: {
        type: Sequelize.ENUM('not_suitable', 'marginal', 'suitable', 'ideal'),
        allowNull: true,
      },
      expected_yield_adjustment_percent: {
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
    await queryInterface.dropTable('variety_soil_compatibilities');
  },
};
