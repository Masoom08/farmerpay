/**
 * HorticultureHealthRecord Model
 * Plant health monitoring: pest, disease, nutrient deficiency.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HorticultureHealthRecord extends Model {
    static associate(models) {
      HorticultureHealthRecord.belongsTo(models.HorticultureOrchard, { foreignKey: 'orchard_id', as: 'orchard' });
    }
  }

  HorticultureHealthRecord.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orchard_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
      },
      observation_date: { type: DataTypes.DATEONLY, allowNull: false },
      health_status: {
        type: DataTypes.ENUM('excellent', 'good', 'average', 'poor'), allowNull: true,
      },
      pest_detected: { type: DataTypes.BOOLEAN, defaultValue: false },
      pest_name: { type: DataTypes.STRING(100), allowNull: true },
      disease_detected: { type: DataTypes.BOOLEAN, defaultValue: false },
      disease_name: { type: DataTypes.STRING(100), allowNull: true },
      affected_plant_count: { type: DataTypes.INTEGER, allowNull: true },
      treatment_given: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'HorticultureHealthRecord', tableName: 'horticulture_health_records',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['orchard_id'] }],
    }
  );

  return HorticultureHealthRecord;
};
