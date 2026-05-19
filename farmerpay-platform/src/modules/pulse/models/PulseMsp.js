/**
 * PulseMsp Model
 * Government Minimum Support Prices per commodity, season, and year.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PulseMsp extends Model {
    static associate(models) {
      PulseMsp.belongsTo(models.PulseCommodity, { foreignKey: 'commodity_id', targetKey: 'commodity_id', as: 'commodity' });
    }
  }

  PulseMsp.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      msp_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      commodity_id: { type: DataTypes.STRING(36), allowNull: false },
      msp_season: {
        type: DataTypes.ENUM('kharif', 'rabi', 'summer'), allowNull: true,
      },
      msp_year: { type: DataTypes.INTEGER, allowNull: true },
      msp_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      msp_announced_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'PulseMsp', tableName: 'pulse_msps',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['msp_uuid'], unique: true }, { fields: ['commodity_id'] }],
    }
  );

  return PulseMsp;
};
