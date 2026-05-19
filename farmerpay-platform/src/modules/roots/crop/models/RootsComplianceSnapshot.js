/**
 * RootsComplianceSnapshot Model — Stores per-activity compliance scores
 * computed by the Variance Engine. Read by Banker dashboard, TRUST, and SENTINEL.
 * Covers all 6 activity types: CROP, DAIRY, FISHERY, HORTI, POULTRY, GOATERY.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RootsComplianceSnapshot extends Model {
    static associate(models) {
      RootsComplianceSnapshot.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }

    isHighCompliance() {
      return this.overall_compliance_score > 80;
    }
  }

  RootsComplianceSnapshot.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    activity_type: { type: DataTypes.ENUM('CROP', 'DAIRY', 'FISHERY', 'HORTI', 'POULTRY', 'GOATERY'), allowNull: false },
    activity_reference_id: { type: DataTypes.INTEGER, allowNull: false, comment: 'cycle_id / herd_id / flock_id / orchard_id' },
    overall_compliance_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    timing_compliance_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    quantity_compliance_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    cost_compliance_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    practice_compliance_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    total_stages: { type: DataTypes.INTEGER, defaultValue: 0 },
    completed_stages: { type: DataTypes.INTEGER, defaultValue: 0 },
    missed_stages: { type: DataTypes.INTEGER, defaultValue: 0 },
    delayed_stages: { type: DataTypes.INTEGER, defaultValue: 0 },
    total_expected_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    total_actual_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    cost_variance_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    data_completeness_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    photo_evidence_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    sathi_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    soil_health_card_available: { type: DataTypes.BOOLEAN, defaultValue: false },
    snapshot_date: { type: DataTypes.DATEONLY, allowNull: false },
    season: { type: DataTypes.STRING(20), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'RootsComplianceSnapshot', tableName: 'roots_compliance_snapshots',
    timestamps: true, underscored: true,
    scopes: {
      byFarmer(farmerId) { return { where: { farmer_id: farmerId } }; },
      byActivity(type) { return { where: { activity_type: type } }; },
      activeInSeason(season) { return { where: { season, is_active: true } }; },
    },
    indexes: [
      { fields: ['farmer_id', 'activity_type', 'snapshot_date'] },
      { fields: ['overall_compliance_score'] },
      { fields: ['snapshot_date'] },
    ],
  });

  return RootsComplianceSnapshot;
};
