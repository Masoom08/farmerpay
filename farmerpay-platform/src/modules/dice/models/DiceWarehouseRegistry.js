/**
 * DiceWarehouseRegistry Model — Registered warehouses for produce hypothecation.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DiceWarehouseRegistry extends Model {
    static associate(models) {
      DiceWarehouseRegistry.belongsTo(models.LgdDistrict, { foreignKey: 'district_id', as: 'district' });
      DiceWarehouseRegistry.belongsTo(models.LgdState, { foreignKey: 'state_id', as: 'state' });
    }
  }
  DiceWarehouseRegistry.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    warehouse_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    warehouse_name: { type: DataTypes.STRING(200), allowNull: true },
    warehouse_type: { type: DataTypes.ENUM('fci', 'cwc', 'swc', 'private', 'cooperative', 'fpo'), allowNull: true },
    operator_name: { type: DataTypes.STRING(200), allowNull: true },
    district_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'lgd_districts', key: 'id' } },
    state_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'lgd_states', key: 'id' } },
    latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    total_capacity_tonnes: { type: DataTypes.INTEGER, allowNull: true },
    available_capacity_tonnes: { type: DataTypes.INTEGER, allowNull: true },
    enwr_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    cold_storage_available: { type: DataTypes.BOOLEAN, defaultValue: false },
    storage_rate_per_quintal_per_day: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    insurance_available: { type: DataTypes.BOOLEAN, defaultValue: false },
    last_audit_date: { type: DataTypes.DATEONLY, allowNull: true },
    grading_facility_available: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize,
    modelName: 'DiceWarehouseRegistry',
    tableName: 'dice_warehouse_registries',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['district_id', 'enwr_enabled'] },
      { fields: ['state_id'] }
    ]
  });
  return DiceWarehouseRegistry;
};
