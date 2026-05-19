/**
 * SageAdvisoryType Model
 * Advisory type definitions: weather_alert, pest_disease_alert, loan_reminder, etc.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SageAdvisoryType extends Model {
    static associate(models) {
      SageAdvisoryType.hasMany(models.SageAdvisory, { foreignKey: 'advisory_type_id', as: 'advisories' });
    }
  }

  SageAdvisoryType.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      advisory_type_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      advisory_type_name: { type: DataTypes.STRING(100), allowNull: false },
      advisory_category: { type: DataTypes.STRING(50), allowNull: true },
      typical_urgency: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), allowNull: true,
      },
      description: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'SageAdvisoryType', tableName: 'sage_advisory_types',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['advisory_type_code'], unique: true }],
    }
  );

  return SageAdvisoryType;
};
