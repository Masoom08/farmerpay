/**
 * ChoiceInteractionLog Model
 * Logs interactions between CRP/intermediaries and farmers: calls, visits, messages.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChoiceInteractionLog extends Model {
    static associate(models) {
      ChoiceInteractionLog.belongsTo(models.ChoiceIntermediary, {
        foreignKey: 'choice_id',
        targetKey: 'choice_id',
        as: 'intermediary',
      });
      ChoiceInteractionLog.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  ChoiceInteractionLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      interaction_id: {
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
      interaction_type: {
        type: DataTypes.ENUM('phone_call', 'sms', 'in_person_visit', 'whatsapp', 'video_call'),
        allowNull: false,
      },
      interaction_date: { type: DataTypes.DATE, allowNull: true },
      interaction_duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
      interaction_purpose: { type: DataTypes.STRING(100), allowNull: true },
      outcome: { type: DataTypes.TEXT, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ChoiceInteractionLog',
      tableName: 'choice_interaction_logs',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['interaction_id'], unique: true },
        { fields: ['choice_id'] },
        { fields: ['farmer_id'] },
      ],
    }
  );

  return ChoiceInteractionLog;
};
