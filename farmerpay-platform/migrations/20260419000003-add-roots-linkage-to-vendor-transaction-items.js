'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('vendor_transaction_items', 'roots_link_status', {
      type: Sequelize.ENUM('auto_linked', 'manual_linked', 'pending', 'unlinked'),
      allowNull: true, defaultValue: null,
    });
    await queryInterface.addColumn('vendor_transaction_items', 'roots_cycle_id', {
      type: Sequelize.INTEGER, allowNull: true, comment: 'FK to cultivation_cycles.id',
    });
    await queryInterface.addColumn('vendor_transaction_items', 'roots_task_execution_id', {
      type: Sequelize.INTEGER, allowNull: true, comment: 'FK to task_executions.id if auto-mapped to a stage',
    });
    await queryInterface.addColumn('vendor_transaction_items', 'roots_activity_type', {
      type: Sequelize.STRING(20), allowNull: true, comment: 'CROP, DAIRY, FISHERY, etc.',
    });
    await queryInterface.addColumn('vendor_transaction_items', 'roots_linked_at', {
      type: Sequelize.DATE, allowNull: true,
    });
    await queryInterface.addColumn('vendor_transaction_items', 'roots_unlink_reason', {
      type: Sequelize.STRING(200), allowNull: true,
    });
    await queryInterface.addIndex('vendor_transaction_items', ['roots_link_status'], { name: 'idx_vti_roots_link_status' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('vendor_transaction_items', 'idx_vti_roots_link_status');
    await queryInterface.removeColumn('vendor_transaction_items', 'roots_unlink_reason');
    await queryInterface.removeColumn('vendor_transaction_items', 'roots_linked_at');
    await queryInterface.removeColumn('vendor_transaction_items', 'roots_activity_type');
    await queryInterface.removeColumn('vendor_transaction_items', 'roots_task_execution_id');
    await queryInterface.removeColumn('vendor_transaction_items', 'roots_cycle_id');
    await queryInterface.removeColumn('vendor_transaction_items', 'roots_link_status');
  },
};
