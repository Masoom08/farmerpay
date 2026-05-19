'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('field_agent_farmer_assignments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      field_agent_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'field_agent_profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      lgd_village_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      assigned_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      assigned_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      unassigned_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      unassigned_by: {
        type: Sequelize.INTEGER,
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

    await queryInterface.addIndex('field_agent_farmer_assignments', ['field_agent_profile_id', 'is_active']);
    await queryInterface.addIndex('field_agent_farmer_assignments', ['farmer_id', 'is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('field_agent_farmer_assignments');
  },
};
