'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('document_access_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      document_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'documents_v2',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      accessed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      access_type: {
        type: Sequelize.ENUM('view', 'download', 'print', 'export'),
        allowNull: false,
      },
      accessed_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      device_info: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('document_access_logs', ['document_id', 'accessed_at'], {
      name: 'idx_document_access_logs_doc_accessed',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('document_access_logs');
  },
};
