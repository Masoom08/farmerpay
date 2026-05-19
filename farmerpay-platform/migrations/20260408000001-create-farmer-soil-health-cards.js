'use strict';

/**
 * farmer_soil_health_cards
 *
 * One active SHC per farmer (FarmerPay-owned, distinct from the
 * field-bound SoilHealthRecord). Captured during onboarding right after
 * activity selection. Photo + GPS + structured chemistry fields.
 *
 * Also adds `shc_status` to farmer_profiles so the SAGE feed can branch
 * on captured | skipped | null.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_soil_health_cards', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      photo_url: { type: Sequelize.STRING(512), allowNull: true },
      photo_captured_at: { type: Sequelize.DATE, allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      location_accuracy_m: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      soil_type: {
        type: Sequelize.ENUM(
          'alluvial', 'black', 'red', 'laterite',
          'arid', 'mountain', 'saline', 'peaty', 'other'
        ),
        allowNull: true,
      },
      ph: { type: Sequelize.DECIMAL(4, 2), allowNull: true },
      ec: { type: Sequelize.DECIMAL(6, 3), allowNull: true },
      organic_carbon: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      nitrogen_n: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      phosphorus_p: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      potassium_k: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      sulphur_s: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      zinc_zn: { type: Sequelize.DECIMAL(6, 3), allowNull: true },
      boron_b: { type: Sequelize.DECIMAL(6, 3), allowNull: true },
      iron_fe: { type: Sequelize.DECIMAL(6, 3), allowNull: true },
      manganese_mn: { type: Sequelize.DECIMAL(6, 3), allowNull: true },
      copper_cu: { type: Sequelize.DECIMAL(6, 3), allowNull: true },
      source: {
        type: Sequelize.ENUM('photo_only', 'manual_entry', 'photo_plus_manual'),
        allowNull: false,
        defaultValue: 'manual_entry',
      },
      card_issue_date: { type: Sequelize.DATEONLY, allowNull: true },
      card_reference_no: { type: Sequelize.STRING(64), allowNull: true },
      raw_ocr_text: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('farmer_soil_health_cards', {
      name: 'idx_fshc_farmer',
      fields: ['farmer_id'],
    });
    await queryInterface.addIndex('farmer_soil_health_cards', {
      name: 'idx_fshc_latlon',
      fields: ['latitude', 'longitude'],
    });

    // shc_status on farmer_profiles
    await queryInterface.addColumn('farmer_profiles', 'shc_status', {
      type: Sequelize.ENUM('captured', 'skipped'),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('farmer_profiles', 'shc_status');
    // Drop the ENUM type for Postgres compatibility (no-op on MySQL)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_farmer_profiles_shc_status";');
    }
    await queryInterface.dropTable('farmer_soil_health_cards');
  },
};
