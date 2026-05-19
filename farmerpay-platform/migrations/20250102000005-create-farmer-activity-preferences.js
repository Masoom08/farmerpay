'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_activity_preferences', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      farmer_id: {
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
      prefers_mobile_app: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      prefers_sms: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      prefers_call: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      prefers_email: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      notification_frequency: {
        type: Sequelize.ENUM('real_time', 'daily', 'weekly', 'monthly', 'never'),
        defaultValue: 'daily',
      },
      preferred_language: {
        type: Sequelize.STRING(10),
        defaultValue: 'en',
      },
      preferred_time_window_start: {
        type: Sequelize.STRING(5),
        allowNull: true,
      },
      preferred_time_window_end: {
        type: Sequelize.STRING(5),
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
    await queryInterface.dropTable('farmer_activity_preferences');
  },
};
