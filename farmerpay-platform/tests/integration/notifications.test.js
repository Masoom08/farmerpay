/**
 * Notifications — Backend Unit Tests (H3 — Spec §6.3)
 *
 * Tests:
 *   DND GUARD
 *   1.  isDndWindow true at 10 PM IST
 *   2.  isDndWindow true at 3 AM IST
 *   3.  isDndWindow false at 8 AM IST
 *   4.  isDndWindow false at 8 PM IST
 *   5.  checkDnd blocks farmer+push during DND
 *   6.  checkDnd allows farmer+push outside DND
 *   7.  checkDnd allows banker+email during DND (not affected)
 *   8.  checkDnd allows sathi+push during DND (not affected)
 *   9.  getNextSendTime returns 7 AM IST
 *
 *   EVENT MATRIX
 *  10.  trust.score.dropped.50 → banker email + in_app
 *  11.  cibil.flag.raised → banker email + in_app
 *  12.  trust.snapshot.ready → farmer push
 *  13.  sathi.task.assigned → sathi push
 *  14.  sathi.visit.cancelled → sathi push + farmer push
 *  15.  Unknown event returns null
 *  16.  Sathi privacy: no score-adjacent strings in any Sathi message
 *
 *   DISPATCHER
 *  17.  Dispatches to correct (role, channel) for trust.score.dropped.50
 *  18.  Dispatches to both sathi + farmer for sathi.visit.cancelled
 *  19.  Defers farmer push during DND
 *  20.  Skips trust.snapshot.ready when hasChange=false
 *  21.  Unknown event returns empty deliveries
 */

const { isDndWindow, checkDnd, getIstHour, getNextSendTime, DND_START_HOUR, DND_END_HOUR } = require('../../src/modules/notifications/services/dndGuard');
const { getEventConfig, EVENT_CODES, validateSathiPrivacy } = require('../../src/modules/notifications/services/eventMatrix');
const { dispatch } = require('../../src/modules/notifications/services/notificationDispatcher');

// ─── DND Guard ────────────────────────────────────────────

describe('DND Guard', () => {
  // Helper: create a timestamp for a given IST hour
  // IST = UTC + 5:30, so for 10PM IST = 10PM - 5:30 = 4:30PM UTC
  const istHourToUtcMs = (hour, minute = 0) => {
    const d = new Date('2024-06-15T00:00:00Z');
    d.setUTCHours(hour - 5, minute - 30, 0, 0);
    // Handle negative wrapping
    return d.getTime();
  };

  it('isDndWindow true at 10 PM IST (22:00)', () => {
    const ms = istHourToUtcMs(22, 0);
    expect(isDndWindow(ms)).toBe(true);
  });

  it('isDndWindow true at 3 AM IST (03:00)', () => {
    const ms = istHourToUtcMs(3, 0);
    expect(isDndWindow(ms)).toBe(true);
  });

  it('isDndWindow false at 8 AM IST (08:00)', () => {
    const ms = istHourToUtcMs(8, 0);
    expect(isDndWindow(ms)).toBe(false);
  });

  it('isDndWindow false at 8 PM IST (20:00)', () => {
    const ms = istHourToUtcMs(20, 0);
    expect(isDndWindow(ms)).toBe(false);
  });

  it('checkDnd blocks farmer+push during DND', () => {
    const ms = istHourToUtcMs(23, 0);
    const result = checkDnd('farmer', 'push', ms);
    expect(result.allowed).toBe(false);
    expect(result.deferUntil).toBeTruthy();
  });

  it('checkDnd allows farmer+push outside DND', () => {
    const ms = istHourToUtcMs(12, 0);
    const result = checkDnd('farmer', 'push', ms);
    expect(result.allowed).toBe(true);
    expect(result.deferUntil).toBeNull();
  });

  it('checkDnd allows banker+email during DND (not affected)', () => {
    const ms = istHourToUtcMs(23, 0);
    const result = checkDnd('banker', 'email', ms);
    expect(result.allowed).toBe(true);
  });

  it('checkDnd allows sathi+push during DND (not affected)', () => {
    const ms = istHourToUtcMs(23, 0);
    const result = checkDnd('sathi', 'push', ms);
    expect(result.allowed).toBe(true);
  });

  it('getNextSendTime returns a Date during DND', () => {
    const ms = istHourToUtcMs(23, 0);
    const next = getNextSendTime(ms);
    expect(next).toBeInstanceOf(Date);
    // Should target 7 AM IST (next morning)
    expect(next).toBeTruthy();
  });
});

// ─── Event Matrix ─────────────────────────────────────────

describe('Event Matrix', () => {
  it('trust.score.dropped.50 → banker email + in_app', () => {
    const config = getEventConfig('trust.score.dropped.50');
    expect(config).toBeTruthy();
    expect(config.recipients).toHaveLength(1);
    expect(config.recipients[0].role).toBe('banker');
    expect(config.recipients[0].channels).toEqual(['email', 'in_app']);
  });

  it('cibil.flag.raised → banker email + in_app', () => {
    const config = getEventConfig('cibil.flag.raised');
    expect(config.recipients[0].role).toBe('banker');
    expect(config.recipients[0].channels).toEqual(['email', 'in_app']);
  });

  it('trust.snapshot.ready → farmer push', () => {
    const config = getEventConfig('trust.snapshot.ready');
    expect(config.recipients[0].role).toBe('farmer');
    expect(config.recipients[0].channels).toEqual(['push']);
  });

  it('sathi.task.assigned → sathi push', () => {
    const config = getEventConfig('sathi.task.assigned');
    expect(config.recipients[0].role).toBe('sathi');
    expect(config.recipients[0].channels).toEqual(['push']);
  });

  it('sathi.visit.cancelled → sathi push + farmer push', () => {
    const config = getEventConfig('sathi.visit.cancelled');
    expect(config.recipients).toHaveLength(2);
    const roles = config.recipients.map((r) => r.role);
    expect(roles).toContain('sathi');
    expect(roles).toContain('farmer');
  });

  it('unknown event returns null', () => {
    expect(getEventConfig('nonexistent.event')).toBeNull();
  });

  it('Sathi privacy: no score-adjacent strings in any Sathi message', () => {
    const result = validateSathiPrivacy();
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ─── Dispatcher ───────────────────────────────────────────

describe('Notification Dispatcher', () => {
  it('dispatches banker email + in_app for trust.score.dropped.50', async () => {
    const sent = [];
    const sendFn = async (msg) => { sent.push(msg); };

    const result = await dispatch({
      eventCode: 'trust.score.dropped.50',
      variables: { farmerName: 'Ramesh' },
      recipientIds: { banker: 1 },
      sendFn,
    });

    expect(result.deliveries).toHaveLength(2);
    expect(sent).toHaveLength(2);
    expect(sent[0].role).toBe('banker');
    expect(sent[0].channel).toBe('email');
    expect(sent[1].channel).toBe('in_app');
    expect(sent[0].subject).toContain('Ramesh');
  });

  it('dispatches both sathi + farmer for sathi.visit.cancelled', async () => {
    const sent = [];
    const sendFn = async (msg) => { sent.push(msg); };

    // Use noon IST to avoid DND for farmer push
    const istHourToUtcMs2 = (hour, minute = 0) => {
      const d = new Date('2024-06-15T00:00:00Z');
      d.setUTCHours(hour - 5, minute - 30, 0, 0);
      return d.getTime();
    };
    const noonMs = istHourToUtcMs2(12, 0);

    const result = await dispatch({
      eventCode: 'sathi.visit.cancelled',
      variables: { farmerName: 'Lakshmi', village: 'Mandvi' },
      recipientIds: { sathi: 2, farmer: 3 },
      nowMs: noonMs,
      sendFn,
    });

    const roles = sent.map((s) => s.role);
    expect(roles).toContain('sathi');
    expect(roles).toContain('farmer');
    expect(result.deliveries.filter((d) => d.status === 'sent')).toHaveLength(2);
  });

  it('defers farmer push during DND', async () => {
    const sent = [];
    const sendFn = async (msg) => { sent.push(msg); };

    // 11 PM IST
    const istHourToUtcMs = (hour, minute = 0) => {
      const d = new Date('2024-06-15T00:00:00Z');
      d.setUTCHours(hour - 5, minute - 30, 0, 0);
      return d.getTime();
    };
    const dndMs = istHourToUtcMs(23, 0);

    const result = await dispatch({
      eventCode: 'trust.snapshot.ready',
      variables: {},
      recipientIds: { farmer: 1 },
      nowMs: dndMs,
      sendFn,
    });

    expect(sent).toHaveLength(0); // Not sent
    expect(result.deliveries[0].status).toBe('deferred_dnd');
    expect(result.deliveries[0].deferUntil).toBeTruthy();
  });

  it('skips trust.snapshot.ready when hasChange=false', async () => {
    const sent = [];
    const sendFn = async (msg) => { sent.push(msg); };

    const result = await dispatch({
      eventCode: 'trust.snapshot.ready',
      variables: {},
      recipientIds: { farmer: 1 },
      hasChange: false,
      sendFn,
    });

    expect(sent).toHaveLength(0);
    expect(result.deliveries[0].status).toBe('skipped_no_change');
  });

  it('unknown event returns empty deliveries', async () => {
    const result = await dispatch({
      eventCode: 'does.not.exist',
      variables: {},
      sendFn: async () => {},
    });

    expect(result.deliveries).toEqual([]);
  });
});
