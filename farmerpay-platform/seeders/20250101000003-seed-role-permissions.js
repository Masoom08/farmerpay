'use strict';

/**
 * Seeds role_permissions junction table.
 * Maps default permissions to each role.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Fetch roles and permissions
    const [roles] = await queryInterface.sequelize.query('SELECT id, role_name FROM roles');
    const [permissions] = await queryInterface.sequelize.query('SELECT id, permission_code FROM permissions');

    const roleMap = {};
    roles.forEach((r) => { roleMap[r.role_name] = r.id; });

    const permMap = {};
    permissions.forEach((p) => { permMap[p.permission_code] = p.id; });

    // Define role → permissions mapping
    const mapping = {
      FARMER: [
        'auth:register', 'auth:login', 'auth:logout', 'auth:reset_password',
        'farmer:view_profile', 'farmer:edit_profile',
        'loan:create', 'loan:view',
        'transaction:create', 'transaction:view',
        'crop:view', 'dairy:view', 'fishery:view',
        'marketplace:view', 'marketplace:sell', 'marketplace:buy',
        'report:view',
      ],
      AGENT: [
        'auth:login', 'auth:logout', 'auth:reset_password',
        'farmer:view_profile', 'farmer:view_all',
        'loan:create', 'loan:view',
        'transaction:view',
        'crop:view', 'dairy:view', 'fishery:view',
        'marketplace:view',
        'report:view',
      ],
      VENDOR: [
        'auth:login', 'auth:logout', 'auth:reset_password',
        'marketplace:view', 'marketplace:sell',
        'transaction:view',
        'report:view',
      ],
      VENDOR_AGENT: [
        'auth:login', 'auth:logout', 'auth:reset_password',
        'marketplace:view', 'marketplace:sell',
        'transaction:view',
      ],
      BANK_USER: [
        'auth:login', 'auth:logout', 'auth:reset_password',
        'loan:view', 'transaction:view_all',
        'farmer:view_all',
        'report:view',
      ],
      BANK_ADMIN: [
        'auth:login', 'auth:logout', 'auth:reset_password',
        'loan:view', 'loan:approve', 'loan:reject', 'loan:disburse',
        'transaction:view_all',
        'farmer:view_all',
        'report:view', 'report:export', 'report:generate',
      ],
      SYSTEM_OPERATOR: [
        'auth:login', 'auth:logout', 'auth:reset_password',
        'farmer:view_all', 'farmer:manage',
        'loan:view',
        'transaction:view_all',
        'report:view', 'report:export', 'report:generate',
        'admin:view_audit',
      ],
      ADMIN: Object.keys(permMap), // Admin gets all permissions
    };

    // Build insert rows
    const rows = [];
    for (const [roleName, permCodes] of Object.entries(mapping)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      for (const code of permCodes) {
        const permId = permMap[code];
        if (!permId) continue;
        rows.push({
          role_id: roleId,
          permission_id: permId,
          created_at: now,
          updated_at: now,
        });
      }
    }

    if (rows.length > 0) {
      await queryInterface.bulkInsert('role_permissions', rows);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('role_permissions', null, {});
  },
};
