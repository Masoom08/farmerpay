'use strict';

/**
 * farmer_activity_subtypes
 *
 * Per-farmer sub-type selections for the 4 activities that need them
 * (CROP, HORTI, POULTRY, GOATERY). DAIRY and FISHERY are intentionally
 * excluded from the ENUM — their sub-dimension lives in their own
 * profile tables (FarmerDairyProfile.herd_tier, FarmerFisheryProfile
 * .operation_type) and we don't want dual sources of truth.
 *
 * Multi-row per (farmer, activity_code): one row per selected sub-type.
 * Unselect is a soft-delete (is_active=false) so TRUST and DICE can
 * still see the history of dropped sub-types.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_activity_subtypes', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      activity_code: {
        type: Sequelize.ENUM('CROP', 'HORTI', 'POULTRY', 'GOATERY'),
        allowNull: false,
      },
      subtype_code: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('farmer_activity_subtypes', {
      name: 'uniq_farmer_activity_subtype',
      unique: true,
      fields: ['farmer_id', 'activity_code', 'subtype_code'],
    });
    await queryInterface.addIndex('farmer_activity_subtypes', {
      name: 'idx_farmer_activity_active',
      fields: ['farmer_id', 'activity_code', 'is_active'],
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('farmer_activity_subtypes');
  },
};
