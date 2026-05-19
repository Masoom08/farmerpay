/**
 * useKeyboardShortcuts — Unit Tests (C7)
 *
 * Tests:
 *   1. A on body → onApprove fires
 *   2. A in textarea → onApprove does NOT fire
 *   3. R on body → onRequestMore fires
 *   4. Shift+R on body → onReject fires
 *   5. 1–6 on Pillars tab → onPillarFocus fires with correct index
 *   6. 1 on Evidence tab → no-op
 *   7. Esc → onEscape fires (even in dialog)
 *   8. A suppressed when role="dialog" is present
 *   9. A in input → suppressed
 *  10. Disabled → nothing fires
 *  11. Announce ref gets text on A
 */

import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// ─── Helpers ────────────────────────────────────────────────────

function fireKey(
  key: string,
  options: Partial<KeyboardEventInit> = {},
  target: EventTarget = document,
) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
}

function addDialog() {
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("data-testid", "mock-dialog");
  document.body.appendChild(dialog);
  return dialog;
}

function removeDialog() {
  const el = document.querySelector('[data-testid="mock-dialog"]');
  if (el) document.body.removeChild(el);
}

function addTextarea(): HTMLTextAreaElement {
  const ta = document.createElement("textarea");
  ta.setAttribute("data-testid", "mock-textarea");
  document.body.appendChild(ta);
  ta.focus();
  return ta;
}

function addInput(): HTMLInputElement {
  const inp = document.createElement("input");
  inp.setAttribute("data-testid", "mock-input");
  document.body.appendChild(inp);
  inp.focus();
  return inp;
}

function removeInputs() {
  document.querySelectorAll('[data-testid^="mock-"]').forEach((el) => el.remove());
}

// ─── Setup / Teardown ───────────────────────────────────────────

afterEach(() => {
  removeDialog();
  removeInputs();
  // Reset focus to body
  (document.body as HTMLElement).focus();
});

// ─── Tests ──────────────────────────────────────────────────────

describe("useKeyboardShortcuts", () => {
  // ─── A → Approve ────────────────────────────────────────────

  it("A on body fires onApprove", () => {
    const onApprove = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onApprove }, { activeTab: "pillars" }),
    );

    fireKey("a");
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("A in textarea does NOT fire onApprove", () => {
    const onApprove = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onApprove }, { activeTab: "pillars" }),
    );

    addTextarea();
    fireKey("a");
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("A in input does NOT fire onApprove", () => {
    const onApprove = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onApprove }, { activeTab: "pillars" }),
    );

    addInput();
    fireKey("a");
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("A suppressed when dialog is open", () => {
    const onApprove = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onApprove }, { activeTab: "pillars" }),
    );

    addDialog();
    fireKey("a");
    expect(onApprove).not.toHaveBeenCalled();
  });

  // ─── R → Request more ──────────────────────────────────────

  it("R on body fires onRequestMore", () => {
    const onRequestMore = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onRequestMore }, { activeTab: "pillars" }),
    );

    fireKey("r");
    expect(onRequestMore).toHaveBeenCalledTimes(1);
  });

  // ─── Shift+R → Reject ──────────────────────────────────────

  it("Shift+R on body fires onReject", () => {
    const onReject = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onReject }, { activeTab: "pillars" }),
    );

    fireKey("R", { shiftKey: true });
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("Shift+R does NOT fire onRequestMore", () => {
    const onRequestMore = jest.fn();
    const onReject = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts(
        { onRequestMore, onReject },
        { activeTab: "pillars" },
      ),
    );

    fireKey("R", { shiftKey: true });
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onRequestMore).not.toHaveBeenCalled();
  });

  // ─── 1–6 → Pillar focus ────────────────────────────────────

  it("1 on Pillars tab fires onPillarFocus(1)", () => {
    const onPillarFocus = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onPillarFocus }, { activeTab: "pillars" }),
    );

    fireKey("1");
    expect(onPillarFocus).toHaveBeenCalledWith(1);
  });

  it("6 on Pillars tab fires onPillarFocus(6)", () => {
    const onPillarFocus = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onPillarFocus }, { activeTab: "pillars" }),
    );

    fireKey("6");
    expect(onPillarFocus).toHaveBeenCalledWith(6);
  });

  it("3 on Pillars tab fires onPillarFocus(3)", () => {
    const onPillarFocus = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onPillarFocus }, { activeTab: "pillars" }),
    );

    fireKey("3");
    expect(onPillarFocus).toHaveBeenCalledWith(3);
  });

  it("1 on Evidence tab does NOT fire onPillarFocus", () => {
    const onPillarFocus = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onPillarFocus }, { activeTab: "evidence" }),
    );

    fireKey("1");
    expect(onPillarFocus).not.toHaveBeenCalled();
  });

  it("1 on audit-trail tab does NOT fire onPillarFocus", () => {
    const onPillarFocus = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts(
        { onPillarFocus },
        { activeTab: "audit-trail" },
      ),
    );

    fireKey("1");
    expect(onPillarFocus).not.toHaveBeenCalled();
  });

  it("7 does not fire onPillarFocus (out of range)", () => {
    const onPillarFocus = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onPillarFocus }, { activeTab: "pillars" }),
    );

    fireKey("7");
    expect(onPillarFocus).not.toHaveBeenCalled();
  });

  // ─── Esc → Close ───────────────────────────────────────────

  it("Esc fires onEscape", () => {
    const onEscape = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onEscape }, { activeTab: "pillars" }),
    );

    fireKey("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("Esc fires even when dialog is open", () => {
    const onEscape = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onEscape }, { activeTab: "pillars" }),
    );

    addDialog();
    fireKey("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("Esc fires even when focus is in textarea", () => {
    const onEscape = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ onEscape }, { activeTab: "pillars" }),
    );

    addTextarea();
    fireKey("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  // ─── Disabled ───────────────────────────────────────────────

  it("nothing fires when enabled=false", () => {
    const onApprove = jest.fn();
    const onReject = jest.fn();
    const onEscape = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts(
        { onApprove, onReject, onEscape },
        { activeTab: "pillars", enabled: false },
      ),
    );

    fireKey("a");
    fireKey("R", { shiftKey: true });
    fireKey("Escape");
    expect(onApprove).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
    expect(onEscape).not.toHaveBeenCalled();
  });

  // ─── Announce ref ───────────────────────────────────────────

  it("sets announce text on A shortcut", () => {
    const onApprove = jest.fn();
    const announceEl = document.createElement("div");
    const announceRef = { current: announceEl };

    renderHook(() =>
      useKeyboardShortcuts(
        { onApprove },
        { activeTab: "pillars", announceRef },
      ),
    );

    fireKey("a");
    expect(announceEl.textContent).toBe("Approve dialog opened");
  });

  it("sets announce text on Shift+R shortcut", () => {
    const onReject = jest.fn();
    const announceEl = document.createElement("div");
    const announceRef = { current: announceEl };

    renderHook(() =>
      useKeyboardShortcuts(
        { onReject },
        { activeTab: "pillars", announceRef },
      ),
    );

    fireKey("R", { shiftKey: true });
    expect(announceEl.textContent).toBe("Reject dialog opened");
  });
});
