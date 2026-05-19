'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('livestock_integration_records', {
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
      livestock_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      livestock_count: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      manure_produced_tons: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      manure_used_in_field: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      manure_value: {
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
    await queryInterface.dropTable('livestock_integration_records');
  }
};
