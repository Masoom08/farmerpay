'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cultivation_cycles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      cycle_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
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
      crop_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      variety_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      pop_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      cycle_season: {
        type: Sequelize.ENUM('kharif', 'rabi', 'summer'),
        allowNull: true
      },
      cycle_year: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      cycle_sowing_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      cycle_expected_harvest_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      cycle_actual_harvest_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      cycle_status: {
        type: Sequelize.ENUM('planning', 'preparation', 'sowing', 'growing', 'monitoring', 'harvesting', 'post_harvest', 'closed'),
        defaultValue: 'planning'
      },
      linked_loan_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      linked_trust_score: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable('cultivation_cycles');
  }
};
