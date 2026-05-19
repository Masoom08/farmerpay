'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cultivation_cycle_loan_linkages', {
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
      application_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      linkage_type: {
        type: Sequelize.ENUM('for_inputs', 'for_working_capital', 'for_equipment'),
        allowNull: true
      },
      linkage_confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      linkage_confirmed_by: {
        type: Sequelize.INTEGER,
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

    await queryInterface.addConstraint('cultivation_cycle_loan_linkages', {
      fields: ['cycle_id', 'application_id'],
      type: 'unique',
      name: 'uq_cycle_application'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cultivation_cycle_loan_linkages');
  }
};
