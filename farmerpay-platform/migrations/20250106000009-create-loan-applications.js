'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loan_applications', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      application_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      loan_product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'loan_products',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      apply_for_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      apply_for_tenure_months: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      intended_use: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      existing_loan_balance: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      existing_loan_lender: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      application_status: {
        type: Sequelize.ENUM('draft', 'submitted', 'under_review', 'forwarded_to_bank', 'bank_review', 'approved', 'rejected', 'disbursed', 'active', 'closed', 'defaulted'),
        defaultValue: 'draft',
      },
      applied_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      application_verified_by_agent: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      application_verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejected_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      approval_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      approval_interest_rate: {
        type: Sequelize.DECIMAL(5, 3),
        allowNull: true,
      },
      approval_tenure_months: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      approved_by_bank_user: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      risk_score: {
        type: Sequelize.DECIMAL(5, 2),
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

    await queryInterface.addIndex('loan_applications', ['farmer_id', 'application_status'], {
      name: 'loan_applications_farmer_id_application_status_index',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('loan_applications');
  },
};
