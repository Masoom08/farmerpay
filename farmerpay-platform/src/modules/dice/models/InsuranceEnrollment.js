/**
 * InsuranceEnrollment Model
 * Standalone insurance enrollment: PMFBY crop, livestock, aquaculture, polyhouse, weather.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InsuranceEnrollment extends Model {
    static associate(models) {
      InsuranceEnrollment.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  InsuranceEnrollment.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      enrollment_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      insurance_type: {
        type: DataTypes.ENUM('pmfby_crop', 'livestock', 'aquaculture', 'polyhouse', 'weather_index'),
        allowNull: false,
      },
      insurer_name: { type: DataTypes.STRING(100), allowNull: true },
      policy_number: { type: DataTypes.STRING(50), allowNull: true },
      sum_insured: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      premium_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      premium_subsidy: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      crop_insured: { type: DataTypes.STRING(50), allowNull: true },
      area_insured_hectares: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      animal_tag_id: { type: DataTypes.STRING(50), allowNull: true },
      season: { type: DataTypes.STRING(20), allowNull: true },
      enrollment_date: { type: DataTypes.DATEONLY, allowNull: true },
      policy_expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
      claim_filed: { type: DataTypes.BOOLEAN, defaultValue: false },
      claim_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      claim_status: {
        type: DataTypes.ENUM('none', 'filed', 'under_review', 'approved', 'rejected', 'settled'),
        defaultValue: 'none',
      },
      claim_payout: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      linked_loan_id: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'InsuranceEnrollment', tableName: 'insurance_enrollments',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['enrollment_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['insurance_type'] },
        { fields: ['season'] },
        { fields: ['claim_status'] },
      ],
    }
  );

  return InsuranceEnrollment;
};
