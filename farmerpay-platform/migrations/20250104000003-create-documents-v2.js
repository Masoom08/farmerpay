'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('documents_v2', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      document_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      owner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      document_type: {
        type: Sequelize.ENUM('kyc', 'loan_application', 'land_proof', 'bank_statement', 'other_evidence', 'receipt', 'agreement'),
        allowNull: false,
      },
      document_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      file_extension: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      file_size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      mime_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      s3_key: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      s3_bucket: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      uploaded_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_encrypted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      encryption_key_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      visibility: {
        type: Sequelize.ENUM('private', 'shared', 'public'),
        defaultValue: 'private',
      },
      expiry_date: {
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('documents_v2', ['owner_id', 'created_at'], {
      name: 'idx_documents_v2_owner_created',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('documents_v2');
  },
};
