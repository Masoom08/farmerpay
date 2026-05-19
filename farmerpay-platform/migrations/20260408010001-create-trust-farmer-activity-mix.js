'use strict';

/**
 * Migration: Create trust_farmer_activity_mix.
 *
 * Annual snapshot of how a farmer's household income is split across the
 * activities listed in trust_farmer_activities. share_percent is the household
 * income share (0-100). Optional rupee anchor lets farmers attach a number when
 * comfortable.
 *
 * Per (farmer, activity, year). Year-on-year diversification powers the
 * SENTINEL income-diversification signal already plugged into the TRUST
 * scoring engine.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trust_farmer_activity_mix', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      mix_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
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
      reference_year: { type: Sequelize.INTEGER, allowNull: false },
      share_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      estimated_annual_income_inr: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      confidence: {
        type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH'),
        allowNull: false,
        defaultValue: 'MEDIUM',
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('trust_farmer_activity_mix', ['farmer_id', 'reference_year'], {
      name: 'idx_tfam_farmer_year',
    });
    await queryInterface.addConstraint('trust_farmer_activity_mix', {
      fields: ['farmer_id', 'activity_type', 'reference_year'],
      type: 'unique',
      name: 'uniq_tfam_farmer_activity_year',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trust_farmer_activity_mix');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_farmer_activity_mix_activity_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trust_farmer_activity_mix_confidence";');
  },
};
