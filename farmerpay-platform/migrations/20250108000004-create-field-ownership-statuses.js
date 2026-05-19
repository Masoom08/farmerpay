'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('field_ownership_statuses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      field_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fields',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ownership_type: {
        type: Sequelize.ENUM('owned', 'leased', 'shared'),
        allowNull: false
      },
      owner_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      ownership_document_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      document_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      verified_by_agent: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      lease_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      lease_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      annual_lease_rent: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('field_ownership_statuses');
  }
};
