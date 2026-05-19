/**
 * Push notification handler (mobile) — Unit Tests (H3 — Spec §6.3)
 *
 * Tests:
 *   1.  handleIncomingPush creates notification
 *   2.  handleIncomingPush assigns unique id
 *   3.  New notifications are unread by default
 *   4.  getNotifications returns most recent first
 *   5.  getUnreadCount counts only unread
 *   6.  markRead marks specific notification
 *   7.  markAllRead marks all notifications
 *   8.  subscribe receives new notifications
 *   9.  unsubscribe stops receiving
 *  10.  clearAll resets everything
 */

import {
  handleIncomingPush,
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  subscribe,
  clearAll,
} from "../pushHandler";

beforeEach(() => {
  clearAll();
});

describe("pushHandler", () => {
  it("handleIncomingPush creates notification", () => {
    const n = handleIncomingPush({
      eventCode: "sathi.visit.cancelled",
      subject: "Visit update",
      body: "Your visit has been cancelled.",
    });

    expect(n.id).toBeTruthy();
    expect(n.eventCode).toBe("sathi.visit.cancelled");
    expect(n.subject).toBe("Visit update");
    expect(n.body).toBe("Your visit has been cancelled.");
    expect(n.type).toBe("info");
  });

  it("handleIncomingPush assigns unique id", () => {
    const a = handleIncomingPush({ eventCode: "a", subject: "A", body: "a" });
    const b = handleIncomingPush({ eventCode: "b", subject: "B", body: "b" });
    expect(a.id).not.toBe(b.id);
  });

  it("new notifications are unread by default", () => {
    handleIncomingPush({ eventCode: "test", subject: "S", body: "B" });
    expect(getUnreadCount()).toBe(1);
  });

  it("getNotifications returns most recent first", () => {
    handleIncomingPush({ eventCode: "first", subject: "1", body: "1" });
    handleIncomingPush({ eventCode: "second", subject: "2", body: "2" });

    const all = getNotifications();
    expect(all[0].eventCode).toBe("second");
    expect(all[1].eventCode).toBe("first");
  });

  it("getUnreadCount counts only unread", () => {
    handleIncomingPush({ eventCode: "a", subject: "A", body: "" });
    const n = handleIncomingPush({ eventCode: "b", subject: "B", body: "" });
    markRead(n.id);

    expect(getUnreadCount()).toBe(1);
  });

  it("markRead marks specific notification", () => {
    const n = handleIncomingPush({ eventCode: "x", subject: "X", body: "" });
    markRead(n.id);

    const all = getNotifications();
    expect(all.find((x) => x.id === n.id)?.read).toBe(true);
  });

  it("markAllRead marks all notifications", () => {
    handleIncomingPush({ eventCode: "a", subject: "A", body: "" });
    handleIncomingPush({ eventCode: "b", subject: "B", body: "" });
    markAllRead();

    expect(getUnreadCount()).toBe(0);
  });

  it("subscribe receives new notifications", () => {
    const received: string[] = [];
    subscribe((n) => received.push(n.eventCode));

    handleIncomingPush({ eventCode: "test.event", subject: "T", body: "" });
    expect(received).toEqual(["test.event"]);
  });

  it("unsubscribe stops receiving", () => {
    const received: string[] = [];
    const unsub = subscribe((n) => received.push(n.eventCode));

    handleIncomingPush({ eventCode: "a", subject: "A", body: "" });
    unsub();
    handleIncomingPush({ eventCode: "b", subject: "B", body: "" });

    expect(received).toEqual(["a"]); // Only first
  });

  it("clearAll resets everything", () => {
    handleIncomingPush({ eventCode: "x", subject: "X", body: "" });
    clearAll();

    expect(getNotifications()).toEqual([]);
    expect(getUnreadCount()).toBe(0);
  });
});
