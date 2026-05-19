/**
 * HorticultureInputLog Model
 * Input usage: fertilizers, pesticides, growth regulators per orchard.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HorticultureInputLog extends Model {
    static associate(models) {
      HorticultureInputLog.belongsTo(models.HorticultureOrchard, { foreignKey: 'orchard_id', as: 'orchard' });
    }
  }

  HorticultureInputLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orchard_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
      },
      input_date: { type: DataTypes.DATEONLY, allowNull: false },
      input_type: { type: DataTypes.STRING(50), allowNull: true },
      input_name: { type: DataTypes.STRING(100), allowNull: true },
      quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      unit: { type: DataTypes.STRING(20), allowNull: true },
      cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'HorticultureInputLog', tableName: 'horticulture_input_logs',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['orchard_id'] }],
    }
  );

  return HorticultureInputLog;
};
