/**
 * FisherySpeciesStocked Model
 * Species stocking records per pond: type, fingerlings, survival rate.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisherySpeciesStocked extends Model {
    static associate(models) {
      FisherySpeciesStocked.belongsTo(models.FisheryPond, { foreignKey: 'pond_id', as: 'pond' });
    }
  }

  FisherySpeciesStocked.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pond_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'fishery_ponds', key: 'id' },
      },
      species_name: { type: DataTypes.STRING(100), allowNull: false },
      species_type: {
        type: DataTypes.ENUM('carp', 'catfish', 'tilapia', 'shrimp', 'other'), allowNull: true,
      },
      stocking_date: { type: DataTypes.DATEONLY, allowNull: true },
      fingerlings_stocked: { type: DataTypes.INTEGER, allowNull: true },
      fingerling_cost_per_unit: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      expected_survival_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FisherySpeciesStocked', tableName: 'fishery_species_stocked',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['pond_id'] }],
    }
  );

  return FisherySpeciesStocked;
};
