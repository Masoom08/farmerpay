'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create intermediaries table
    await queryInterface.createTable('intermediaries', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      intermediary_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      mobile: {
        type: Sequelize.STRING(13),
        allowNull: false,
        unique: true,
      },
      type: {
        type: Sequelize.ENUM('bc', 'fpo_agent', 'agri_entrepreneur', 'bank_mitra'),
        allowNull: false,
      },
      district_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      skills: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      commission_rate_percent: {
        type: Sequelize.DECIMAL(5, 2),
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

    await queryInterface.addIndex('intermediaries', ['type']);
    await queryInterface.addIndex('intermediaries', ['district_id']);

    // Create intermediary_assignments table
    await queryInterface.createTable('intermediary_assignments', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      assignment_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      intermediary_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'intermediaries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      assignment_status: {
        type: Sequelize.ENUM('active', 'completed', 'reassigned'),
        allowNull: false,
        defaultValue: 'active',
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

    await queryInterface.addIndex('intermediary_assignments', ['intermediary_id', 'farmer_id'], {
      unique: true,
      name: 'idx_intermediary_assignments_unique',
    });
    await queryInterface.addIndex('intermediary_assignments', ['farmer_id']);

    // Create field_visit_logs table
    await queryInterface.createTable('field_visit_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      visit_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },
      intermediary_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'intermediaries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      visit_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      visit_type: {
        type: Sequelize.ENUM('onboarding', 'monitoring', 'collection', 'advisory', 'verification'),
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      gps_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
      },
      gps_longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      photo_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      visit_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      farmer_signed_off: {
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

    await queryInterface.addIndex('field_visit_logs', ['intermediary_id']);
    await queryInterface.addIndex('field_visit_logs', ['farmer_id']);
    await queryInterface.addIndex('field_visit_logs', ['visit_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('field_visit_logs');
    await queryInterface.dropTable('intermediary_assignments');
    await queryInterface.dropTable('intermediaries');
  },
};
