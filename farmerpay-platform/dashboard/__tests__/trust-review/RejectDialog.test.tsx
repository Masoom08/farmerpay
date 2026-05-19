/**
 * RejectDialog — Unit Tests (C12)
 *
 * Tests:
 *   1.  Renders dialog when open
 *   2.  Title: "Reject with reason"
 *   3.  Radio list shows all 5 reason codes
 *   4.  Submit disabled when no reason selected
 *   5.  Submit disabled when notes < 40 chars
 *   6.  Submit enabled at exactly 40 chars with reason selected
 *   7.  Character counter shows current/min count
 *   8.  Character counter shows "more needed" when below min
 *   9.  Submit calls recordDecision with REJECT
 *  10.  Cancel closes dialog
 *  11.  Error displayed on API failure
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  RejectDialog,
  type RejectDialogProps,
  REJECT_REASONS,
} from "@/components/trust/dialogs/RejectDialog";

// ─── Mock base-ui dialog ───────────────────────────────────────

jest.mock("@base-ui/react/dialog", () => {
  const React = require("react");
  return {
    Dialog: {
      Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
        open ? <div data-testid="dialog-root">{children}</div> : null,
      Trigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
      Close: ({ children, render, ...props }: any) => {
        if (render) return React.cloneElement(render, props, children);
        return <button {...props}>{children}</button>;
      },
      Portal: ({ children }: any) => <>{children}</>,
      Backdrop: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      Popup: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      Title: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
      Description: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    },
  };
});

jest.mock("lucide-react", () => ({
  XIcon: (props: any) => <span {...props}>X</span>,
}));

const mockRecordDecision = jest.fn();
jest.mock("@/lib/trust", () => ({
  recordDecision: (...args: unknown[]) => mockRecordDecision(...args),
}));

Object.defineProperty(window, "localStorage", {
  value: { getItem: jest.fn(() => "mock-token"), setItem: jest.fn(), removeItem: jest.fn() },
  writable: true,
});

// ─── Helpers ────────────────────────────────────────────────────

const DEFAULT_PROPS: RejectDialogProps = {
  open: true,
  onOpenChange: jest.fn(),
  snapshotUuid: "snap-1",
  farmerId: 42,
  onSuccess: jest.fn(),
};

const renderDialog = (overrides: Partial<RejectDialogProps> = {}) =>
  render(<RejectDialog {...DEFAULT_PROPS} {...overrides} />);

const FORTY_CHARS = "a".repeat(40);

// ─── Tests ──────────────────────────────────────────────────────

describe("RejectDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordDecision.mockResolvedValue({ decisionId: 2 });
  });

  it("renders dialog when open", () => {
    renderDialog();
    expect(screen.getByTestId("reject-dialog")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByTestId("reject-dialog")).not.toBeInTheDocument();
  });

  it('title is "Reject with reason"', () => {
    renderDialog();
    expect(screen.getByText("Reject with reason")).toBeInTheDocument();
  });

  // ─── Reason radios ─────────────────────────────────────────

  it("shows all 5 reason radio options", () => {
    renderDialog();

    REJECT_REASONS.forEach((r) => {
      expect(screen.getByTestId(`reason-${r.code}`)).toBeInTheDocument();
      expect(screen.getByText(r.label)).toBeInTheDocument();
    });
  });

  // ─── Submit validation ──────────────────────────────────────

  it("submit disabled when no reason selected", () => {
    renderDialog();
    expect(screen.getByTestId("reject-submit-btn")).toBeDisabled();
  });

  it("submit disabled when reason selected but notes < 40 chars", () => {
    renderDialog();

    fireEvent.click(screen.getByTestId("reason-SCORE_BELOW_THRESHOLD"));
    fireEvent.change(screen.getByTestId("reject-notes"), {
      target: { value: "Too short" },
    });

    expect(screen.getByTestId("reject-submit-btn")).toBeDisabled();
  });

  it("submit enabled at exactly 40 chars with reason selected", () => {
    renderDialog();

    fireEvent.click(screen.getByTestId("reason-ADVERSE_CIBIL"));
    fireEvent.change(screen.getByTestId("reject-notes"), {
      target: { value: FORTY_CHARS },
    });

    expect(screen.getByTestId("reject-submit-btn")).not.toBeDisabled();
  });

  // ─── Character counter ──────────────────────────────────────

  it("character counter shows current count", () => {
    renderDialog();

    fireEvent.change(screen.getByTestId("reject-notes"), {
      target: { value: "Hello world" },
    });

    const counter = screen.getByTestId("char-counter");
    expect(counter).toHaveTextContent("11/40 characters");
    expect(counter).toHaveTextContent("29 more needed");
  });

  it('character counter shows no "more needed" at 40+', () => {
    renderDialog();

    fireEvent.change(screen.getByTestId("reject-notes"), {
      target: { value: FORTY_CHARS + "extra" },
    });

    const counter = screen.getByTestId("char-counter");
    expect(counter).toHaveTextContent("45/40 characters");
    expect(counter.textContent).not.toContain("more needed");
  });

  // ─── Submit ─────────────────────────────────────────────────

  it("submit calls recordDecision with REJECT", async () => {
    renderDialog();

    fireEvent.click(screen.getByTestId("reason-POLICY_EXCEPTION"));
    fireEvent.change(screen.getByTestId("reject-notes"), {
      target: { value: FORTY_CHARS },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("reject-submit-btn"));
    });

    await waitFor(() => {
      expect(mockRecordDecision).toHaveBeenCalledWith(
        {
          snapshotUuid: "snap-1",
          farmerId: 42,
          decision: "REJECT",
          notes: `[POLICY_EXCEPTION] ${FORTY_CHARS}`,
        },
        "mock-token",
      );
    });

    expect(DEFAULT_PROPS.onSuccess).toHaveBeenCalled();
    expect(DEFAULT_PROPS.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("cancel closes dialog", () => {
    const onOpenChange = jest.fn();
    renderDialog({ onOpenChange });

    fireEvent.click(screen.getByTestId("reject-cancel-btn"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows error on API failure", async () => {
    mockRecordDecision.mockRejectedValue(new Error("Network error"));
    renderDialog();

    fireEvent.click(screen.getByTestId("reason-OTHER"));
    fireEvent.change(screen.getByTestId("reject-notes"), {
      target: { value: FORTY_CHARS },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("reject-submit-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("reject-error")).toHaveTextContent("Network error");
    });
  });
});
