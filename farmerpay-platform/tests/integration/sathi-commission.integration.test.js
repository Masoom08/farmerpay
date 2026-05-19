/**
 * Sathi Commission Integration Tests
 *
 * Covers:
 *   1. recordRevenueEvent() credits 20% to the Sathi with the active assignment
 *   2. Idempotent on (event_type, ref_id) — double-firing does not double-book
 *   3. No active Sathi → ledger skipped, no errors
 *   4. Beneficiary first_product_activated_at set on the first product
 *   5. Incentive evaluator writes a row exactly once when count ≥ 100
 *   6. Totals in listCommissions match arithmetic: 20% * gross
 */

const { initApp, closeConnections, truncateTables } = require('../helpers/setup');
const { createTestUser } = require('../helpers/factories');

const commissionService = require('../../src/modules/choice/services/sathiCommissionService');
const incentiveService = require('../../src/modules/choice/services/sathiIncentiveService');

let db;
let sathiUser, sathiIntermediary, farmerUser;

beforeAll(async () => {
  await initApp();
  db = require('../../src/shared/models');

  // Sathi login user + intermediary row (user_id link)
  const s = await createTestUser({
    firstName: 'Sathi',
    lastName: 'One',
    mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
  });
  sathiUser = s.user;

  sathiIntermediary = await db.Intermediary.create({
    intermediary_uuid: `test-${Date.now()}`,
    name: 'Test Sathi One',
    mobile: `+91${Math.floor(9000000000 + Math.random() * 999999999)}`,
    type: 'bank_sakhi',
    user_id: sathiUser.id,
    services_offered: ['loan', 'insurance'],
    onboarding_kyc_status: 'verified',
    is_available: true,
    is_active: true,
  });

  // Farmer + active assignment to this Sathi
  const f = await createTestUser({
    firstName: 'Farmer',
    lastName: 'Beneficiary',
    mobile: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
  });
  farmerUser = f.user;

  await db.IntermediaryAssignment.create({
    assignment_uuid: `asg-${Date.now()}`,
    intermediary_id: sathiIntermediary.id,
    farmer_id: farmerUser.id,
    assigned_at: new Date(),
    assignment_status: 'active',
    selected_by_farmer: true,
    is_active: true,
  });
});

afterAll(async () => {
  await truncateTables([
    'sathi_nudges',
    'sathi_issue_flags',
    'sathi_incentive_ledger',
    'sathi_commission_ledger',
    'sathi_beneficiaries',
    'intermediary_assignments',
    'intermediaries',
    'users',
  ]);
  await closeConnections();
});

describe('Sathi commission accrual', () => {
  test('records 20% of gross revenue for a farmer with an active Sathi', async () => {
    const res = await commissionService.recordRevenueEvent({
      farmerId: farmerUser.id,
      eventType: 'loan_processing_fee',
      grossAmountPaise: 100000, // ₹1,000
      refId: 9001,
      productType: 'loan',
    });
    expect(res.skipped).toBe(false);
    expect(res.ledgerId).toBeTruthy();

    const row = await db.SathiCommissionLedger.findByPk(res.ledgerId);
    expect(Number(row.gross_amount_paise)).toBe(100000);
    expect(Number(row.commission_amount_paise)).toBe(20000); // exactly 20%
    expect(row.intermediary_id).toBe(sathiIntermediary.id);
    expect(row.payout_status).toBe('accrued');
  });

  test('is idempotent on (event_type, ref_id)', async () => {
    const res = await commissionService.recordRevenueEvent({
      farmerId: farmerUser.id,
      eventType: 'loan_processing_fee',
      grossAmountPaise: 100000,
      refId: 9001,
      productType: 'loan',
    });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('already_booked');
  });

  test('sets first_product_activated_at on the beneficiary row', async () => {
    const beneficiary = await db.SathiBeneficiary.findOne({
      where: {
        intermediary_id: sathiIntermediary.id,
        farmer_id: farmerUser.id,
      },
    });
    expect(beneficiary).toBeTruthy();
    expect(beneficiary.first_product_activated_at).toBeTruthy();
    expect(beneficiary.first_product_type).toBe('loan');
    expect(beneficiary.is_counted_for_incentive).toBe(true);
  });

  test('skips booking when farmer has no active Sathi assignment', async () => {
    const orphan = await createTestUser({
      firstName: 'Orphan',
      mobile: `96${Math.floor(10000000 + Math.random() * 90000000)}`,
    });
    const res = await commissionService.recordRevenueEvent({
      farmerId: orphan.user.id,
      eventType: 'loan_processing_fee',
      grossAmountPaise: 50000,
      refId: 9002,
      productType: 'loan',
    });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('no_active_sathi');
    expect(res.ledgerId).toBeNull();
  });

  test('listCommissions totals match 20% of gross across multiple events', async () => {
    const events = [
      { gross: 50000, ref: 9101 },
      { gross: 75000, ref: 9102 },
      { gross: 25000, ref: 9103 },
    ];
    for (const e of events) {
      await commissionService.recordRevenueEvent({
        farmerId: farmerUser.id,
        eventType: 'insurance_commission',
        grossAmountPaise: e.gross,
        refId: e.ref,
        productType: 'insurance',
      });
    }

    const totals = await commissionService.getTotals(sathiIntermediary.id);
    // 100k (loan) + 50k + 75k + 25k = 250k gross → 50k commission
    expect(totals.gross).toBe(250000);
    expect(totals.commission).toBe(50000);
  });
});

describe('Sathi incentive milestone', () => {
  test('does not create an incentive row below threshold', async () => {
    const r = await incentiveService.evaluateForIntermediary(sathiIntermediary.id);
    expect(r.crossed).toBe(false);
    expect(r.beneficiaryCount).toBeLessThan(incentiveService.MILESTONE_THRESHOLD);
  });

  test('creates exactly one row when threshold is crossed', async () => {
    // Bulk-create 100 counted beneficiaries in this quarter.
    const now = new Date();
    const rows = [];
    for (let i = 0; i < 100; i++) {
      const f = await createTestUser({
        firstName: 'Bulk',
        lastName: `F${i}`,
        mobile: `95${String(Date.now()).slice(-8)}${i.toString().padStart(2, '0')}`.slice(0, 10),
      });
      rows.push({
        intermediary_id: sathiIntermediary.id,
        farmer_id: f.user.id,
        first_product_activated_at: now,
        first_product_type: 'loan',
        is_counted_for_incentive: true,
        status: 'active',
      });
    }
    await db.SathiBeneficiary.bulkCreate(rows);

    const r1 = await incentiveService.evaluateForIntermediary(sathiIntermediary.id);
    expect(r1.crossed).toBe(true);
    expect(r1.existing).toBeFalsy();
    expect(r1.ledgerId).toBeTruthy();

    // Second call on the same period must be idempotent.
    const r2 = await incentiveService.evaluateForIntermediary(sathiIntermediary.id);
    expect(r2.crossed).toBe(true);
    expect(r2.existing).toBe(true);
    expect(r2.ledgerId).toBe(r1.ledgerId);

    const count = await db.SathiIncentiveLedger.count({
      where: { intermediary_id: sathiIntermediary.id },
    });
    expect(count).toBe(1);
  });
});
