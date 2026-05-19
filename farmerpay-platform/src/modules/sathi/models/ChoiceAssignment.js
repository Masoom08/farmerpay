/**
 * ChoiceAssignment Model
 * Maps farmers to CRP/intermediaries with assignment status tracking.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChoiceAssignment extends Model {
    static associate(models) {
      ChoiceAssignment.belongsTo(models.ChoiceIntermediary, {
        foreignKey: 'choice_id',
        targetKey: 'choice_id',
        as: 'intermediary',
      });
      ChoiceAssignment.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  ChoiceAssignment.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      assignment_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      choice_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      assigned_at: { type: DataTypes.DATE, allowNull: true },
      assigned_by: { type: DataTypes.INTEGER, allowNull: true },
      assignment_status: {
        type: DataTypes.ENUM('active', 'completed', 'transferred', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      assignment_notes: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ChoiceAssignment',
      tableName: 'choice_assignments',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['assignment_id'], unique: true },
        { fields: ['choice_id'] },
        { fields: ['farmer_id'] },
      ],
    }
  );

  return ChoiceAssignment;
};
