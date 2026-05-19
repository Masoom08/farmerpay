'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notification_templates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      template_code: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      template_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      subject_line: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      body_template: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      supported_channels: {
        type: Sequelize.STRING(50),
        defaultValue: 'in_app',
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        defaultValue: 'normal',
      },
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
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
    await queryInterface.dropTable('notification_templates');
  },
};
