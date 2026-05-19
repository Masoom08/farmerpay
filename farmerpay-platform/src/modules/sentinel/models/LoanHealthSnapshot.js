/**
 * LoanHealthSnapshot Model
 * Point-in-time snapshot of loan health: outstanding amounts, overdue days, health score.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoanHealthSnapshot extends Model {
    static associate(models) {
      LoanHealthSnapshot.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  LoanHealthSnapshot.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      snapshot_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      snapshot_date: { type: DataTypes.DATEONLY, allowNull: false },
      days_overdue: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      principal_outstanding: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      interest_outstanding: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      total_outstanding: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      next_emi_due_date: { type: DataTypes.DATEONLY, allowNull: true },
      next_emi_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      health_status: {
        type: DataTypes.ENUM('good', 'watch', 'stressed', 'npa'),
        allowNull: false,
        defaultValue: 'good',
      },
      health_score: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'LoanHealthSnapshot',
      tableName: 'loan_health_snapshots',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['snapshot_uuid'], unique: true },
        { fields: ['application_id', 'snapshot_date'] },
        { fields: ['health_status'] },
      ],
    }
  );

  return LoanHealthSnapshot;
};
