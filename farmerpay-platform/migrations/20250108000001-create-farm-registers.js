'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farm_registers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      register_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      register_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      total_hectares_owned: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      total_hectares_cultivable: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      total_hectares_cultivated: {
        type: Sequelize.DECIMAL(10, 4),
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
    await queryInterface.dropTable('farm_registers');
  }
};
