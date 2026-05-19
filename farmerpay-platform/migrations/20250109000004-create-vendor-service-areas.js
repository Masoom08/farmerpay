'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vendor_service_areas', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'vendor_profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      lgd_state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      lgd_district_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      lgd_block_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      lgd_village_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      service_radius_km: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      service_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_primary_service_area: {
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
    await queryInterface.dropTable('vendor_service_areas');
  },
};
