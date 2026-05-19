'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications_v2', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      notification_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      recipient_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      template_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'notification_templates',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      notification_type: {
        type: Sequelize.ENUM('alert', 'info', 'warning', 'success', 'reminder'),
        defaultValue: 'info',
      },
      channels_used: {
        type: Sequelize.STRING(50),
        defaultValue: 'in_app',
      },
      template_variables: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      delivery_status: {
        type: Sequelize.ENUM('pending', 'sent', 'failed', 'bounced'),
        defaultValue: 'pending',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      request_id: {
        type: Sequelize.STRING(36),
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

    await queryInterface.addIndex('notifications_v2', ['recipient_user_id', 'created_at'], {
      name: 'idx_notifications_v2_recipient_created',
    });

    await queryInterface.addIndex('notifications_v2', ['delivery_status', 'sent_at'], {
      name: 'idx_notifications_v2_status_sent',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications_v2');
  },
};
