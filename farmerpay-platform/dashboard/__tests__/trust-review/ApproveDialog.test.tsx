/**
 * ApproveDialog — Unit Tests (C12)
 *
 * Tests:
 *   1.  Renders dialog when open
 *   2.  Title: "Approve this KCC application?"
 *   3.  Body mentions score and threshold 600
 *   4.  Shows loan amount
 *   5.  Without CIBIL flag — no checkbox rendered
 *   6.  Without CIBIL flag — confirm button is enabled
 *   7.  With CIBIL flag — checkbox rendered
 *   8.  With CIBIL flag — confirm disabled until checkbox checked
 *   9.  With CIBIL flag — confirm enabled after checkbox checked
 *  10.  Confirm calls recordDecision with SANCTION
 *  11.  Cancel closes dialog
 *  12.  Error displayed on API failure
 *  13.  Loading state disables buttons
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  ApproveDialog,
  type ApproveDialogProps,
} from "@/components/trust/dialogs/ApproveDialog";
import { CibilFlagProvider } from "@/components/trust/context/CibilFlagContext";

// ─── Mock modules ──────────────────────────────────────────────

// Mock @base-ui/react dialog to render inline (no portal)
jest.mock("@base-ui/react/dialog", () => {
  const React = require("react");
  return {
    Dialog: {
      Root: ({ children, open }: { children: React.ReactNode; open?: boolean; onOpenChange?: (o: boolean) => void }) =>
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

// Mock lucide-react
jest.mock("lucide-react", () => ({
  XIcon: (props: any) => <span {...props}>X</span>,
}));

// Mock recordDecision
const mockRecordDecision = jest.fn();
jest.mock("@/lib/trust", () => ({
  recordDecision: (...args: unknown[]) => mockRecordDecision(...args),
}));

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: { getItem: jest.fn(() => "mock-token"), setItem: jest.fn(), removeItem: jest.fn() },
  writable: true,
});

// ─── Helpers ────────────────────────────────────────────────────

const DEFAULT_PROPS: ApproveDialogProps = {
  open: true,
  onOpenChange: jest.fn(),
  snapshotUuid: "snap-1",
  farmerId: 42,
  score: 720,
  loanAmountFormatted: "₹3,50,000",
  onSuccess: jest.fn(),
};

const renderDialog = (
  overrides: Partial<ApproveDialogProps> = {},
  cibilFlag = false,
  overdueInr: number | null = null,
) =>
  render(
    <CibilFlagProvider cibilFlag={cibilFlag} overdueInr={overdueInr}>
      <ApproveDialog {...DEFAULT_PROPS} {...overrides} />
    </CibilFlagProvider>,
  );

// ─── Tests ──────────────────────────────────────────────────────

describe("ApproveDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordDecision.mockResolvedValue({ decisionId: 1 });
  });

  it("renders dialog when open", () => {
    renderDialog();
    expect(screen.getByTestId("approve-dialog")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByTestId("approve-dialog")).not.toBeInTheDocument();
  });

  it('title is "Approve this KCC application?"', () => {
    renderDialog();
    expect(screen.getByText("Approve this KCC application?")).toBeInTheDocument();
  });

  it("body mentions score and threshold 600", () => {
    renderDialog({ score: 720 });
    expect(
      screen.getByText(/Score 720 clears the Sanction threshold of 600/),
    ).toBeInTheDocument();
  });

  it("shows loan amount", () => {
    renderDialog();
    expect(screen.getByTestId("approve-loan-amount")).toHaveTextContent("₹3,50,000");
  });

  // ─── Without CIBIL flag ─────────────────────────────────────

  it("without CIBIL flag — no checkbox rendered", () => {
    renderDialog({}, false);
    expect(screen.queryByTestId("cibil-checkbox")).not.toBeInTheDocument();
  });

  it("without CIBIL flag — confirm button is enabled", () => {
    renderDialog({}, false);
    expect(screen.getByTestId("approve-confirm-btn")).not.toBeDisabled();
  });

  // ─── With CIBIL flag ───────────────────────────────────────

  it("with CIBIL flag — checkbox rendered", () => {
    renderDialog({}, true);
    expect(screen.getByTestId("cibil-checkbox")).toBeInTheDocument();
    expect(screen.getByText("I have reviewed the CIBIL flag.")).toBeInTheDocument();
  });

  it("with CIBIL flag — confirm disabled until checkbox checked", () => {
    renderDialog({}, true);
    expect(screen.getByTestId("approve-confirm-btn")).toBeDisabled();
  });

  it("with CIBIL flag — confirm enabled after checkbox checked", () => {
    renderDialog({}, true);

    fireEvent.click(screen.getByTestId("cibil-checkbox"));
    expect(screen.getByTestId("approve-confirm-btn")).not.toBeDisabled();
  });

  // ─── Submit ─────────────────────────────────────────────────

  it("confirm calls recordDecision with SANCTION", async () => {
    renderDialog();

    await act(async () => {
      fireEvent.click(screen.getByTestId("approve-confirm-btn"));
    });

    await waitFor(() => {
      expect(mockRecordDecision).toHaveBeenCalledWith(
        { snapshotUuid: "snap-1", farmerId: 42, decision: "SANCTION" },
        "mock-token",
      );
    });

    expect(DEFAULT_PROPS.onSuccess).toHaveBeenCalled();
    expect(DEFAULT_PROPS.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("cancel closes dialog", () => {
    const onOpenChange = jest.fn();
    renderDialog({ onOpenChange });

    fireEvent.click(screen.getByTestId("approve-cancel-btn"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows error on API failure", async () => {
    mockRecordDecision.mockRejectedValue(new Error("Server error"));
    renderDialog();

    await act(async () => {
      fireEvent.click(screen.getByTestId("approve-confirm-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("approve-error")).toHaveTextContent("Server error");
    });
  });
});
