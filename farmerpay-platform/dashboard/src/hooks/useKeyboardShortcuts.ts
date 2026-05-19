"use client";

import { useEffect, useCallback, useRef } from "react";

// ─── Types ──────────────────────────────────────────────────────

export interface KeyboardShortcutCallbacks {
  /** A → Approve / Sanction */
  onApprove?: () => void;
  /** R → Request more data */
  onRequestMore?: () => void;
  /** Shift+R → Reject */
  onReject?: () => void;
  /** 1–6 → Focus pillar card P1–P6 */
  onPillarFocus?: (pillarIndex: number) => void;
  /** Esc → Close any open dialog/sheet */
  onEscape?: () => void;
}

export interface UseKeyboardShortcutsOptions {
  /** Currently active tab ID */
  activeTab: string;
  /** Whether shortcuts are enabled (disable during loading etc.) */
  enabled?: boolean;
  /** Ref to an aria-live region for announcements */
  announceRef?: React.RefObject<HTMLElement | null>;
}

// ─── Helpers ────────────────────────────────────────────────────

/** Tags where we should NOT intercept single-key shortcuts */
const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (INPUT_TAGS.has(el.tagName)) return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"]') !== null;
}

function announce(ref: React.RefObject<HTMLElement | null> | undefined, message: string) {
  if (ref?.current) {
    ref.current.textContent = message;
  }
}

// ─── Hook ───────────────────────────────────────────────────────

/**
 * Registers keyboard shortcuts for the TRUST sanction review page.
 *
 * Shortcuts:
 *   A         → Approve (onApprove)
 *   R         → Request more data (onRequestMore)
 *   Shift+R   → Reject (onReject)
 *   1–6       → Focus pillar card P1–P6 (only when Pillars tab active)
 *   Esc       → Close dialog/sheet (onEscape)
 *
 * Suppression rules:
 *   - Single-key shortcuts (A, R, 1–6) suppressed when focus is inside input/textarea/select
 *   - All shortcuts except Esc suppressed when a role="dialog" is open
 *   - 1–6 only fires when activeTab === "pillars"
 */
export function useKeyboardShortcuts(
  callbacks: KeyboardShortcutCallbacks,
  options: UseKeyboardShortcutsOptions,
) {
  const { activeTab, enabled = true, announceRef } = options;

  // Store callbacks in refs to avoid re-registering on every render
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const key = e.key;

      // Esc always works (even in dialogs / inputs)
      if (key === "Escape") {
        cbRef.current.onEscape?.();
        return;
      }

      // Suppress all other shortcuts when a dialog is open
      if (isDialogOpen()) return;

      // Suppress single-key shortcuts when inside an input field
      if (isInputFocused()) return;

      // A → Approve
      if (key === "a" || key === "A") {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          announce(announceRef, "Approve dialog opened");
          cbRef.current.onApprove?.();
          return;
        }
      }

      // Shift+R → Reject  (must check before plain R)
      if ((key === "r" || key === "R") && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        announce(announceRef, "Reject dialog opened");
        cbRef.current.onReject?.();
        return;
      }

      // R → Request more data
      if ((key === "r" || key === "R") && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        announce(announceRef, "Request more data dialog opened");
        cbRef.current.onRequestMore?.();
        return;
      }

      // 1–6 → Focus pillar (only when Pillars tab is active)
      const digit = parseInt(key, 10);
      if (digit >= 1 && digit <= 6 && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (activeTabRef.current === "pillars") {
          e.preventDefault();
          cbRef.current.onPillarFocus?.(digit);
        }
        return;
      }
    },
    [enabled, announceRef],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

export default useKeyboardShortcuts;
