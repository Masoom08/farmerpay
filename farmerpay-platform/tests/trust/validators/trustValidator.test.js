/**
 * TRUST v2 Joi validator tests.
 * Each schema: happy path + 3 failure modes.
 */

const { v4: uuidv4 } = require('uuid');
const {
  getSnapshotParams,
  recomputeParams,
  recomputeBody,
  createDecisionBody,
  portfolioQuery,
  exportPdfBody,
  sathiTasksQuery,
  submitTaskParams,
  submitTaskBody,
  requestDataParams,
  requestDataBody,
} = require('../../../src/modules/trust/validators/trustValidator');

// ─── Helpers ────────────────────────────────────────────────────
const ok = (schema, value) => {
  const { error } = schema.validate(value);
  expect(error).toBeUndefined();
};
const fail = (schema, value, pathOrMsg) => {
  const { error } = schema.validate(value);
  expect(error).toBeDefined();
  if (pathOrMsg) {
    const msg = error.details.map(d => d.message).join('; ');
    expect(msg).toMatch(pathOrMsg);
  }
};

// ─── 1. getSnapshotParams ───────────────────────────────────────
describe('getSnapshotParams', () => {
  test('happy: valid farmerId', () => ok(getSnapshotParams, { farmerId: 42 }));
  test('fail: missing farmerId', () => fail(getSnapshotParams, {}));
  test('fail: negative farmerId', () => fail(getSnapshotParams, { farmerId: -1 }));
  test('fail: non-integer farmerId', () => fail(getSnapshotParams, { farmerId: 'abc' }));
});

// ─── 2. recomputeParams + recomputeBody ─────────────────────────
describe('recomputeParams', () => {
  test('happy: valid farmerId', () => ok(recomputeParams, { farmerId: 1 }));
  test('fail: missing farmerId', () => fail(recomputeParams, {}));
  test('fail: zero farmerId', () => fail(recomputeParams, { farmerId: 0 }));
  test('fail: string farmerId', () => fail(recomputeParams, { farmerId: 'x' }));
});

describe('recomputeBody', () => {
  test('happy: with reason', () => ok(recomputeBody, { reason: 'Re-evaluate after CIBIL update' }));
  test('happy: empty body', () => ok(recomputeBody, {}));
  test('fail: reason too long', () => fail(recomputeBody, { reason: 'x'.repeat(201) }));
});

// ─── 3. createDecisionBody ──────────────────────────────────────
describe('createDecisionBody', () => {
  const validSanction = { snapshotUuid: uuidv4(), decision: 'SANCTION' };
  const validReject = {
    snapshotUuid: uuidv4(),
    decision: 'REJECT',
    reasonCode: 'BELOW_THRESHOLD',
    reasonText: 'The farmer score is below sanctioning threshold per policy guidelines.',
  };

  test('happy: SANCTION (no reason needed)', () => ok(createDecisionBody, validSanction));
  test('happy: RECONSIDER', () => ok(createDecisionBody, { snapshotUuid: uuidv4(), decision: 'RECONSIDER' }));
  test('happy: REJECT with reason', () => ok(createDecisionBody, validReject));

  test('fail: missing snapshotUuid', () => fail(createDecisionBody, { decision: 'SANCTION' }));
  test('fail: snapshotUuid not a UUID', () => fail(createDecisionBody, { snapshotUuid: 'not-a-uuid', decision: 'SANCTION' }));
  test('fail: invalid decision enum', () => fail(createDecisionBody, { snapshotUuid: uuidv4(), decision: 'APPROVE' }));
  test('fail: REJECT without reasonCode', () => {
    const { error } = createDecisionBody.validate({ snapshotUuid: uuidv4(), decision: 'REJECT', reasonText: 'x'.repeat(40) });
    expect(error).toBeDefined();
  });
  test('fail: REJECT without reasonText', () => {
    const { error } = createDecisionBody.validate({ snapshotUuid: uuidv4(), decision: 'REJECT', reasonCode: 'OTHER' });
    expect(error).toBeDefined();
  });
  test('fail: REJECT reasonText too short (<40)', () => {
    fail(createDecisionBody, { snapshotUuid: uuidv4(), decision: 'REJECT', reasonCode: 'OTHER', reasonText: 'Too short' });
  });
});

// ─── 4. portfolioQuery ──────────────────────────────────────────
describe('portfolioQuery', () => {
  test('happy: all filters', () => ok(portfolioQuery, {
    productId: 1, village: 'Nagpur', scoreBand: 'SANCTION', decision: 'SANCTION',
    crop: 'soybean', maxDataAgeDays: 30, page: 1, limit: 25,
  }));
  test('happy: empty query', () => ok(portfolioQuery, {}));
  test('fail: maxDataAgeDays > 365', () => fail(portfolioQuery, { maxDataAgeDays: 400 }));
  test('fail: invalid scoreBand', () => fail(portfolioQuery, { scoreBand: 'EXCELLENT' }));
  test('fail: limit > 100', () => fail(portfolioQuery, { limit: 200 }));
});

// ─── 5. exportPdfBody ───────────────────────────────────────────
describe('exportPdfBody', () => {
  test('happy: valid UUID', () => ok(exportPdfBody, { snapshotUuid: uuidv4() }));
  test('fail: missing snapshotUuid', () => fail(exportPdfBody, {}));
  test('fail: non-UUID string', () => fail(exportPdfBody, { snapshotUuid: '12345' }));
  test('fail: number instead of UUID', () => fail(exportPdfBody, { snapshotUuid: 999 }));
});

// ─── 6. sathiTasksQuery ────────────────────────────────────────
describe('sathiTasksQuery', () => {
  test('happy: all filters', () => ok(sathiTasksQuery, {
    status: 'OPEN', village: 'Wardha', taskType: 'VERIFY_LAND', dueBefore: '2026-05-01',
  }));
  test('happy: empty query', () => ok(sathiTasksQuery, {}));
  test('fail: invalid status', () => fail(sathiTasksQuery, { status: 'PENDING' }));
  test('fail: invalid taskType', () => fail(sathiTasksQuery, { taskType: 'UNKNOWN' }));
  test('fail: dueBefore not ISO date', () => fail(sathiTasksQuery, { dueBefore: 'next-week' }));
});

// ─── 7. submitTaskParams + submitTaskBody ───────────────────────
describe('submitTaskParams', () => {
  test('happy: valid taskId', () => ok(submitTaskParams, { taskId: 77 }));
  test('fail: missing taskId', () => fail(submitTaskParams, {}));
  test('fail: negative taskId', () => fail(submitTaskParams, { taskId: -5 }));
  test('fail: string taskId', () => fail(submitTaskParams, { taskId: 'abc' }));
});

describe('submitTaskBody', () => {
  test('happy: answers + geotag', () => ok(submitTaskBody, {
    answers: { q1: 'yes', q2: 42 },
    photoRef: 's3://bucket/photo.jpg',
    geotag: { lat: 20.123, lng: 79.456 },
  }));
  test('happy: answers only', () => ok(submitTaskBody, { answers: { q1: true } }));
  test('fail: missing answers', () => fail(submitTaskBody, {}));
  test('fail: geotag missing lng', () => fail(submitTaskBody, { answers: {}, geotag: { lat: 20 } }));
  test('fail: lat out of range', () => fail(submitTaskBody, { answers: {}, geotag: { lat: 100, lng: 0 } }));
});

// ─── 8. requestDataParams + requestDataBody ─────────────────────
describe('requestDataParams', () => {
  test('happy: valid farmerId', () => ok(requestDataParams, { farmerId: 10 }));
  test('fail: missing farmerId', () => fail(requestDataParams, {}));
  test('fail: float farmerId', () => fail(requestDataParams, { farmerId: 1.5 }));
  test('fail: negative farmerId', () => fail(requestDataParams, { farmerId: -3 }));
});

describe('requestDataBody', () => {
  test('happy: single pillar', () => ok(requestDataBody, { missingPillars: ['P1'] }));
  test('happy: all 6 pillars', () => ok(requestDataBody, { missingPillars: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] }));
  test('fail: empty array', () => fail(requestDataBody, { missingPillars: [] }));
  test('fail: P7 rejected', () => fail(requestDataBody, { missingPillars: ['P7'] }));
  test('fail: missing field', () => fail(requestDataBody, {}));
  test('accepts exactly P1-P6 and rejects P7', () => {
    // Verify each valid code passes individually
    ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].forEach(code => {
      ok(requestDataBody, { missingPillars: [code] });
    });
    // P7, P0, random strings must fail
    ['P7', 'P0', 'PERSONAL', ''].forEach(bad => {
      fail(requestDataBody, { missingPillars: [bad] });
    });
  });
});
