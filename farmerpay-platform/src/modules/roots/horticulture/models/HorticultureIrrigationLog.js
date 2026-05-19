/**
 * HorticultureIrrigationLog Model
 * Irrigation records: method, duration, water source.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HorticultureIrrigationLog extends Model {
    static associate(models) {
      HorticultureIrrigationLog.belongsTo(models.HorticultureOrchard, { foreignKey: 'orchard_id', as: 'orchard' });
    }
  }

  HorticultureIrrigationLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orchard_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
      },
      irrigation_date: { type: DataTypes.DATEONLY, allowNull: false },
      irrigation_method: {
        type: DataTypes.ENUM('drip', 'sprinkler', 'flood', 'furrow', 'manual'), allowNull: true,
      },
      duration_hours: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      water_source: { type: DataTypes.STRING(50), allowNull: true },
      cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'HorticultureIrrigationLog', tableName: 'horticulture_irrigation_logs',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['orchard_id'] }],
    }
  );

  return HorticultureIrrigationLog;
};
