/**
 * DND Guard — Do Not Disturb window for farmer push notifications (H3 — Spec §6.3).
 *
 * Farmer push notifications are blocked between 9 PM and 7 AM local time (IST).
 * If a notification falls within DND, it is deferred to 7 AM the next morning.
 *
 * DND applies ONLY to farmer push channel. Banker/Sathi and non-push channels
 * are always allowed.
 */

const DND_START_HOUR = 21; // 9 PM IST
const DND_END_HOUR = 7;   // 7 AM IST
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/**
 * Get current IST hour.
 * @param {number} [nowMs] - Optional epoch ms for testing.
 * @returns {number} Hour in IST (0-23).
 */
const getIstHour = (nowMs) => {
  const now = nowMs != null ? new Date(nowMs) : new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + IST_OFFSET_MS;
  return new Date(istMs).getHours();
};

/**
 * Check if the current time is within the DND window (9 PM - 7 AM IST).
 * @param {number} [nowMs] - Optional epoch ms for testing.
 * @returns {boolean} True if within DND window.
 */
const isDndWindow = (nowMs) => {
  const hour = getIstHour(nowMs);
  return hour >= DND_START_HOUR || hour < DND_END_HOUR;
};

/**
 * Get the next eligible send time (7 AM IST) if currently in DND.
 * @param {number} [nowMs] - Optional epoch ms for testing.
 * @returns {Date|null} Next send time, or null if not in DND.
 */
const getNextSendTime = (nowMs) => {
  if (!isDndWindow(nowMs)) return null;

  const now = nowMs != null ? new Date(nowMs) : new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + IST_OFFSET_MS;
  const istDate = new Date(istMs);

  // Set to 7 AM IST next day (or today if before midnight)
  const next = new Date(istDate);
  if (istDate.getHours() >= DND_START_HOUR) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(DND_END_HOUR, 0, 0, 0);

  // Convert back from IST to UTC
  const nextUtcMs = next.getTime() - IST_OFFSET_MS + now.getTimezoneOffset() * 60000;
  return new Date(nextUtcMs);
};

/**
 * Check if a notification should be sent or deferred.
 * @param {string} role - 'farmer' | 'banker' | 'sathi'
 * @param {string} channel - 'push' | 'email' | 'in_app' | 'sms'
 * @param {number} [nowMs] - Optional epoch ms for testing.
 * @returns {{ allowed: boolean, deferUntil: Date|null }}
 */
const checkDnd = (role, channel, nowMs) => {
  // DND only applies to farmer push notifications
  if (role !== 'farmer' || channel !== 'push') {
    return { allowed: true, deferUntil: null };
  }

  if (isDndWindow(nowMs)) {
    return { allowed: false, deferUntil: getNextSendTime(nowMs) };
  }

  return { allowed: true, deferUntil: null };
};

module.exports = {
  isDndWindow,
  getIstHour,
  getNextSendTime,
  checkDnd,
  DND_START_HOUR,
  DND_END_HOUR,
};
