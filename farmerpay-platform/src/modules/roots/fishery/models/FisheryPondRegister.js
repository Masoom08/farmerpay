/**
 * FisheryPondRegister Model
 * Top-level pond register linking a farmer to their aquaculture operation.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryPondRegister extends Model {
    static associate(models) {
      FisheryPondRegister.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      FisheryPondRegister.hasMany(models.FisheryPond, { foreignKey: 'register_id', as: 'ponds' });
      FisheryPondRegister.hasMany(models.FisheryExpenseSummary, { foreignKey: 'register_id', as: 'expenses' });
      FisheryPondRegister.hasMany(models.FisheryIncomeSummary, { foreignKey: 'register_id', as: 'incomes' });
    }
  }

  FisheryPondRegister.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      register_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      register_name: { type: DataTypes.STRING(100), allowNull: false },
      total_pond_area_hectares: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FisheryPondRegister', tableName: 'fishery_pond_registers',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['register_uuid'], unique: true }, { fields: ['farmer_id'] }],
    }
  );

  return FisheryPondRegister;
};
