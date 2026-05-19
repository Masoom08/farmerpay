/**
 * NotificationBell (Sathi) — Unit Tests (H3 — Spec §6.3)
 *
 * Tests:
 *   1.  Renders bell button
 *   2.  Shows unread badge with count
 *   3.  No badge when all read
 *   4.  Badge shows 9+ for >9 unread
 *   5.  Click opens dropdown
 *   6.  Dropdown shows notification items
 *   7.  Empty state shown when no notifications
 *   8.  Mark all read button visible when unread exist
 *   9.  onNotificationClick fires with id
 *  10.  PRIVACY: no score-adjacent strings
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationBell, {
  type NotificationItem,
} from "../../src/components/NotificationBell";

const NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", subject: "New task assigned", body: "Visit Ramesh in Kheda", type: "info", readAt: null, createdAt: "2024-06-15" },
  { id: "n2", subject: "Visit cancelled", body: "Visit to Anita cancelled", type: "info", readAt: "2024-06-15", createdAt: "2024-06-14" },
];

describe("NotificationBell (Sathi)", () => {
  it("renders bell button", () => {
    render(<NotificationBell />);
    expect(screen.getByTestId("bell-button")).toBeTruthy();
  });

  it("shows unread badge with count", () => {
    render(<NotificationBell notifications={NOTIFICATIONS} />);
    expect(screen.getByTestId("bell-badge")).toHaveTextContent("1");
  });

  it("no badge when all read", () => {
    const allRead = NOTIFICATIONS.map((n) => ({ ...n, readAt: "2024-06-15" }));
    render(<NotificationBell notifications={allRead} />);
    expect(screen.queryByTestId("bell-badge")).toBeNull();
  });

  it("badge shows 9+ for >9 unread", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: "n" + i,
      subject: "Task " + i,
      body: "Body",
      type: "info" as const,
      readAt: null,
      createdAt: "2024-06-15",
    }));
    render(<NotificationBell notifications={many} />);
    expect(screen.getByTestId("bell-badge")).toHaveTextContent("9+");
  });

  it("click opens dropdown", () => {
    render(<NotificationBell notifications={NOTIFICATIONS} />);
    expect(screen.queryByTestId("bell-dropdown")).toBeNull();
    fireEvent.click(screen.getByTestId("bell-button"));
    expect(screen.getByTestId("bell-dropdown")).toBeTruthy();
  });

  it("dropdown shows notification items", () => {
    render(<NotificationBell notifications={NOTIFICATIONS} />);
    fireEvent.click(screen.getByTestId("bell-button"));
    expect(screen.getAllByTestId("bell-item")).toHaveLength(2);
  });

  it("empty state shown when no notifications", () => {
    render(<NotificationBell notifications={[]} />);
    fireEvent.click(screen.getByTestId("bell-button"));
    expect(screen.getByTestId("bell-empty")).toHaveTextContent("No notifications");
  });

  it("mark all read button visible when unread exist", () => {
    const onMarkAll = jest.fn();
    render(<NotificationBell notifications={NOTIFICATIONS} onMarkAllRead={onMarkAll} />);
    fireEvent.click(screen.getByTestId("bell-button"));
    expect(screen.getByTestId("mark-all-read")).toBeTruthy();
    fireEvent.click(screen.getByTestId("mark-all-read"));
    expect(onMarkAll).toHaveBeenCalled();
  });

  it("onNotificationClick fires with id", () => {
    const onClick = jest.fn();
    render(<NotificationBell notifications={NOTIFICATIONS} onNotificationClick={onClick} />);
    fireEvent.click(screen.getByTestId("bell-button"));
    fireEvent.click(screen.getAllByTestId("bell-item")[0]);
    expect(onClick).toHaveBeenCalledWith("n1");
  });

  it("PRIVACY: no score-adjacent strings", () => {
    render(<NotificationBell notifications={NOTIFICATIONS} />);
    fireEvent.click(screen.getByTestId("bell-button"));
    const text = (document.body.textContent || "").toLowerCase();
    expect(text).not.toContain("score");
    expect(text).not.toContain("trust score");
    expect(text).not.toContain("point lift");
  });
});
