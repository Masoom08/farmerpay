'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loan_repayment_schedules', {
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
      schedule_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      due_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      principal_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      interest_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      is_paid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      paid_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      paid_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      days_overdue: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('pending', 'paid', 'overdue', 'forgiven'),
        defaultValue: 'pending',
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

    await queryInterface.addIndex('loan_repayment_schedules', ['application_id', 'due_date'], {
      name: 'loan_repayment_schedules_application_id_due_date_index',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('loan_repayment_schedules');
  },
};
