'use strict';

/**
 * Migration: Create farmer_activity_subscriptions.
 *
 * Canonical operational table for the multi-activity / multi-income farmer
 * model. One row per (farmer, activity_code). Drives:
 *   • ROOTS sub-module visibility (Crop / Dairy / Fishery / Horti / …)
 *   • DICE underwriting income mix
 *   • Home dashboard ordering (priority_rank)
 *   • Persona classification (single / double / triple / quad income)
 *
 * Lifecycle:
 *   ACTIVE  – farmer is currently engaged in this activity
 *   PAUSED  – temporarily inactive (off-season, animal sick, etc.)
 *   DROPPED – exited; row preserved for history (TRUST/DICE want this)
 *
 * NOTE: A separate `trust_farmer_activities` table already exists for the
 * TRUST scoring module's narrower view (CROP/DAIRY/FISHERY/HORTI/LABOUR/
 * OFF_FARM/AGRI_BIZ). This new table is the broader, lifecycle-aware
 * operational source-of-truth — TRUST will be migrated to read from it in
 * a follow-up.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_activity_subscriptions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },

      subscription_uuid: {
        type: Sequelize.STRING(36),
        allowNull: false,
        unique: true,
      },

      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      activity_code: {
        type: Sequelize.ENUM(
          'CROP',
          'DAIRY',
          'FISHERY',
          'HORTI',
          'POULTRY',
          'GOATERY',
          'LABOUR_WAGE',
          'SHOP_BUSINESS',
          'REMITTANCE',
          'OTHER'
        ),
        allowNull: false,
      },

      status: {
        type: Sequelize.ENUM('ACTIVE', 'PAUSED', 'DROPPED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },

      subscribed_at: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        // Default applied at model layer (DataTypes.NOW) — MySQL DATE
        // columns can't take CURRENT_DATE as a literal default.
      },

      auto_derived_tier: {
        type: Sequelize.ENUM('SMALL', 'MEDIUM', 'LARGE'),
        allowNull: true,
        comment: 'Derived from holding size / herd size / pond area / etc.',
      },

      last_health_status: {
        type: Sequelize.ENUM('GREEN', 'AMBER', 'RED', 'UNKNOWN'),
        allowNull: false,
        defaultValue: 'UNKNOWN',
        comment: 'Latest snapshot health (compliance / yield / cashflow)',
      },

      last_snapshot_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When last_health_status was last refreshed',
      },

      // ─── Recommended additions (lifecycle + ordering) ──────────────
      priority_rank: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 99,
        comment: '1 = primary income, 2 = secondary, …; drives Home order',
      },

      dropped_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Set when status moves to DROPPED',
      },

      dropped_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // ─── Setup completion (engagement-loop unlock) ─────────────────
      setup_complete: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      setup_completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // ─── Provenance ────────────────────────────────────────────────
      source: {
        type: Sequelize.ENUM('FARMER_DECLARED', 'AGENT_VERIFIED', 'BACKFILL', 'SYSTEM_INFERRED'),
        allowNull: false,
        defaultValue: 'FARMER_DECLARED',
      },

      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // ─── Indexes ─────────────────────────────────────────────────────
    await queryInterface.addIndex('farmer_activity_subscriptions', ['farmer_id', 'status'], {
      name: 'idx_fas_farmer_status',
    });

    await queryInterface.addIndex('farmer_activity_subscriptions', ['farmer_id', 'priority_rank'], {
      name: 'idx_fas_farmer_priority',
    });

    await queryInterface.addIndex('farmer_activity_subscriptions', ['farmer_id', 'setup_complete'], {
      name: 'idx_fas_setup_complete',
    });

    // One row per (farmer, activity_code) — status transitions in place.
    await queryInterface.addConstraint('farmer_activity_subscriptions', {
      fields: ['farmer_id', 'activity_code'],
      type: 'unique',
      name: 'uniq_fas_farmer_activity',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('farmer_activity_subscriptions');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_farmer_activity_subscriptions_activity_code";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_farmer_activity_subscriptions_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_farmer_activity_subscriptions_auto_derived_tier";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_farmer_activity_subscriptions_last_health_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_farmer_activity_subscriptions_source";'
    );
  },
};
