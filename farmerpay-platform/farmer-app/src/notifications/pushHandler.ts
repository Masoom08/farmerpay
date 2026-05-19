/**
 * Push notification handler — Farmer app (H3 — Spec §6.3).
 *
 * Handles incoming push notifications for the farmer.
 * Events: trust.snapshot.ready, sathi.visit.cancelled.
 *
 * DND is enforced server-side (9PM–7AM IST). This module only handles display.
 * PRIVACY: Notification body never contains score values.
 */

// ─── Types ────────────────────────────────────────────────

export interface PushNotification {
  id: string;
  eventCode: string;
  subject: string;
  body: string;
  type: "alert" | "info" | "warning" | "success";
  receivedAt: number;
  read: boolean;
}

export type NotificationListener = (notification: PushNotification) => void;

// ─── In-memory store (lightweight, no persistence needed) ──

let _notifications: PushNotification[] = [];
let _listeners: NotificationListener[] = [];
let _idCounter = 0;

/**
 * Handle an incoming push payload (called by the push SDK callback).
 */
export function handleIncomingPush(payload: {
  eventCode: string;
  subject: string;
  body: string;
  type?: "alert" | "info" | "warning" | "success";
}): PushNotification {
  _idCounter++;
  const notification: PushNotification = {
    id: "pn-" + _idCounter,
    eventCode: payload.eventCode,
    subject: payload.subject,
    body: payload.body,
    type: payload.type ?? "info",
    receivedAt: Date.now(),
    read: false,
  };

  _notifications.unshift(notification);
  _listeners.forEach((fn) => fn(notification));

  return notification;
}

/**
 * Get all notifications (most recent first).
 */
export function getNotifications(): PushNotification[] {
  return [..._notifications];
}

/**
 * Get unread count.
 */
export function getUnreadCount(): number {
  return _notifications.filter((n) => !n.read).length;
}

/**
 * Mark a notification as read.
 */
export function markRead(id: string): void {
  const n = _notifications.find((x) => x.id === id);
  if (n) n.read = true;
}

/**
 * Mark all notifications as read.
 */
export function markAllRead(): void {
  _notifications.forEach((n) => { n.read = true; });
}

/**
 * Subscribe to new notifications.
 * Returns an unsubscribe function.
 */
export function subscribe(listener: NotificationListener): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((fn) => fn !== listener);
  };
}

/**
 * Clear all (for testing / logout).
 */
export function clearAll(): void {
  _notifications = [];
  _listeners = [];
  _idCounter = 0;
}
