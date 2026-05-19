'use strict';

/**
 * Extend CHOICE intermediary with Sathi sub-types and service/commission fields.
 *
 * Adds: insurance_sakhi, pacs_secretary, business_correspondent to the type ENUM
 * (keeps legacy values), plus columns for services_offered, commission bank ref,
 * and onboarding KYC state.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Extend ENUM — MySQL keeps this as a plain ALTER COLUMN.
    await queryInterface.changeColumn('intermediaries', 'type', {
      type: Sequelize.ENUM(
        // legacy
        'bc', 'fpo_agent', 'agri_entrepreneur', 'bank_mitra',
        'bank_sakhi', 'fpo_secretary', 'input_seller', 'adathiya',
        // new Sathi sub-types
        'business_correspondent', 'insurance_sakhi', 'pacs_secretary'
      ),
      allowNull: false,
    });

    await queryInterface.addColumn('intermediaries', 'services_offered', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Array of services: ["loan","insurance","data_entry","nudges"]',
    });
    await queryInterface.addColumn('intermediaries', 'onboarding_kyc_status', {
      type: Sequelize.ENUM('pending', 'in_progress', 'verified', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    });
    await queryInterface.addColumn('intermediaries', 'commission_bank_account_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'FK to farmer_bank_accounts (reuses existing account storage)',
    });
    await queryInterface.addColumn('intermediaries', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Link to the users row used for Sathi login (JWT subject)',
    });

    await queryInterface.addIndex('intermediaries', ['user_id'], {
      name: 'idx_intermediaries_user_id',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('intermediaries', 'idx_intermediaries_user_id');
    await queryInterface.removeColumn('intermediaries', 'user_id');
    await queryInterface.removeColumn('intermediaries', 'commission_bank_account_id');
    await queryInterface.removeColumn('intermediaries', 'onboarding_kyc_status');
    await queryInterface.removeColumn('intermediaries', 'services_offered');
    await queryInterface.changeColumn('intermediaries', 'type', {
      type: Sequelize.ENUM(
        'bc', 'fpo_agent', 'agri_entrepreneur', 'bank_mitra',
        'bank_sakhi', 'fpo_secretary', 'input_seller', 'adathiya'
      ),
      allowNull: false,
    });
  },
};
