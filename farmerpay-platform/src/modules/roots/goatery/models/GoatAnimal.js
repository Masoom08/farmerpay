/**
 * GoatAnimal Model — Individual animal register within a herd.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoatAnimal extends Model {
    static associate(models) {
      GoatAnimal.belongsTo(models.GoatHerd, { foreignKey: 'herd_id', as: 'herd' });
      GoatAnimal.hasMany(models.GoatGrowthLog, { foreignKey: 'animal_id', as: 'growthLogs' });
      GoatAnimal.hasMany(models.GoatBreedingEvent, { foreignKey: 'doe_id', as: 'breedingEvents' });
    }
  }

  GoatAnimal.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    herd_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'goat_herds', key: 'id' } },
    tag_id: { type: DataTypes.STRING(50), allowNull: true, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: true },
    breed: { type: DataTypes.STRING(100), allowNull: true },
    sex: { type: DataTypes.ENUM('MALE', 'FEMALE'), allowNull: false },
    dob: { type: DataTypes.DATEONLY, allowNull: true },
    approximate_age_months: { type: DataTypes.INTEGER, allowNull: true },
    weight_kg: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    dam_id: { type: DataTypes.INTEGER, allowNull: true },
    sire_id: { type: DataTypes.INTEGER, allowNull: true },
    purchase_date: { type: DataTypes.DATEONLY, allowNull: true },
    purchase_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    source: { type: DataTypes.STRING(200), allowNull: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'SOLD', 'DEAD', 'TRANSFERRED'), defaultValue: 'ACTIVE' },
    status_date: { type: DataTypes.DATEONLY, allowNull: true },
    photo_url: { type: DataTypes.STRING(500), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'GoatAnimal', tableName: 'goat_animals',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['herd_id', 'status'] }],
  });

  return GoatAnimal;
};
