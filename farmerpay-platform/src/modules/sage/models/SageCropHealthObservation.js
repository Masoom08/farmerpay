/**
 * SageCropHealthObservation Model
 * Crop health monitoring: pest/disease observation with recommended actions.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SageCropHealthObservation extends Model {
    static associate(models) {
      SageCropHealthObservation.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      SageCropHealthObservation.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id', targetKey: 'cycle_uuid', as: 'cycle',
      });
    }
  }

  SageCropHealthObservation.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      observation_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      cycle_id: { type: DataTypes.STRING(36), allowNull: true },
      observation_date: { type: DataTypes.DATEONLY, allowNull: true },
      health_status: {
        type: DataTypes.ENUM('excellent', 'good', 'average', 'poor'), allowNull: true,
      },
      pest_observed: { type: DataTypes.BOOLEAN, defaultValue: false },
      pest_name: { type: DataTypes.STRING(100), allowNull: true },
      affected_area_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      disease_observed: { type: DataTypes.BOOLEAN, defaultValue: false },
      disease_name: { type: DataTypes.STRING(100), allowNull: true },
      recommended_action: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'SageCropHealthObservation', tableName: 'sage_crop_health_observations',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['observation_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['cycle_id'] },
      ],
    }
  );

  return SageCropHealthObservation;
};
