'use strict';

/**
 * SATHI DataMon Alignment Migration
 * 1 new table + 2 ALTER TABLE changes for data monetisation verification layer.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── ALTER: sathi_evidence_items — add evidence_purpose ─────
    await queryInterface.addColumn('sathi_evidence_items', 'evidence_purpose', {
      type: Sequelize.ENUM(
        'crop_proof', 'input_proof', 'land_proof', 'livestock_proof',
        'harvest_proof', 'pond_proof', 'infrastructure_proof', 'general'
      ),
      allowNull: true,
      defaultValue: 'general',
      after: 'signature_url',
    });

    // ─── ALTER: sathi_field_verifications — add confidence + contradiction ─
    await queryInterface.addColumn('sathi_field_verifications', 'verification_confidence_pct', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      after: 'photo_count',
    });
    await queryInterface.addColumn('sathi_field_verifications', 'contradiction_detected', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: 'verification_confidence_pct',
    });
    await queryInterface.addColumn('sathi_field_verifications', 'contradiction_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'contradiction_detected',
    });

    // ─── CREATE: sathi_structured_visit_reports ─────────────────
    await queryInterface.createTable('sathi_structured_visit_reports', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      report_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      verification_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'sathi_field_verifications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      crp_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'field_agent_profiles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },

      // Location
      visit_gps_latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: false },
      visit_gps_longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: false },
      visit_timestamp: { type: Sequelize.DATE, allowNull: false },

      // Crop verification
      crop_observed: { type: Sequelize.BOOLEAN, defaultValue: false },
      crop_type_observed: { type: Sequelize.STRING(50), allowNull: true },
      crop_matches_declared: { type: Sequelize.BOOLEAN, allowNull: true },
      estimated_area_acres: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
      crop_health_rating: {
        type: Sequelize.ENUM('good', 'average', 'poor', 'failed'), allowNull: true,
      },
      growth_stage_observed: { type: Sequelize.STRING(50), allowNull: true },

      // Input verification
      input_bags_seen: { type: Sequelize.BOOLEAN, defaultValue: false },
      input_types_observed: { type: Sequelize.JSON, allowNull: true },
      input_matches_vyapar: { type: Sequelize.BOOLEAN, allowNull: true },

      // Livestock verification
      livestock_count_observed: { type: Sequelize.INTEGER, allowNull: true },
      livestock_health_observed: {
        type: Sequelize.ENUM('healthy', 'sick', 'mixed'), allowNull: true,
      },
      milking_observed: { type: Sequelize.BOOLEAN, allowNull: true },

      // Fishery verification
      pond_water_level: {
        type: Sequelize.ENUM('full', 'adequate', 'low', 'dry'), allowNull: true,
      },
      fish_activity_observed: { type: Sequelize.BOOLEAN, allowNull: true },

      // Infrastructure
      irrigation_type_observed: { type: Sequelize.STRING(50), allowNull: true },
      polyhouse_present: { type: Sequelize.BOOLEAN, allowNull: true },

      // Cross-verification
      verification_status: {
        type: Sequelize.ENUM('confirmed', 'contradicted', 'inconclusive', 'partial'),
        allowNull: false, defaultValue: 'inconclusive',
      },
      contradiction_notes: { type: Sequelize.TEXT, allowNull: true },
      verification_confidence_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },

      // Evidence counts
      photos_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      voice_notes_count: { type: Sequelize.INTEGER, defaultValue: 0 },

      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('sathi_structured_visit_reports', ['farmer_id']);
    await queryInterface.addIndex('sathi_structured_visit_reports', ['crp_id']);
    await queryInterface.addIndex('sathi_structured_visit_reports', ['visit_timestamp']);
    await queryInterface.addIndex('sathi_structured_visit_reports', ['verification_status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sathi_structured_visit_reports');
    await queryInterface.removeColumn('sathi_field_verifications', 'contradiction_notes');
    await queryInterface.removeColumn('sathi_field_verifications', 'contradiction_detected');
    await queryInterface.removeColumn('sathi_field_verifications', 'verification_confidence_pct');
    await queryInterface.removeColumn('sathi_evidence_items', 'evidence_purpose');
  },
};
