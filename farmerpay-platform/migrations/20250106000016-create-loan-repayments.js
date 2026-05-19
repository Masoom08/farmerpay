'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loan_repayments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      repayment_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
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
      schedule_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'loan_repayment_schedules',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      repayment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      repayment_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      payment_method: {
        type: Sequelize.ENUM('bank_transfer', 'cash', 'check', 'digital_wallet'),
        defaultValue: 'bank_transfer',
      },
      utr_reference: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      repaid_by_farmer: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      recorded_by_agent: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable('loan_repayments');
  },
};
