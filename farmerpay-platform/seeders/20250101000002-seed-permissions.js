'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const permissions = [
      // Auth
      { permission_code: 'auth:register', display_name: 'Register Account', category: 'auth' },
      { permission_code: 'auth:login', display_name: 'Login', category: 'auth' },
      { permission_code: 'auth:logout', display_name: 'Logout', category: 'auth' },
      { permission_code: 'auth:reset_password', display_name: 'Reset Password', category: 'auth' },

      // Farmer
      { permission_code: 'farmer:view_profile', display_name: 'View Farmer Profile', category: 'farmer' },
      { permission_code: 'farmer:edit_profile', display_name: 'Edit Farmer Profile', category: 'farmer' },
      { permission_code: 'farmer:view_all', display_name: 'View All Farmers', category: 'farmer' },
      { permission_code: 'farmer:manage', display_name: 'Manage Farmers', category: 'farmer' },

      // Loan
      { permission_code: 'loan:create', display_name: 'Create Loan Application', category: 'loan' },
      { permission_code: 'loan:view', display_name: 'View Loan Details', category: 'loan' },
      { permission_code: 'loan:approve', display_name: 'Approve Loan', category: 'loan' },
      { permission_code: 'loan:reject', display_name: 'Reject Loan', category: 'loan' },
      { permission_code: 'loan:disburse', display_name: 'Disburse Loan', category: 'loan' },

      // Transaction
      { permission_code: 'transaction:create', display_name: 'Create Transaction', category: 'transaction' },
      { permission_code: 'transaction:view', display_name: 'View Transactions', category: 'transaction' },
      { permission_code: 'transaction:view_all', display_name: 'View All Transactions', category: 'transaction' },

      // Report
      { permission_code: 'report:view', display_name: 'View Reports', category: 'report' },
      { permission_code: 'report:export', display_name: 'Export Reports', category: 'report' },
      { permission_code: 'report:generate', display_name: 'Generate Reports', category: 'report' },

      // Crop / Dairy / Fishery
      { permission_code: 'crop:view', display_name: 'View Crop Data', category: 'roots' },
      { permission_code: 'crop:manage', display_name: 'Manage Crop Data', category: 'roots' },
      { permission_code: 'dairy:view', display_name: 'View Dairy Data', category: 'roots' },
      { permission_code: 'dairy:manage', display_name: 'Manage Dairy Data', category: 'roots' },
      { permission_code: 'fishery:view', display_name: 'View Fishery Data', category: 'roots' },
      { permission_code: 'fishery:manage', display_name: 'Manage Fishery Data', category: 'roots' },

      // Marketplace (Vyapar)
      { permission_code: 'marketplace:view', display_name: 'View Marketplace', category: 'vyapar' },
      { permission_code: 'marketplace:sell', display_name: 'List Products for Sale', category: 'vyapar' },
      { permission_code: 'marketplace:buy', display_name: 'Purchase Products', category: 'vyapar' },
      { permission_code: 'marketplace:manage', display_name: 'Manage Marketplace', category: 'vyapar' },

      // Admin
      { permission_code: 'admin:manage_users', display_name: 'Manage Users', category: 'admin' },
      { permission_code: 'admin:manage_roles', display_name: 'Manage Roles', category: 'admin' },
      { permission_code: 'admin:manage_permissions', display_name: 'Manage Permissions', category: 'admin' },
      { permission_code: 'admin:system_config', display_name: 'System Configuration', category: 'admin' },
      { permission_code: 'admin:view_audit', display_name: 'View Audit Logs', category: 'admin' },
    ];

    await queryInterface.bulkInsert(
      'permissions',
      permissions.map((p) => ({
        ...p,
        description: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permissions', null, {});
  },
};
