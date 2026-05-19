/**
 * RootsRedFlag Model — Triggered by the Variance Engine when anomalies are detected.
 * Consumed by Banker dashboard and SENTINEL for risk monitoring.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RootsRedFlag extends Model {
    static associate(models) {
      RootsRedFlag.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      RootsRedFlag.belongsTo(models.LoanApplication, { foreignKey: 'loan_application_id', as: 'loanApplication' });
    }
  }

  RootsRedFlag.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    loan_application_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'loan_applications', key: 'id' } },
    activity_type: { type: DataTypes.ENUM('CROP', 'DAIRY', 'FISHERY', 'HORTI', 'POULTRY', 'GOATERY'), allowNull: false },
    activity_reference_id: { type: DataTypes.INTEGER, allowNull: false },
    flag_type: { type: DataTypes.ENUM('NO_DATA_ENTRY', 'CRITICAL_STAGE_MISSED', 'COST_ANOMALY', 'YIELD_ANOMALY', 'PRACTICE_DEVIATION_SEVERE', 'LOAN_UTILIZATION_MISMATCH', 'BACKFILL_SUSPECTED', 'GPS_MISMATCH', 'SATHI_DISCREPANCY', 'DISTRESS_SIGNAL', 'MORTALITY_SPIKE', 'FEED_COST_SPIRAL'), allowNull: false },
    severity: { type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    evidence_json: { type: DataTypes.JSON, allowNull: true },
    status: { type: DataTypes.ENUM('OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'), defaultValue: 'OPEN' },
    acknowledged_by: { type: DataTypes.INTEGER, allowNull: true },
    acknowledged_at: { type: DataTypes.DATE, allowNull: true },
    resolution_notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'RootsRedFlag', tableName: 'roots_red_flags',
    timestamps: true, underscored: true,
    scopes: {
      open() { return { where: { status: 'OPEN' } }; },
      bySeverity(level) { return { where: { severity: level } }; },
      byFarmer(farmerId) { return { where: { farmer_id: farmerId } }; },
    },
    indexes: [
      { fields: ['farmer_id', 'status'] },
      { fields: ['severity', 'status'] },
      { fields: ['loan_application_id'] },
    ],
  });

  return RootsRedFlag;
};
