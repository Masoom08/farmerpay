'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('harvest_sale_records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      record_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false
      },
      harvest_record_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'harvest_records',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sale_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      quantity_sold_kg: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      price_per_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      gross_sale_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      transportation_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      market_fees_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      net_sale_value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      buyer_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      buyer_type: {
        type: Sequelize.ENUM('local_trader', 'mandi', 'fpo', 'company', 'broker'),
        allowNull: true
      },
      sale_contract_linked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.dropTable('harvest_sale_records');
  }
};
