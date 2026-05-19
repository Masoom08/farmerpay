'use strict';

/**
 * Per-subtype Package of Practices (PoP).
 *
 * Before: one PoP template + one progress timeline per activity_code. Rice,
 * wheat, sugarcane, pulses, oilseeds all shared a single CROP score, which
 * wasn't right — each crop has its own practices and deserves its own score.
 *
 * After: subtype_code is first-class on all three PoP tables.
 *   - Templates (stages, touchpoints): subtype_code='' is the "baseline"
 *     that applies to any subtype without a dedicated template. Rice-specific
 *     templates can be added later with subtype_code='rice' and the service
 *     will prefer them over the baseline.
 *   - Farmer progress: subtype_code is part of the unique key, so rice and
 *     sugarcane track independently even when they share a baseline template.
 *
 * NOT NULL DEFAULT '' is used everywhere (instead of nullable) so the unique
 * constraints behave predictably — MySQL treats NULL as distinct, which
 * breaks findOrCreate idempotency for the baseline rows.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ─── activity_pop_stages ────────────────────────────────────────
    await queryInterface.addColumn('activity_pop_stages', 'subtype_code', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: '',
      comment: "'' = baseline (applies to any subtype without its own template)",
    });
    await queryInterface.removeConstraint(
      'activity_pop_stages',
      'uniq_pop_stages_activity_key'
    );
    await queryInterface.addConstraint('activity_pop_stages', {
      fields: ['activity_code', 'subtype_code', 'stage_key'],
      type: 'unique',
      name: 'uniq_pop_stages_activity_subtype_key',
    });

    // ─── activity_pop_touchpoints ───────────────────────────────────
    await queryInterface.addColumn('activity_pop_touchpoints', 'subtype_code', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: '',
      comment: "'' = baseline (applies to any subtype without its own template)",
    });
    await queryInterface.removeConstraint(
      'activity_pop_touchpoints',
      'uniq_pop_touchpoints_activity_number'
    );
    await queryInterface.addConstraint('activity_pop_touchpoints', {
      fields: ['activity_code', 'subtype_code', 'touchpoint_number'],
      type: 'unique',
      name: 'uniq_pop_touchpoints_activity_subtype_number',
    });

    // ─── farmer_pop_touchpoint_progress ─────────────────────────────
    await queryInterface.addColumn('farmer_pop_touchpoint_progress', 'subtype_code', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: '',
      comment: "'' = activity-level progress (for activities without subtypes like DAIRY)",
    });
    await queryInterface.removeConstraint(
      'farmer_pop_touchpoint_progress',
      'uniq_pop_progress_farmer_activity_tp'
    );
    await queryInterface.addConstraint('farmer_pop_touchpoint_progress', {
      fields: ['farmer_id', 'activity_code', 'subtype_code', 'touchpoint_number'],
      type: 'unique',
      name: 'uniq_pop_progress_farmer_activity_subtype_tp',
    });
    await queryInterface.addIndex(
      'farmer_pop_touchpoint_progress',
      ['farmer_id', 'activity_code', 'subtype_code'],
      { name: 'idx_pop_progress_farmer_activity_subtype' }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      'farmer_pop_touchpoint_progress',
      'idx_pop_progress_farmer_activity_subtype'
    );
    await queryInterface.removeConstraint(
      'farmer_pop_touchpoint_progress',
      'uniq_pop_progress_farmer_activity_subtype_tp'
    );
    await queryInterface.addConstraint('farmer_pop_touchpoint_progress', {
      fields: ['farmer_id', 'activity_code', 'touchpoint_number'],
      type: 'unique',
      name: 'uniq_pop_progress_farmer_activity_tp',
    });
    await queryInterface.removeColumn('farmer_pop_touchpoint_progress', 'subtype_code');

    await queryInterface.removeConstraint(
      'activity_pop_touchpoints',
      'uniq_pop_touchpoints_activity_subtype_number'
    );
    await queryInterface.addConstraint('activity_pop_touchpoints', {
      fields: ['activity_code', 'touchpoint_number'],
      type: 'unique',
      name: 'uniq_pop_touchpoints_activity_number',
    });
    await queryInterface.removeColumn('activity_pop_touchpoints', 'subtype_code');

    await queryInterface.removeConstraint(
      'activity_pop_stages',
      'uniq_pop_stages_activity_subtype_key'
    );
    await queryInterface.addConstraint('activity_pop_stages', {
      fields: ['activity_code', 'stage_key'],
      type: 'unique',
      name: 'uniq_pop_stages_activity_key',
    });
    await queryInterface.removeColumn('activity_pop_stages', 'subtype_code');
  },
};
