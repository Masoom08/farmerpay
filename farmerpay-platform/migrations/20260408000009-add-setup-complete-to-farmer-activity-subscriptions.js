'use strict';

/**
 * Persona Phase A — adds setup_complete to farmer_activity_subscriptions.
 *
 * Each activity subscription becomes "locked" once the farmer has finished
 * the first-time setup form for it (e.g. aggregate herd entry for dairy,
 * first cycle creation for crop). Future MPIN logins skip the onboarding
 * + setup wizards entirely and route directly to the persona home — this
 * is the engagement-loop unlock.
 *
 * Default false. No backfill — legacy farmers naturally show as un-setup
 * once and complete the form once. The activity-card UI on the new home
 * renders three states based on this column: UNSET / LOCKED / EDITING.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Guard: table may not exist yet on fresh installs — the CREATE TABLE
    // migration (20260409000001) has a later timestamp and will include these
    // columns directly. Skip here; the columns are present after that migration runs.
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('farmer_activity_subscriptions')) return;

    const desc = await queryInterface.describeTable('farmer_activity_subscriptions');
    if (!desc.setup_complete) {
      await queryInterface.addColumn('farmer_activity_subscriptions', 'setup_complete', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!desc.setup_completed_at) {
      await queryInterface.addColumn('farmer_activity_subscriptions', 'setup_completed_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    const indexes = await queryInterface.showIndex('farmer_activity_subscriptions');
    if (!indexes.find((i) => i.name === 'idx_fas_setup_complete')) {
      await queryInterface.addIndex('farmer_activity_subscriptions', {
        name: 'idx_fas_setup_complete',
        fields: ['farmer_id', 'setup_complete'],
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('farmer_activity_subscriptions')) return;
    await queryInterface.removeIndex('farmer_activity_subscriptions', 'idx_fas_setup_complete');
    await queryInterface.removeColumn('farmer_activity_subscriptions', 'setup_completed_at');
    await queryInterface.removeColumn('farmer_activity_subscriptions', 'setup_complete');
  },
};
