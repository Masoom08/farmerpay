/**
 * DrishtiScenarioComparison Model
 * Side-by-side comparison of 2-3 scenario results, used when the farmer
 * wants to compare options.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrishtiScenarioComparison extends Model {
    static associate(models) {
      DrishtiScenarioComparison.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  DrishtiScenarioComparison.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      comparison_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      comparison_label: { type: DataTypes.STRING(150), allowNull: true },

      run_ids: { type: DataTypes.JSON, allowNull: false },
      comparison_summary: { type: DataTypes.JSON, allowNull: true },
      recommended_run_id: { type: DataTypes.INTEGER, allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'DrishtiScenarioComparison',
      tableName: 'drishti_scenario_comparisons',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['comparison_uuid'], unique: true },
        { fields: ['farmer_id'] },
      ],
    }
  );

  return DrishtiScenarioComparison;
};
