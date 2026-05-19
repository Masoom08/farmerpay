/**
 * FooterActions — Unit Tests (C12)
 *
 * Tests:
 *   1.  Renders sticky footer with 3 buttons (COMPLETE)
 *   2.  Approve button text includes loan amount
 *   3.  Reject button text: "Reject with reason"
 *   4.  Request button text: "Request more data"
 *   5.  INCOMPLETE snapshot: only "Request Sathi visit" shown
 *   6.  INCOMPLETE snapshot: Approve/Reject hidden
 *   7.  Approve button opens ApproveDialog
 *   8.  Reject button opens RejectDialog
 *   9.  Request button opens RequestDataSheet
 *  10.  Footer has role="toolbar" and aria-label
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FooterActions,
  type FooterActionsProps,
} from "@/components/trust/FooterActions";

// ─── Mock all child dialogs/sheets ─────────────────────────────

jest.mock("@/components/trust/dialogs/ApproveDialog", () => ({
  ApproveDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="approve-dialog-mock">ApproveDialog</div> : null,
}));

jest.mock("@/components/trust/dialogs/RejectDialog", () => ({
  RejectDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="reject-dialog-mock">RejectDialog</div> : null,
}));

jest.mock("@/components/trust/sheets/RequestDataSheet", () => ({
  RequestDataSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="request-sheet-mock">RequestDataSheet</div> : null,
}));

// ─── Test Data ──────────────────────────────────────────────────

const DEFAULT_PROPS: FooterActionsProps = {
  snapshotUuid: "snap-1",
  farmerId: 42,
  score: 720,
  loanAmountFormatted: "₹3,50,000",
  snapshotStatus: "COMPLETE",
  lowConfidencePillars: [
    { code: "P2", name: "Farm Details", confidence: "LOW", score: 35 },
  ],
  onActionComplete: jest.fn(),
};

const renderFooter = (overrides: Partial<FooterActionsProps> = {}) =>
  render(<FooterActions {...DEFAULT_PROPS} {...overrides} />);

// ─── Tests ──────────────────────────────────────────────────────

describe("FooterActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── COMPLETE snapshot ──────────────────────────────────────

  it("renders 3 action buttons for COMPLETE snapshot", () => {
    renderFooter();

    expect(screen.getByTestId("footer-approve-btn")).toBeInTheDocument();
    expect(screen.getByTestId("footer-reject-btn")).toBeInTheDocument();
    expect(screen.getByTestId("footer-request-btn")).toBeInTheDocument();
  });

  it("approve button includes loan amount", () => {
    renderFooter();

    expect(screen.getByTestId("footer-approve-btn")).toHaveTextContent(
      "Approve ₹3,50,000",
    );
  });

  it('reject button text: "Reject with reason"', () => {
    renderFooter();

    expect(screen.getByTestId("footer-reject-btn")).toHaveTextContent(
      "Reject with reason",
    );
  });

  it('request button text: "Request more data"', () => {
    renderFooter();

    expect(screen.getByTestId("footer-request-btn")).toHaveTextContent(
      "Request more data",
    );
  });

  // ─── INCOMPLETE snapshot ────────────────────────────────────

  it('INCOMPLETE snapshot: only "Request Sathi visit" shown', () => {
    renderFooter({ snapshotStatus: "INCOMPLETE" });

    expect(screen.getByTestId("footer-request-visit-btn")).toBeInTheDocument();
    expect(screen.getByTestId("footer-request-visit-btn")).toHaveTextContent(
      "Request Sathi visit",
    );
  });

  it("INCOMPLETE snapshot: Approve/Reject hidden", () => {
    renderFooter({ snapshotStatus: "INCOMPLETE" });

    expect(screen.queryByTestId("footer-approve-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("footer-reject-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("footer-request-btn")).not.toBeInTheDocument();
  });

  // ─── Dialog/Sheet opening ───────────────────────────────────

  it("approve button opens ApproveDialog", () => {
    renderFooter();

    expect(screen.queryByTestId("approve-dialog-mock")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("footer-approve-btn"));
    expect(screen.getByTestId("approve-dialog-mock")).toBeInTheDocument();
  });

  it("reject button opens RejectDialog", () => {
    renderFooter();

    expect(screen.queryByTestId("reject-dialog-mock")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("footer-reject-btn"));
    expect(screen.getByTestId("reject-dialog-mock")).toBeInTheDocument();
  });

  it("request button opens RequestDataSheet", () => {
    renderFooter();

    expect(screen.queryByTestId("request-sheet-mock")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("footer-request-btn"));
    expect(screen.getByTestId("request-sheet-mock")).toBeInTheDocument();
  });

  // ─── Accessibility ──────────────────────────────────────────

  it('footer has role="toolbar" and aria-label', () => {
    renderFooter();

    const footer = screen.getByTestId("footer-actions");
    expect(footer).toHaveAttribute("role", "toolbar");
    expect(footer).toHaveAttribute("aria-label", "Decision actions");
  });
});
