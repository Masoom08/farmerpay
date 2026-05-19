/**
 * PulsePriceRecord Model
 * Daily commodity price records per mandi: open, close, high, low, volume.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PulsePriceRecord extends Model {
    static associate(models) {
      PulsePriceRecord.belongsTo(models.PulseMandi, { foreignKey: 'mandi_id', as: 'mandi' });
      PulsePriceRecord.belongsTo(models.PulseCommodity, { foreignKey: 'commodity_id', targetKey: 'commodity_id', as: 'commodity' });
    }
  }

  PulsePriceRecord.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      record_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      mandi_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'pulse_mandis', key: 'id' },
      },
      commodity_id: { type: DataTypes.STRING(36), allowNull: false },
      record_date: { type: DataTypes.DATEONLY, allowNull: false },
      opening_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      closing_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      highest_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      lowest_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      modal_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: 'most common trading price from Agmarknet' },
      quantity_traded_quintals: { type: DataTypes.INTEGER, allowNull: true },
      price_trend: {
        type: DataTypes.ENUM('rising', 'stable', 'falling'), allowNull: true,
      },
      // PULSE Blueprint enrichment fields
      quality_flag: { type: DataTypes.ENUM('clean', 'imputed', 'outlier', 'missing'), defaultValue: 'clean' },
      arrivals_tonnes: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      futures_basis: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: 'NCDEX futures - spot price' },
      policy_regime: { type: DataTypes.ENUM('open_market', 'export_ban', 'msp_procurement', 'buffer_release'), defaultValue: 'open_market' },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'PulsePriceRecord', tableName: 'pulse_price_records',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['record_uuid'], unique: true },
        { fields: ['mandi_id', 'commodity_id', 'record_date'] },
      ],
    }
  );

  return PulsePriceRecord;
};
