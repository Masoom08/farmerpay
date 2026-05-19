'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cultivation_cycle_insurance_linkages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      cycle_id: {
        type: Sequelize.STRING(36),
        allowNull: false
      },
      insurance_product_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      insurance_provider: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      premium_paid: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      coverage_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      claim_filed_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      claim_settled_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cultivation_cycle_insurance_linkages');
  }
};
