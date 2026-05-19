'use strict';

/**
 * Sathi / CRP comprehensive demo seeder
 *
 * Creates:
 *   - 1 Sathi user (mobile 9999000001, MPIN 1234, role sathi_agent) + intermediary row
 *   - 5 farmer users (reuses existing or creates)
 *   - 5 intermediary_assignments (active)
 *   - 5 sathi_beneficiaries (3 with product activated)
 *   - 15 sathi_commission_ledger rows (6 months × ~2-3 events/month)
 *   - 3 sathi_issue_flags (1 critical, 1 high, 1 resolved)
 *   - 6 sathi_nudges (3 with linked_action_taken_at)
 *
 * Safe to re-run: all inserts are guarded by findOne() checks.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const SATHI_MOBILE = '9999000001';
const SATHI_NAME = 'Priya Sharma';
const SATHI_MPIN = '9001';

// Farmer demo data (used only if we need to create users)
const DEMO_FARMERS = [
  { mobile: '9876543210', first: 'Ramesh', last: 'Kumar' },
  { mobile: '9876543211', first: 'Lakshmi', last: 'Devi' },
  { mobile: '9876543212', first: 'Suresh', last: 'Reddy' },
  { mobile: '9876543213', first: 'Anjali', last: 'Kumari' },
  { mobile: '9876543214', first: 'Venkat', last: 'Rao' },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const Q = queryInterface.sequelize.query.bind(queryInterface.sequelize);

    // ─── Helper: find or create user ────────────────────────────────
    const findOrCreateUser = async (mobile, firstName, lastName, role) => {
      const formatted = mobile.startsWith('+91') ? mobile : `+91${mobile}`;
      const [[existing]] = await Q(
        `SELECT id FROM users WHERE mobile = ? LIMIT 1`,
        { replacements: [formatted] }
      );
      if (existing) return existing.id;

      const mpinHash = await bcrypt.hash(SATHI_MPIN, 10);
      await Q(
        `INSERT INTO users
           (user_id, mobile, first_name, last_name, mpin_hash,
            is_mobile_verified, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        { replacements: [uuidv4(), formatted, firstName, lastName, mpinHash, now, now] }
      );
      const [[row]] = await Q(`SELECT id FROM users WHERE mobile = ? LIMIT 1`, { replacements: [formatted] });

      // Assign role if roles table has it
      if (role) {
        const [[roleRow]] = await Q(`SELECT id FROM roles WHERE name = ? LIMIT 1`, { replacements: [role] }).catch(() => [[null]]);
        if (roleRow) {
          await Q(
            `INSERT IGNORE INTO user_roles (user_id, role_id, created_at, updated_at) VALUES (?, ?, ?, ?)`,
            { replacements: [row.id, roleRow.id, now, now] }
          ).catch(() => {});
        }
      }

      return row.id;
    };

    // ─── 1. Create Sathi user ───────────────────────────────────────
    const sathiUserId = await findOrCreateUser(SATHI_MOBILE, 'Priya', 'Sharma', 'sathi_agent');
    console.log(`[sathi-seed] Sathi user_id=${sathiUserId}`);

    // ─── 2. Create Intermediary row ─────────────────────────────────
    let intermediaryId;
    const [[existingInt]] = await Q(
      `SELECT id FROM intermediaries WHERE mobile = ? LIMIT 1`,
      { replacements: [SATHI_MOBILE] }
    );
    if (existingInt) {
      intermediaryId = existingInt.id;
      // Link user_id if not set
      await Q(`UPDATE intermediaries SET user_id = ? WHERE id = ? AND user_id IS NULL`, { replacements: [sathiUserId, intermediaryId] });
    } else {
      // Find a valid LGD block for Rangareddy district
      const [[lgdBlock]] = await Q(
        `SELECT b.id as block_id, b.district_id, d.state_id
         FROM lgd_blocks b JOIN lgd_districts d ON b.district_id = d.id
         LIMIT 1`
      ).catch(() => [[null]]);

      await Q(
        `INSERT INTO intermediaries
           (intermediary_uuid, name, mobile, type, user_id,
            village_id, block_id, district_id, state_id,
            languages_spoken, skills, services_offered,
            onboarding_kyc_status, rating, total_farmers_served,
            commission_rate_percent, service_radius_km,
            is_available, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 'bank_sakhi', ?,
                 NULL, ?, ?, ?,
                 ?, ?, ?,
                 'verified', 4.6, 87,
                 20.00, 15,
                 1, 1, ?, ?)`,
        {
          replacements: [
            uuidv4(), SATHI_NAME, SATHI_MOBILE, sathiUserId,
            lgdBlock?.block_id || null, lgdBlock?.district_id || null, lgdBlock?.state_id || null,
            JSON.stringify(['hi', 'te', 'en']),
            JSON.stringify(['loans', 'insurance', 'kyc', 'data_entry']),
            JSON.stringify(['loan', 'insurance', 'data_entry', 'nudges']),
            now, now,
          ],
        }
      );
      const [[row]] = await Q(`SELECT id FROM intermediaries WHERE mobile = ? LIMIT 1`, { replacements: [SATHI_MOBILE] });
      intermediaryId = row.id;
    }
    console.log(`[sathi-seed] Intermediary id=${intermediaryId}`);

    // ─── 3. Create 5 farmer users ──────────────────────────────────
    const farmerIds = [];
    for (const f of DEMO_FARMERS) {
      const id = await findOrCreateUser(f.mobile, f.first, f.last, 'farmer');
      farmerIds.push(id);
    }
    console.log(`[sathi-seed] Farmer IDs: ${farmerIds.join(', ')}`);

    // ─── 4. Create assignments ──────────────────────────────────────
    const assignmentIds = [];
    for (const fId of farmerIds) {
      const [[existing]] = await Q(
        `SELECT id FROM intermediary_assignments WHERE intermediary_id = ? AND farmer_id = ? AND is_active = 1 LIMIT 1`,
        { replacements: [intermediaryId, fId] }
      );
      if (existing) {
        assignmentIds.push(existing.id);
      } else {
        await Q(
          `INSERT INTO intermediary_assignments
             (assignment_uuid, intermediary_id, farmer_id, assigned_at,
              assignment_status, selected_by_farmer, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', 1, 1, ?, ?)`,
          { replacements: [uuidv4(), intermediaryId, fId, now, now, now] }
        );
        const [[row]] = await Q(
          `SELECT id FROM intermediary_assignments WHERE intermediary_id = ? AND farmer_id = ? ORDER BY id DESC LIMIT 1`,
          { replacements: [intermediaryId, fId] }
        );
        assignmentIds.push(row.id);
      }
    }

    // ─── 5. Create beneficiaries (3 activated, 2 pending) ──────────
    const activatedFarmers = [0, 1, 2]; // indices into farmerIds
    for (let i = 0; i < farmerIds.length; i++) {
      const [[existing]] = await Q(
        `SELECT id FROM sathi_beneficiaries WHERE intermediary_id = ? AND farmer_id = ? LIMIT 1`,
        { replacements: [intermediaryId, farmerIds[i]] }
      );
      if (existing) continue;

      const isActivated = activatedFarmers.includes(i);
      const productTypes = ['loan', 'insurance', 'activity'];
      const activatedAt = isActivated ? new Date(2026, 0 + i, 15) : null; // Jan/Feb/Mar 2026

      await Q(
        `INSERT INTO sathi_beneficiaries
           (intermediary_id, farmer_id, assignment_id,
            first_product_activated_at, first_product_type,
            is_counted_for_incentive, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            intermediaryId, farmerIds[i], assignmentIds[i],
            activatedAt, isActivated ? productTypes[i] : null,
            isActivated ? 1 : 0, isActivated ? 'active' : 'pending',
            now, now,
          ],
        }
      );
    }

    // ─── 6. Commission ledger (6 months) ────────────────────────────
    const [[existingComm]] = await Q(
      `SELECT id FROM sathi_commission_ledger WHERE intermediary_id = ? LIMIT 1`,
      { replacements: [intermediaryId] }
    );
    if (!existingComm) {
      const commissionData = [
        { period: '2025-11', farmer: 0, type: 'loan_processing_fee', gross: 82000, events: 14 },
        { period: '2025-12', farmer: 1, type: 'insurance_commission', gross: 65000, events: 11 },
        { period: '2026-01', farmer: 0, type: 'loan_processing_fee', gross: 52000, events: 8 },
        { period: '2026-01', farmer: 2, type: 'txn_fee', gross: 46000, events: 7 },
        { period: '2026-02', farmer: 1, type: 'loan_processing_fee', gross: 78000, events: 12 },
        { period: '2026-02', farmer: 0, type: 'insurance_commission', gross: 64000, events: 9 },
        { period: '2026-03', farmer: 2, type: 'loan_processing_fee', gross: 95000, events: 15 },
        { period: '2026-03', farmer: 1, type: 'subsidy_facilitation_fee', gross: 90000, events: 13 },
        { period: '2026-04', farmer: 0, type: 'loan_processing_fee', gross: 35000, events: 6 },
        { period: '2026-04', farmer: 2, type: 'insurance_commission', gross: 36750, events: 6 },
      ];

      const payoutStatus = (period) => {
        if (period <= '2026-01') return 'paid';
        if (period === '2026-02') return 'paid';
        if (period === '2026-03') return 'approved';
        return 'accrued';
      };

      for (const c of commissionData) {
        const commAmount = Math.round(c.gross * 0.20);
        await Q(
          `INSERT INTO sathi_commission_ledger
             (intermediary_id, farmer_id, revenue_event_type, revenue_event_ref_id,
              gross_amount_paise, commission_rate, commission_amount_paise,
              accrual_period, payout_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0.2000, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              intermediaryId, farmerIds[c.farmer], c.type, c.events,
              c.gross * 100, commAmount * 100,
              c.period, payoutStatus(c.period), now, now,
            ],
          }
        );
      }
    }

    // ─── 7. Issue flags (3 issues) ──────────────────────────────────
    const [[existingIssue]] = await Q(
      `SELECT id FROM sathi_issue_flags WHERE intermediary_id = ? LIMIT 1`,
      { replacements: [intermediaryId] }
    );
    if (!existingIssue) {
      const issues = [
        { farmer: 4, type: 'loan_delinquent', severity: 'critical', status: 'open', desc: '3 EMIs overdue, crop failure reported. Needs banker restructuring.', days: 8 },
        { farmer: 2, type: 'document_dispute', severity: 'high', status: 'open', desc: 'Aadhaar address mismatch with farm location. Re-verification required.', days: 5 },
        { farmer: 0, type: 'grievance', severity: 'low', status: 'resolved', desc: 'Pesticide quality suspect from local dealer. Lab report confirms OK.', days: 25 },
      ];
      for (const iss of issues) {
        const openedAt = new Date(now.getTime() - iss.days * 86400000);
        await Q(
          `INSERT INTO sathi_issue_flags
             (intermediary_id, farmer_id, issue_type, severity,
              description, status, opened_at,
              ${iss.status === 'resolved' ? 'resolved_at, resolution_notes,' : ''}
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?,
              ${iss.status === 'resolved' ? '?, ?,' : ''}
              ?, ?)`,
          {
            replacements: [
              intermediaryId, farmerIds[iss.farmer], iss.type, iss.severity,
              iss.desc, iss.status, openedAt,
              ...(iss.status === 'resolved' ? [now, 'Lab report cleared. Closed.'] : []),
              now, now,
            ],
          }
        );
      }
    }

    // ─── 8. Nudges (6 nudges, 3 with action taken) ─────────────────
    const [[existingNudge]] = await Q(
      `SELECT id FROM sathi_nudges WHERE intermediary_id = ? LIMIT 1`,
      { replacements: [intermediaryId] }
    );
    if (!existingNudge) {
      const nudges = [
        { farmer: 4, type: 'repayment_due', channel: 'sms', daysAgo: 1, actionTaken: false },
        { farmer: 2, type: 'repayment_due', channel: 'whatsapp', daysAgo: 2, actionTaken: true },
        { farmer: 1, type: 'policy_renewal', channel: 'sms', daysAgo: 3, actionTaken: true },
        { farmer: 0, type: 'kyc_refresh', channel: 'push', daysAgo: 4, actionTaken: false },
        { farmer: 3, type: 'subsidy_claim', channel: 'ivr', daysAgo: 5, actionTaken: true },
        { farmer: 4, type: 'repayment_due', channel: 'whatsapp', daysAgo: 6, actionTaken: false },
      ];
      for (const n of nudges) {
        const sentAt = new Date(now.getTime() - n.daysAgo * 86400000);
        await Q(
          `INSERT INTO sathi_nudges
             (intermediary_id, farmer_id, nudge_type, channel,
              sent_at, delivered_at, acknowledged_at, linked_action_taken_at,
              status, created_at, updated_at)
           VALUES (?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?)`,
          {
            replacements: [
              intermediaryId, farmerIds[n.farmer], n.type, n.channel,
              sentAt, sentAt, n.actionTaken ? sentAt : null, n.actionTaken ? sentAt : null,
              n.actionTaken ? 'acknowledged' : 'delivered',
              now, now,
            ],
          }
        );
      }
    }

    console.log(`[sathi-seed] Done. Sathi=${SATHI_NAME} (${SATHI_MOBILE}), intermediary_id=${intermediaryId}, ${farmerIds.length} farmers seeded.`);
    console.log(`[sathi-seed] Login: mobile=${SATHI_MOBILE} mpin=${SATHI_MPIN}`);
  },

  async down(queryInterface) {
    const Q = queryInterface.sequelize.query.bind(queryInterface.sequelize);
    const [[row]] = await Q(`SELECT id FROM intermediaries WHERE mobile = ? LIMIT 1`, { replacements: [SATHI_MOBILE] });
    if (!row) return;
    const id = row.id;
    await Q(`DELETE FROM sathi_nudges WHERE intermediary_id = ?`, { replacements: [id] });
    await Q(`DELETE FROM sathi_issue_flags WHERE intermediary_id = ?`, { replacements: [id] });
    await Q(`DELETE FROM sathi_beneficiaries WHERE intermediary_id = ?`, { replacements: [id] });
    await Q(`DELETE FROM sathi_commission_ledger WHERE intermediary_id = ?`, { replacements: [id] });
    await Q(`DELETE FROM sathi_incentive_ledger WHERE intermediary_id = ?`, { replacements: [id] });
    await Q(`DELETE FROM intermediary_assignments WHERE intermediary_id = ?`, { replacements: [id] });
    await Q(`DELETE FROM intermediaries WHERE id = ?`, { replacements: [id] });
    // Clean up demo users
    for (const f of DEMO_FARMERS) {
      await Q(`DELETE FROM users WHERE mobile = ?`, { replacements: [f.mobile] }).catch(() => {});
    }
    await Q(`DELETE FROM users WHERE mobile = ?`, { replacements: [SATHI_MOBILE] }).catch(() => {});
  },
};
