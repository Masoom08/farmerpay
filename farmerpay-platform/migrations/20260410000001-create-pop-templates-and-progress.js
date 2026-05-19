'use strict';

/**
 * Package of Practices (PoP) — data-driven templates + per-farmer progress.
 *
 * Motivation: the ROOTS Farm tab previously hardcoded STAGES and TOUCHPOINTS
 * as JS arrays inside farm.tsx. As we extend to Dairy/Fishery/Horti/Poultry/
 * Goatery, the per-activity data needs to live in the database so the UI can
 * stay generic and non-agri teams can edit templates without code changes.
 *
 * Three tables:
 *   activity_pop_stages            — timeline stage definitions per activity
 *   activity_pop_touchpoints       — scoring touchpoints per activity
 *   farmer_pop_touchpoint_progress — per-farmer status/score per touchpoint
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ─── activity_pop_stages ────────────────────────────────────────
    await queryInterface.createTable('activity_pop_stages', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      activity_code: {
        type: Sequelize.ENUM(
          'CROP', 'DAIRY', 'FISHERY', 'HORTI',
          'POULTRY', 'GOATERY', 'LABOUR_WAGE',
          'SHOP_BUSINESS', 'REMITTANCE', 'OTHER'
        ),
        allowNull: false,
      },
      stage_key: {
        type: Sequelize.STRING(64),
        allowNull: false,
        comment: 'Stable slug (preparation, sowing, …) used as FK from touchpoints',
      },
      stage_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      label_en: { type: Sequelize.STRING(120), allowNull: false },
      label_hi: { type: Sequelize.STRING(120), allowNull: true },
      icon: {
        type: Sequelize.STRING(16),
        allowNull: true,
        comment: 'Emoji or short icon string rendered in the timeline',
      },
      description_en: { type: Sequelize.TEXT, allowNull: true },
      description_hi: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('activity_pop_stages', ['activity_code', 'stage_order'], {
      name: 'idx_pop_stages_activity_order',
    });
    await queryInterface.addConstraint('activity_pop_stages', {
      fields: ['activity_code', 'stage_key'],
      type: 'unique',
      name: 'uniq_pop_stages_activity_key',
    });

    // ─── activity_pop_touchpoints ───────────────────────────────────
    await queryInterface.createTable('activity_pop_touchpoints', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      activity_code: {
        type: Sequelize.ENUM(
          'CROP', 'DAIRY', 'FISHERY', 'HORTI',
          'POULTRY', 'GOATERY', 'LABOUR_WAGE',
          'SHOP_BUSINESS', 'REMITTANCE', 'OTHER'
        ),
        allowNull: false,
      },
      touchpoint_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Sequential 1..N within the activity',
      },
      stage_key: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'Which stage this touchpoint belongs to (nullable for standalone)',
      },
      name_en: { type: Sequelize.STRING(200), allowNull: false },
      name_hi: { type: Sequelize.STRING(200), allowNull: true },
      description_en: { type: Sequelize.TEXT, allowNull: true },
      description_hi: { type: Sequelize.TEXT, allowNull: true },
      scoring_criteria: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON describing what drives the score (task, timing, inputs)',
      },
      required_inputs: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON list of fields the farmer must record at this touchpoint',
      },
      expected_cost_inr: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        comment: 'DLTC/reference cost for budgeting against the touchpoint',
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('activity_pop_touchpoints', ['activity_code', 'touchpoint_number'], {
      name: 'idx_pop_touchpoints_activity_number',
    });
    await queryInterface.addConstraint('activity_pop_touchpoints', {
      fields: ['activity_code', 'touchpoint_number'],
      type: 'unique',
      name: 'uniq_pop_touchpoints_activity_number',
    });

    // ─── farmer_pop_touchpoint_progress ─────────────────────────────
    await queryInterface.createTable('farmer_pop_touchpoint_progress', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      farmer_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      activity_code: {
        type: Sequelize.ENUM(
          'CROP', 'DAIRY', 'FISHERY', 'HORTI',
          'POULTRY', 'GOATERY', 'LABOUR_WAGE',
          'SHOP_BUSINESS', 'REMITTANCE', 'OTHER'
        ),
        allowNull: false,
      },
      touchpoint_number: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM('PENDING', 'CURRENT', 'DONE', 'SKIPPED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '0-100, null until status=DONE',
      },
      task_completed: { type: Sequelize.BOOLEAN, allowNull: true },
      timing_status: {
        type: Sequelize.ENUM('ON_TIME', 'DELAYED', 'EARLY'),
        allowNull: true,
      },
      inputs_status: {
        type: Sequelize.ENUM('AS_PER_POP', 'DEVIATION', 'NOT_RECORDED'),
        allowNull: true,
      },
      actual_cost_inr: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      data_entered: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Snapshot of the raw inputs the farmer submitted',
      },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('farmer_pop_touchpoint_progress', ['farmer_id', 'activity_code'], {
      name: 'idx_pop_progress_farmer_activity',
    });
    await queryInterface.addIndex('farmer_pop_touchpoint_progress', ['farmer_id', 'activity_code', 'status'], {
      name: 'idx_pop_progress_farmer_activity_status',
    });
    await queryInterface.addConstraint('farmer_pop_touchpoint_progress', {
      fields: ['farmer_id', 'activity_code', 'touchpoint_number'],
      type: 'unique',
      name: 'uniq_pop_progress_farmer_activity_tp',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('farmer_pop_touchpoint_progress');
    await queryInterface.dropTable('activity_pop_touchpoints');
    await queryInterface.dropTable('activity_pop_stages');
  },
};
