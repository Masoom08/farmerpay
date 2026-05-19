/**
 * SathiTask Model
 * G-series task queue for field agents (Sathis).
 */
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SathiTask extends Model {
    static associate(models) {
      SathiTask.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      SathiTask.belongsTo(models.User, { foreignKey: 'sathi_id', as: 'sathi' });
    }
  }
  SathiTask.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    task_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    sathi_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
    task_type: {
      type: DataTypes.ENUM('COLLECT_HOUSEHOLD', 'VERIFY_LAND', 'UPLOAD_INSURANCE', 'PHOTO_GEOTAG', 'FARMER_REQUESTED'),
      allowNull: false,
    },
    reason_code: {
      type: DataTypes.ENUM('HOUSEHOLD_REFRESH', 'LAND_EXPIRES', 'INSURANCE_MISSING', 'PHOTO_GEOTAG_NEEDED', 'FARMER_REQUESTED'),
      allowNull: false,
    },
    status: { type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'), defaultValue: 'OPEN' },
    due_by: { type: DataTypes.DATEONLY, allowNull: true },
    village: { type: DataTypes.STRING(128), allowNull: true },
    crop: { type: DataTypes.STRING(64), allowNull: true },
    payload: { type: DataTypes.JSON, allowNull: true, comment: 'Collected answers / photo refs on submit' },
    requested_by: { type: DataTypes.ENUM('BANKER', 'FARMER', 'SYSTEM'), defaultValue: 'BANKER' },
  }, {
    sequelize, modelName: 'TrustSathiTask', tableName: 'trust_sathi_tasks',
    timestamps: true, underscored: true,
    indexes: [
      { fields: ['sathi_id', 'status', 'due_by'], name: 'idx_sathi_tasks_agent' },
      { fields: ['farmer_id', 'status'], name: 'idx_sathi_tasks_farmer' },
    ],
  });
  return SathiTask;
};
