/**
 * PoultryHealthEvent Model — Vaccination, disease, medication tracking.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PoultryHealthEvent extends Model {
    static associate(models) {
      PoultryHealthEvent.belongsTo(models.PoultryFlock, { foreignKey: 'flock_id', as: 'flock' });
    }
  }

  PoultryHealthEvent.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    flock_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'poultry_flocks', key: 'id' } },
    event_date: { type: DataTypes.DATEONLY, allowNull: false },
    event_type: { type: DataTypes.ENUM('VACCINATION', 'DISEASE', 'MEDICATION', 'DEWORMING', 'CULLING'), allowNull: false },
    vaccine_name: { type: DataTypes.STRING(100), allowNull: true },
    disease_name: { type: DataTypes.STRING(100), allowNull: true },
    medicine_name: { type: DataTypes.STRING(100), allowNull: true },
    dosage: { type: DataTypes.STRING(100), allowNull: true },
    birds_affected: { type: DataTypes.INTEGER, allowNull: true },
    cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    administered_by: { type: DataTypes.STRING(100), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'PoultryHealthEvent', tableName: 'poultry_health_events',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['flock_id', 'event_type'] }],
  });

  return PoultryHealthEvent;
};
