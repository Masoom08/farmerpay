'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_profiles', {
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
      profile_uuid: {
        type: Sequelize.STRING(36),
        allowNull: true,
        unique: true,
      },
      full_name: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      aadhaar_number: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      aadhaar_encrypted_by_kms: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      aadhaar_audit_logged: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      aadhaar_last_verified: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other'),
        allowNull: true,
      },
      father_name: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      mother_name: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      education_level: {
        type: Sequelize.ENUM('illiterate', 'primary', 'secondary', 'higher_secondary', 'graduate', 'post_graduate'),
        allowNull: true,
      },
      marital_status: {
        type: Sequelize.ENUM('single', 'married', 'divorced', 'widowed', 'prefer_not_to_say'),
        allowNull: true,
      },
      bank_account_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      gst_registered: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      gst_number: {
        type: Sequelize.STRING(15),
        allowNull: true,
      },
      fpo_member: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      fpo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_govt_land_owner: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      land_ownership_type: {
        type: Sequelize.ENUM('owned', 'leased', 'shared', 'govt_allotted'),
        allowNull: true,
      },
      total_farm_size_hectares: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true,
      },
      primary_crop: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      secondary_crops: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      years_farming_experience: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      onboarding_status: {
        type: Sequelize.ENUM('not_started', 'step1_personal', 'step2_contact', 'step3_location', 'step4_bank', 'completed'),
        defaultValue: 'not_started',
      },
      onboarding_completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      profile_completeness_percentage: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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

    await queryInterface.addIndex('farmer_profiles', ['farmer_id']);
    await queryInterface.addIndex('farmer_profiles', ['profile_uuid']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('farmer_profiles');
  },
};
