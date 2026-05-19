'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loan_products', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      product_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      provider_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'loan_providers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'loan_categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      subcategory_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'loan_subcategories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      product_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      product_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      min_loan_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      max_loan_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      min_interest_rate: {
        type: Sequelize.DECIMAL(5, 3),
        allowNull: true,
      },
      max_interest_rate: {
        type: Sequelize.DECIMAL(5, 3),
        allowNull: true,
      },
      processing_fee_percent: {
        type: Sequelize.DECIMAL(5, 3),
        allowNull: true,
      },
      is_floating_rate: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      tenure_months_min: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      tenure_months_max: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      repayment_frequency: {
        type: Sequelize.ENUM('weekly', 'monthly', 'quarterly', 'seasonal', 'custom'),
        defaultValue: 'monthly',
      },
      moratorium_period_months: {
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

    await queryInterface.addIndex('loan_products', ['provider_id'], {
      name: 'loan_products_provider_id_index',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('loan_products');
  },
};
