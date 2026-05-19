'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('scale_of_finances', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      sof_code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
      },
      sof_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      min_land_size_hectares: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true,
      },
      max_land_size_hectares: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true,
      },
      avg_investment_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      recommended_loan_amount: {
        type: Sequelize.DECIMAL(15, 2),
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
    await queryInterface.dropTable('scale_of_finances');
  },
};
