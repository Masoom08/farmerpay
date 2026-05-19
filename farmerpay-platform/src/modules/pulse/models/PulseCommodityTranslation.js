/**
 * PulseCommodityTranslation Model
 * Multilingual commodity names for 11+ Indian languages.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PulseCommodityTranslation extends Model {
    static associate(models) {
      PulseCommodityTranslation.belongsTo(models.PulseCommodity, { foreignKey: 'commodity_id', targetKey: 'commodity_id', as: 'commodity' });
    }
  }

  PulseCommodityTranslation.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      commodity_id: { type: DataTypes.STRING(36), allowNull: false },
      language_code: { type: DataTypes.STRING(10), allowNull: false },
      commodity_name_translated: { type: DataTypes.STRING(150), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'PulseCommodityTranslation', tableName: 'pulse_commodity_translations',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['commodity_id', 'language_code'], unique: true }],
    }
  );

  return PulseCommodityTranslation;
};
