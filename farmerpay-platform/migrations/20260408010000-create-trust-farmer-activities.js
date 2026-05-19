'use strict';

/**
 * Migration: Create trust_farmer_activities.
 *
 * Captures which livelihood activities a farmer participates in (CROP, DAIRY,
 * FISHERY, HORTI, LABOUR, OFF_FARM, AGRI_BIZ). One row per (farmer, activity).
 * `is_primary` marks the dominant activity. This is the foundation for the
 * "multi-source income moat" — TRUST surfaces the right sub-modules to a
 * farmer based on which activities they engage in.
 *
 * Lives in the trust module under "one name, one number" — there is no
 * separate livelihood concept; profile completeness directly raises the
 * farmer's TRUST score.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_farmer_activities', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      activity_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      activity_type: {
        type: Sequelize.ENUM('CROP', 'DAIRY', 'FISHERY', 'HORTI', 'LABOUR', 'OFF_FARM', 'AGRI_BIZ'),
        allowNull: false,
      },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      started_year: { type: Sequelize.INTEGER, allowNull: true },
      source: {
        type: Sequelize.ENUM('FARMER_DECLARED', 'BACKFILL', 'AGENT_VERIFIED'),
        allowNull: false,
        defaultValue: 'FARMER_DECLARED',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('trust_farmer_activities', ['farmer_id', 'is_active'], {
      name: 'idx_tfa_farmer_active',
    });
    await queryInterface.addConstraint('trust_farmer_activities', {
      fields: ['farmer_id', 'activity_type'],
      type: 'unique',
      name: 'uniq_tfa_farmer_activity',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trust_farmer_activities');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_farmer_activities_activity_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_farmer_activities_source";');
  },
};
