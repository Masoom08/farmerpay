/**
 * SageFarmerInteraction Model
 * Tracks farmer interactions: questions asked, advisories acknowledged, actions reported.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SageFarmerInteraction extends Model {
    static associate(models) {
      SageFarmerInteraction.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  SageFarmerInteraction.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      interaction_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      interaction_date: { type: DataTypes.DATEONLY, allowNull: true },
      interaction_type: {
        type: DataTypes.ENUM('question_asked', 'advisory_acknowledged', 'action_taken_reported', 'feedback_provided'),
        allowNull: false,
      },
      interaction_query: { type: DataTypes.TEXT, allowNull: true },
      interaction_response: { type: DataTypes.TEXT, allowNull: true },
      confidence_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'SageFarmerInteraction', tableName: 'sage_farmer_interactions',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['interaction_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['interaction_type'] },
      ],
    }
  );

  return SageFarmerInteraction;
};
