'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('loan_providers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      provider_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      provider_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'loan_provider_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      provider_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      provider_code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
      },
      primary_contact_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      primary_contact_phone: {
        type: Sequelize.STRING(13),
        allowNull: true,
      },
      primary_contact_email: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      headquarters_state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_rbi_regulated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      rbi_license_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      operates_in_states: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      service_radius_km: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      website_url: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      api_integration_status: {
        type: Sequelize.ENUM('none', 'api', 'csv_upload'),
        defaultValue: 'none',
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
    await queryInterface.dropTable('loan_providers');
  },
};
