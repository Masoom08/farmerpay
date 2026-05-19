'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_sessions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      session_token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      refresh_token: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      device_info: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      device_uuid: {
        type: Sequelize.STRING(36),
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      refreshed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      logged_out_at: {
        type: Sequelize.DATE,
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('user_sessions', ['user_id', 'expires_at'], { name: 'idx_session_user_expiry' });
    await queryInterface.addIndex('user_sessions', ['refresh_token'], { name: 'idx_session_refresh' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_sessions');
  },
};
