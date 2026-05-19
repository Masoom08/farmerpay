'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_bank_accounts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
      account_holder_name: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      bank_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      account_number: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      account_number_masked: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      ifsc_code: {
        type: Sequelize.STRING(11),
        allowNull: true,
      },
      account_type: {
        type: Sequelize.ENUM('savings', 'current', 'other'),
        defaultValue: 'savings',
      },
      is_primary_account: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      verification_method: {
        type: Sequelize.ENUM('micro_deposit', 'api', 'manual'),
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

    await queryInterface.addIndex('farmer_bank_accounts', ['farmer_id', 'is_primary_account']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('farmer_bank_accounts');
  },
};
