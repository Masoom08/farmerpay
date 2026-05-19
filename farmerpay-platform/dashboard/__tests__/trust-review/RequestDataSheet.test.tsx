/**
 * RequestDataSheet — Unit Tests (C12)
 *
 * Tests:
 *   1.  Renders sheet when open
 *   2.  Lists low-confidence pillars with checkboxes
 *   3.  Confidence badges (MEDIUM=blue, LOW=amber)
 *   4.  Submit disabled when nothing selected
 *   5.  Submit enabled after selecting a pillar
 *   6.  Submit posts selected pillar codes
 *   7.  Submit button shows selection count
 *   8.  Cancel closes sheet
 *   9.  Error displayed on API failure
 *  10.  Empty state when all pillars high confidence
 *  11.  Success callback receives toast message
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  RequestDataSheet,
  type RequestDataSheetProps,
  type LowConfidencePillar,
} from "@/components/trust/sheets/RequestDataSheet";

// ─── Mock base-ui dialog (Sheet uses the same primitive) ───────

jest.mock("@base-ui/react/dialog", () => {
  const React = require("react");
  return {
    Dialog: {
      Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
        open ? <div data-testid="sheet-root">{children}</div> : null,
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

// Mock apiPost
const mockApiPost = jest.fn();
jest.mock("@/lib/api", () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}));

Object.defineProperty(window, "localStorage", {
  value: { getItem: jest.fn(() => "mock-token"), setItem: jest.fn(), removeItem: jest.fn() },
  writable: true,
});

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_PILLARS: LowConfidencePillar[] = [
  { code: "P2", name: "Farm Details", confidence: "LOW", score: 35 },
  { code: "P4", name: "Repayment", confidence: "MEDIUM", score: 55 },
  { code: "P6", name: "Network", confidence: "LOW", score: 20 },
];

const DEFAULT_PROPS: RequestDataSheetProps = {
  open: true,
  onOpenChange: jest.fn(),
  farmerId: 42,
  pillars: MOCK_PILLARS,
  onSuccess: jest.fn(),
};

const renderSheet = (overrides: Partial<RequestDataSheetProps> = {}) =>
  render(<RequestDataSheet {...DEFAULT_PROPS} {...overrides} />);

// ─── Tests ──────────────────────────────────────────────────────

describe("RequestDataSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPost.mockResolvedValue({ data: { taskId: 1 } });
  });

  it("renders sheet when open", () => {
    renderSheet();
    expect(screen.getByTestId("request-data-sheet")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderSheet({ open: false });
    expect(screen.queryByTestId("request-data-sheet")).not.toBeInTheDocument();
  });

  it("lists pillars with checkboxes", () => {
    renderSheet();

    expect(screen.getByTestId("pillar-option-P2")).toBeInTheDocument();
    expect(screen.getByTestId("pillar-option-P4")).toBeInTheDocument();
    expect(screen.getByTestId("pillar-option-P6")).toBeInTheDocument();

    expect(screen.getByTestId("pillar-check-P2")).toBeInTheDocument();
  });

  it("shows pillar names and scores", () => {
    renderSheet();

    expect(screen.getByTestId("pillar-option-P2")).toHaveTextContent("Farm Details");
    expect(screen.getByTestId("pillar-option-P2")).toHaveTextContent("35/100");
  });

  it("confidence badges have correct styles (LOW=amber, MEDIUM=blue)", () => {
    renderSheet();

    const lowBadge = screen.getByTestId("confidence-P2");
    expect(lowBadge).toHaveTextContent("LOW");
    expect(lowBadge.className).toContain("bg-amber-100");

    const medBadge = screen.getByTestId("confidence-P4");
    expect(medBadge).toHaveTextContent("MEDIUM");
    expect(medBadge.className).toContain("bg-blue-100");
  });

  // ─── Submit validation ──────────────────────────────────────

  it("submit disabled when nothing selected", () => {
    renderSheet();
    expect(screen.getByTestId("request-submit-btn")).toBeDisabled();
  });

  it("submit enabled after selecting a pillar", () => {
    renderSheet();

    fireEvent.click(screen.getByTestId("pillar-check-P2"));
    expect(screen.getByTestId("request-submit-btn")).not.toBeDisabled();
  });

  it("submit button shows selection count", () => {
    renderSheet();

    fireEvent.click(screen.getByTestId("pillar-check-P2"));
    fireEvent.click(screen.getByTestId("pillar-check-P6"));

    expect(screen.getByTestId("request-submit-btn")).toHaveTextContent(
      "Create Sathi task (2)",
    );
  });

  // ─── Submit ─────────────────────────────────────────────────

  it("submit posts selected pillar codes", async () => {
    renderSheet();

    fireEvent.click(screen.getByTestId("pillar-check-P2"));
    fireEvent.click(screen.getByTestId("pillar-check-P6"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("request-submit-btn"));
    });

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        "/trust/farmer/42/request-data",
        { pillarCodes: expect.arrayContaining(["P2", "P6"]) },
        "mock-token",
      );
    });

    expect(DEFAULT_PROPS.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("success callback receives toast message", async () => {
    renderSheet();

    fireEvent.click(screen.getByTestId("pillar-check-P4"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("request-submit-btn"));
    });

    await waitFor(() => {
      expect(DEFAULT_PROPS.onSuccess).toHaveBeenCalledWith(
        "Sathi task created. Ramesh will get a visit scheduled.",
      );
    });
  });

  // ─── Cancel ─────────────────────────────────────────────────

  it("cancel closes sheet", () => {
    const onOpenChange = jest.fn();
    renderSheet({ onOpenChange });

    fireEvent.click(screen.getByTestId("request-cancel-btn"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ─── Error ──────────────────────────────────────────────────

  it("shows error on API failure", async () => {
    mockApiPost.mockRejectedValue(new Error("Timeout"));
    renderSheet();

    fireEvent.click(screen.getByTestId("pillar-check-P2"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("request-submit-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("request-error")).toHaveTextContent("Timeout");
    });
  });

  // ─── Empty state ────────────────────────────────────────────

  it("shows empty state when no pillars", () => {
    renderSheet({ pillars: [] });

    expect(screen.getByTestId("no-pillars")).toBeInTheDocument();
    expect(screen.getByTestId("no-pillars")).toHaveTextContent(
      "All pillars have high confidence.",
    );
  });
});
