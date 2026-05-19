'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vendor_kyc', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'vendor_profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      kyc_status: {
        type: Sequelize.ENUM('pending', 'verified', 'rejected', 'expired'),
        defaultValue: 'pending',
      },
      kyc_verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      kyc_verified_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      shop_visited_by_agent: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      shop_visit_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      gst_certificate_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      bank_account_verified: {
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
    await queryInterface.dropTable('vendor_kyc');
  },
};
