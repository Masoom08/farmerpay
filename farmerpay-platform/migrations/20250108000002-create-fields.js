'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fields', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      field_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false
      },
      farm_register_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'farm_registers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      field_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      field_code: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      field_size_hectares: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      lgd_village_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
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
    await queryInterface.dropTable('fields');
  }
};
