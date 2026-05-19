"use client";

/**
 * NotificationBell — Sathi dashboard notification bell (H3 — Spec §6.3).
 *
 * Shows unread count badge. Clicking opens a dropdown with recent notifications.
 * Events: sathi.task.assigned, sathi.visit.cancelled.
 *
 * PRIVACY (§5.6): NEVER renders score-adjacent strings.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

export interface NotificationItem {
  id: string;
  subject: string;
  body: string;
  type: "alert" | "info" | "warning" | "success";
  readAt: string | null;
  createdAt: string;
}

export interface NotificationBellProps {
  notifications?: NotificationItem[];
  onNotificationClick?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export default function NotificationBell({
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <div className="relative" ref={ref} data-testid="notification-bell">
      <button
        type="button"
        className="relative rounded-md p-2 text-muted-foreground hover:bg-muted"
        onClick={toggle}
        aria-label="Notifications"
        data-testid="bell-button"
      >
        <svg
          className="size-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
            data-testid="bell-badge"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-popover shadow-lg"
          data-testid="bell-dropdown"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && onMarkAllRead && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={onMarkAllRead}
                data-testid="mark-all-read"
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto" data-testid="bell-list">
            {notifications.length === 0 ? (
              <li className="p-4 text-center text-sm text-muted-foreground" data-testid="bell-empty">
                No notifications
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={
                    "border-b border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted " +
                    (n.readAt ? "opacity-60" : "")
                  }
                  onClick={() => onNotificationClick?.(n.id)}
                  data-testid="bell-item"
                  data-read={n.readAt ? "true" : "false"}
                >
                  <div className="flex items-start gap-2">
                    {!n.readAt && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{n.subject}</span>
                      <span className="text-xs text-muted-foreground">{n.body}</span>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
