'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('roles', [
      {
        role_name: 'FARMER',
        display_name: 'Farmer',
        description: 'Primary farmer user — access to crop, dairy, fishery services',
        priority: 10,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: 'AGENT',
        display_name: 'Field Agent',
        description: 'Sathi field agent — assists farmers with onboarding and services',
        priority: 20,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: 'VENDOR',
        display_name: 'Vendor',
        description: 'Input supplier or service provider on the Vyapar marketplace',
        priority: 15,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: 'VENDOR_AGENT',
        display_name: 'Vendor Agent',
        description: 'Representative acting on behalf of a vendor',
        priority: 14,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: 'BANK_USER',
        display_name: 'Bank User',
        description: 'Bank staff with read access to loan and transaction data',
        priority: 30,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: 'BANK_ADMIN',
        display_name: 'Bank Administrator',
        description: 'Bank admin with loan approval and configuration access',
        priority: 40,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: 'SYSTEM_OPERATOR',
        display_name: 'System Operator',
        description: 'Operations staff — manages platform settings and monitoring',
        priority: 50,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: 'ADMIN',
        display_name: 'Administrator',
        description: 'Full platform administrator with all privileges',
        priority: 100,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', null, {});
  },
};
