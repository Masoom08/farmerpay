/**
 * SathiStructuredVisitReport Model
 * Rich structured field visit form for DataMon verification.
 * Captures crop, input, livestock, fishery, and infrastructure observations
 * with cross-verification status and confidence scoring.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiStructuredVisitReport extends Model {
    static associate(models) {
      SathiStructuredVisitReport.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      SathiStructuredVisitReport.belongsTo(models.FieldAgentProfile, { foreignKey: 'crp_id', as: 'crp' });
      SathiStructuredVisitReport.belongsTo(models.SathiFieldVerification, {
        foreignKey: 'verification_id', as: 'verification',
      });
    }
  }

  SathiStructuredVisitReport.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      report_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      verification_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'sathi_field_verifications', key: 'id' },
      },
      crp_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'field_agent_profiles', key: 'id' },
      },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },

      // Location verification
      visit_gps_latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
      visit_gps_longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
      visit_timestamp: { type: DataTypes.DATE, allowNull: false },

      // Crop verification
      crop_observed: { type: DataTypes.BOOLEAN, defaultValue: false },
      crop_type_observed: { type: DataTypes.STRING(50), allowNull: true },
      crop_matches_declared: { type: DataTypes.BOOLEAN, allowNull: true },
      estimated_area_acres: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
      crop_health_rating: {
        type: DataTypes.ENUM('good', 'average', 'poor', 'failed'), allowNull: true,
      },
      growth_stage_observed: { type: DataTypes.STRING(50), allowNull: true },

      // Input verification
      input_bags_seen: { type: DataTypes.BOOLEAN, defaultValue: false },
      input_types_observed: { type: DataTypes.JSON, allowNull: true },
      input_matches_vyapar: { type: DataTypes.BOOLEAN, allowNull: true },

      // Livestock verification (dairy)
      livestock_count_observed: { type: DataTypes.INTEGER, allowNull: true },
      livestock_health_observed: {
        type: DataTypes.ENUM('healthy', 'sick', 'mixed'), allowNull: true,
      },
      milking_observed: { type: DataTypes.BOOLEAN, allowNull: true },

      // Fishery verification
      pond_water_level: {
        type: DataTypes.ENUM('full', 'adequate', 'low', 'dry'), allowNull: true,
      },
      fish_activity_observed: { type: DataTypes.BOOLEAN, allowNull: true },

      // Infrastructure verification
      irrigation_type_observed: { type: DataTypes.STRING(50), allowNull: true },
      polyhouse_present: { type: DataTypes.BOOLEAN, allowNull: true },

      // Cross-verification
      verification_status: {
        type: DataTypes.ENUM('confirmed', 'contradicted', 'inconclusive', 'partial'),
        allowNull: false, defaultValue: 'inconclusive',
      },
      contradiction_notes: { type: DataTypes.TEXT, allowNull: true },
      verification_confidence_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },

      // Evidence counts
      photos_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      voice_notes_count: { type: DataTypes.INTEGER, defaultValue: 0 },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'SathiStructuredVisitReport',
      tableName: 'sathi_structured_visit_reports',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['report_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['crp_id'] },
        { fields: ['visit_timestamp'] },
        { fields: ['verification_status'] },
      ],
    }
  );

  return SathiStructuredVisitReport;
};
