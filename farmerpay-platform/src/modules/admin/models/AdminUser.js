/**
 * AdminUser Model — bank-ops workforce auth for the May 2026 pilot admin UI.
 *
 * Separate from the farmer `users` table because workforce users have
 * entirely different auth (email + password), session (browser cookies),
 * and scoping (bank_name_scope for bank_admin role). Keeping them apart
 * avoids leaking workforce access control into the farmer KYC flow.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AdminUser extends Model {
    /**
     * Returns true if this admin user can see data for the given bank.
     * - system_admin and pilot_ops see everything
     * - bank_admin is restricted to their bank_name_scope
     */
    canSeeBank(bankName) {
      if (this.role === 'system_admin' || this.role === 'pilot_ops') return true;
      if (!bankName) return true; // aggregate queries that don't specify a bank
      return this.bank_name_scope === bankName;
    }
  }

  AdminUser.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(100), allowNull: true },
      password_hash: { type: DataTypes.STRING(200), allowNull: false },
      role: {
        type: DataTypes.ENUM('bank_admin', 'pilot_ops', 'system_admin'),
        allowNull: false,
        defaultValue: 'bank_admin',
      },
      bank_name_scope: { type: DataTypes.STRING(100), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      last_login_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'AdminUser',
      tableName: 'admin_users',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['email'], unique: true },
        { fields: ['role'] },
      ],
      defaultScope: {
        // Never leak the password hash on normal queries
        attributes: { exclude: ['password_hash'] },
      },
      scopes: {
        withPassword: {
          attributes: { include: ['password_hash'] },
        },
      },
    }
  );

  return AdminUser;
};
