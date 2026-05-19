'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('package_of_practices', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pop_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      crop_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
      },
      variety_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
      },
      soil_type_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      climate_zone_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      pop_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      pop_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      recommended_by_org_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'organizations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      is_certified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.dropTable('package_of_practices');
  },
};
