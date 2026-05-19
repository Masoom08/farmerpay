/**
 * PopComplianceSnapshot Model — Records PoP compliance scores at each of 10 touchpoints.
 * Updated incrementally as farmer completes each workband entry.
 * Links to Scale of Finance for cost benchmarking and to loan application for input baseline.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PopComplianceSnapshot extends Model {
    static associate(models) {
      PopComplianceSnapshot.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      PopComplianceSnapshot.belongsTo(models.CultivationCycle, { foreignKey: 'cycle_id', targetKey: 'cycle_uuid', as: 'cycle' });
    }
  }
  PopComplianceSnapshot.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    snapshot_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    cycle_id: { type: DataTypes.STRING(36), allowNull: false, comment: 'FK to cultivation_cycles.cycle_uuid' },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    pop_id: { type: DataTypes.STRING(36), allowNull: true, comment: 'FK to package_of_practices.pop_uuid' },
    sof_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'Scale of Finance used for cost benchmarking' },
    // Per-touchpoint scores (array of 10 objects)
    touchpoint_scores: { type: DataTypes.JSON, allowNull: true, comment: '[{ workband_order, workband_name, task_score, input_score, cost_score, timing_score, touchpoint_score, completed_at, status }]' },
    // Dimension aggregates (0-100 each)
    timeliness_score: { type: DataTypes.INTEGER, defaultValue: 0 },
    task_completion_score: { type: DataTypes.INTEGER, defaultValue: 0 },
    input_compliance_score: { type: DataTypes.INTEGER, defaultValue: 0 },
    cost_vs_sof_score: { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Actual cost vs Scale of Finance norms' },
    overall_compliance_score: { type: DataTypes.INTEGER, defaultValue: 0, comment: '0-100 weighted average' },
    compliance_status: { type: DataTypes.ENUM('on_track', 'at_risk', 'off_track'), defaultValue: 'on_track' },
    // Progress tracking
    touchpoints_completed: { type: DataTypes.INTEGER, defaultValue: 0 },
    touchpoints_total: { type: DataTypes.INTEGER, defaultValue: 10 },
    // Cost tracking vs SoF
    sof_cost_per_hectare: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    actual_cost_per_hectare: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    cost_deviation_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true, comment: '(actual - sof) / sof × 100' },
    // Loan input baseline (what farmer committed to at loan time)
    loan_input_baseline: { type: DataTypes.JSON, allowNull: true, comment: 'From LoanApplication.input_cost_breakdown' },
    // Deviations
    deviations: { type: DataTypes.JSON, allowNull: true, comment: '[{ dimension, item, expected, actual, variance, severity }]' },
    calculated_at: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'PopComplianceSnapshot', tableName: 'pop_compliance_snapshots',
    timestamps: true, underscored: true,
    indexes: [
      { fields: ['snapshot_uuid'], unique: true },
      { fields: ['cycle_id'] },
      { fields: ['farmer_id'] },
      { fields: ['compliance_status'] }
    ]
  });
  return PopComplianceSnapshot;
};
