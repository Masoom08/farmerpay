/**
 * HorticultureIncomeSummary Model
 * Monthly income summary per orchard.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HorticultureIncomeSummary extends Model {
    static associate(models) {
      HorticultureIncomeSummary.belongsTo(models.HorticultureOrchard, { foreignKey: 'orchard_id', as: 'orchard' });
    }
  }

  HorticultureIncomeSummary.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orchard_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
      },
      income_month: { type: DataTypes.INTEGER, allowNull: false },
      income_year: { type: DataTypes.INTEGER, allowNull: false },
      harvest_sale_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      byproduct_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      total_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'HorticultureIncomeSummary', tableName: 'horticulture_income_summaries',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['orchard_id'] }, { fields: ['income_month', 'income_year'] }],
    }
  );

  return HorticultureIncomeSummary;
};
