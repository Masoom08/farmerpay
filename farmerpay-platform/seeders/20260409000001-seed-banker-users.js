'use strict';

/**
 * Banker Users Seeder
 *
 * Creates test accounts so QA and pilot demos can actually log in to
 * the banker dashboard and the admin loan-inbox pages. Without this,
 * nobody can exercise the new /banker/loan-inbox or /admin/loans
 * endpoints because the roles + admin_users table are empty in dev.
 *
 * What gets seeded (all idempotent via INSERT IGNORE + findOrCreate):
 *
 *   1. A `dice_analyst` role row in `roles` (JWT-side RBAC)
 *   2. A farmer-side user (mobile 9999900001, password Banker@123)
 *      linked to the dice_analyst role via user_roles. Used by the
 *      banker-dashboard.html SPA which logs in via JWT.
 *   3. A workforce-side admin_users row (banker@farmerpay.test,
 *      password Banker@123, role bank_admin). Used by /admin/login
 *      session flow for the EJS loan-inbox pages.
 *
 * Re-running is safe: every write uses a unique-key check so re-seeds
 * are no-ops.
 *
 * Password hash:
 *   'Banker@123' bcrypt 12 rounds
 *   $2b$12$f2n7ZSrZNGZ4wgLxzK.0Muu81nVdbPTTBpf3qEkdaI.4x7.8dNZOy
 */

// Real bcryptjs hashes — generated once and inlined.
// Banker@123 -> password hash (for admin_users email-password login)
// 9001       -> MPIN hash (for farmer-side mobile + MPIN login)
const BANKER_PWD_HASH = '$2a$12$8OVzxbDm1Wp7p5lQVWdwuu9pvse8PC7RrRjrnGxzhKuUHpLuRHDJq';
const BANKER_MPIN_HASH = '$2a$12$0FHh6W0PVSJyQNwOkwLhj.G4tTpP63sUVFBzBq9Fp.hTzIFMKJorS';

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ── 1. dice_analyst role ──
    const [existingRoles] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE role_name = 'dice_analyst' LIMIT 1",
    );
    let diceAnalystRoleId = existingRoles[0]?.id;
    if (!diceAnalystRoleId) {
      const [result] = await queryInterface.sequelize.query(
        `INSERT INTO roles (role_name, display_name, description, priority, is_active, created_at, updated_at)
         VALUES ('dice_analyst', 'DICE Analyst', 'Banker who reviews and approves loan applications', 50, 1, ?, ?)`,
        { replacements: [now, now] },
      );
      diceAnalystRoleId = result;
    }

    // ── 2. JWT-side banker user ──
    const [existingUsers] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE mobile = '+919999900001' LIMIT 1",
    );
    let bankerUserId = existingUsers[0]?.id;
    if (!bankerUserId) {
      await queryInterface.bulkInsert('users', [
        {
          user_id: 'USR-BANKER-DEMO-001',
          email: 'banker.demo@farmerpay.test',
          mobile: '+919999900001',
          password_hash: BANKER_PWD_HASH,
          mpin_hash: BANKER_MPIN_HASH,
          first_name: 'Meena',
          last_name: 'Iyer',
          is_email_verified: true,
          is_mobile_verified: true,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
      const [newUsers] = await queryInterface.sequelize.query(
        "SELECT id FROM users WHERE mobile = '+919999900001' LIMIT 1",
      );
      bankerUserId = newUsers[0].id;
    }

    // ── 3. user_roles link ──
    const [existingLinks] = await queryInterface.sequelize.query(
      `SELECT id FROM user_roles WHERE user_id = ? AND role_id = ? LIMIT 1`,
      { replacements: [bankerUserId, diceAnalystRoleId] },
    );
    if (!existingLinks[0]) {
      await queryInterface.bulkInsert('user_roles', [
        {
          user_id: bankerUserId,
          role_id: diceAnalystRoleId,
          assigned_at: now,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    // ── 4. admin_users-side banker row (for the EJS /admin path) ──
    const [existingAdmins] = await queryInterface.sequelize.query(
      "SELECT id FROM admin_users WHERE email = 'banker@farmerpay.test' LIMIT 1",
    );
    if (!existingAdmins[0]) {
      await queryInterface.bulkInsert('admin_users', [
        {
          email: 'banker@farmerpay.test',
          name: 'Meena Iyer (Banker)',
          password_hash: BANKER_PWD_HASH,
          role: 'bank_admin',
          bank_name_scope: 'State Bank of India',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    // Keep the dice_analyst role — other modules may rely on it.
    // Just remove the seeded users + links.
    await queryInterface.sequelize.query(
      "DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE mobile = '+919999900001')",
    );
    await queryInterface.bulkDelete('users', { mobile: '+919999900001' });
    await queryInterface.bulkDelete('admin_users', { email: 'banker@farmerpay.test' });
  },
};
