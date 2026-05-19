'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loan_insurance_bundled', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      application_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'loan_applications',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      insurance_product_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      insurance_provider: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      premium_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      premium_is_bundled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      coverage_amount: {
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
    await queryInterface.dropTable('loan_insurance_bundled');
  },
};
