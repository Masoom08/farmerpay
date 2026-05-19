'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kyc_verification_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      kyc_document_type: {
        type: Sequelize.ENUM('aadhaar', 'pan', 'drivers_license', 'voter_id', 'land_document'),
        allowNull: true,
      },
      document_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      document_image_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      verified_by_admin: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      verification_status: {
        type: Sequelize.ENUM('pending', 'verified', 'rejected', 'expired'),
        defaultValue: 'pending',
      },
      rejection_reason: {
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

    await queryInterface.addIndex('kyc_verification_logs', ['farmer_id', 'kyc_document_type']);
    await queryInterface.addIndex('kyc_verification_logs', ['verification_status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('kyc_verification_logs');
  },
};
