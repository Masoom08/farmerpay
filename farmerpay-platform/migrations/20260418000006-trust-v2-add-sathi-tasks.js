'use strict';

/**
 * TRUST v2 — CREATE trust_sathi_tasks.
 * G-series task queue for field agents (Sathis).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_sathi_tasks', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      task_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      sathi_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
        comment: 'Nullable until assigned to a field agent',
      },
      task_type: {
        type: Sequelize.ENUM('COLLECT_HOUSEHOLD', 'VERIFY_LAND', 'UPLOAD_INSURANCE', 'PHOTO_GEOTAG', 'FARMER_REQUESTED'),
        allowNull: false,
      },
      reason_code: {
        type: Sequelize.ENUM('HOUSEHOLD_REFRESH', 'LAND_EXPIRES', 'INSURANCE_MISSING', 'PHOTO_GEOTAG_NEEDED', 'FARMER_REQUESTED'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'),
        defaultValue: 'OPEN',
      },
      due_by: { type: Sequelize.DATEONLY, allowNull: true },
      village: { type: Sequelize.STRING(128), allowNull: true },
      crop: { type: Sequelize.STRING(64), allowNull: true },
      payload: { type: Sequelize.JSON, allowNull: true, comment: 'Collected answers / photo refs on submit' },
      requested_by: {
        type: Sequelize.ENUM('BANKER', 'FARMER', 'SYSTEM'),
        defaultValue: 'BANKER',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('trust_sathi_tasks', ['sathi_id', 'status', 'due_by'], { name: 'idx_trust_sathi_tasks_agent' });
    await queryInterface.addIndex('trust_sathi_tasks', ['farmer_id', 'status'], { name: 'idx_trust_sathi_tasks_farmer' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trust_sathi_tasks');
  },
};
