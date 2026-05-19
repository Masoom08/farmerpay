'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('field_agent_profiles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      agent_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      agent_code: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
      },
      field_agent_name: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      lgd_state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      lgd_district_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      lgd_block_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      service_radius_km: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      mobile: {
        type: Sequelize.STRING(13),
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
    await queryInterface.dropTable('field_agent_profiles');
  },
};
