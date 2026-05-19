/**
 * FarmerQuickView — Unit Tests (D4)
 *
 * Tests:
 *   1.  Panel renders (slide-in position)
 *   2.  Hidden (translate-x-full) when farmerId is null
 *   3.  Visible (translate-x-0) when farmerId is set
 *   4.  Shows loading skeleton while fetching
 *   5.  Shows farmer name + village after load
 *   6.  Shows score and decision badge
 *   7.  Shows mini pillar chart with 6 bars
 *   8.  "Open full review" button fires onOpenFull
 *   9.  Esc closes panel (fires onClose)
 *  10.  Close button fires onClose
 *  11.  Error state shows error message
 *  12.  Computed date displayed
 *  13.  aria-label on panel
 *  14.  aria-hidden when closed
 *
 *  MINI PILLAR CHART
 *  15.  Renders 6 bars
 *  16.  Bar width reflects score %
 *  17.  Empty state message
 *  18.  Pillar codes as labels
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  FarmerQuickView,
  type FarmerQuickViewProps,
  MiniPillarChart,
  type MiniPillar,
} from "@/components/portfolio/FarmerQuickView";

// ─── Mocks ─────────────────────────────────────────────────────

const mockApiGet = jest.fn();
jest.mock("@/lib/api", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}));

Object.defineProperty(window, "localStorage", {
  value: { getItem: jest.fn(() => "mock-token"), setItem: jest.fn(), removeItem: jest.fn() },
  writable: true,
});

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_SNAPSHOT = {
  data: {
    snapshotUuid: "snap-1",
    score: 720,
    decision: "SANCTION",
    computedAt: "2026-04-10T10:00:00Z",
    farmer: { name: "Rajesh Patil", farmerId: 42, village: "Wardha" },
    pillars: [
      { code: "P1", name: "Personal", score: 75 },
      { code: "P2", name: "Farm Details", score: 80 },
      { code: "P3", name: "Financial", score: 65 },
      { code: "P4", name: "Repayment", score: 70 },
      { code: "P5", name: "Collateral", score: 60 },
      { code: "P6", name: "Network", score: 55 },
    ],
  },
};

const MOCK_PILLARS: MiniPillar[] = [
  { code: "P1", name: "Personal", score: 75 },
  { code: "P2", name: "Farm Details", score: 80 },
  { code: "P3", name: "Financial", score: 65 },
  { code: "P4", name: "Repayment", score: 70 },
  { code: "P5", name: "Collateral", score: 60 },
  { code: "P6", name: "Network", score: 55 },
];

const DEFAULT_PROPS: FarmerQuickViewProps = {
  farmerId: 42,
  onClose: jest.fn(),
  onOpenFull: jest.fn(),
};

const renderPanel = (overrides: Partial<FarmerQuickViewProps> = {}) =>
  render(<FarmerQuickView {...DEFAULT_PROPS} {...overrides} />);

// ─── FarmerQuickView Tests ──────────────────────────────────────

describe("FarmerQuickView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiGet.mockResolvedValue(MOCK_SNAPSHOT);
  });

  // ─── Visibility ─────────────────────────────────────────────

  it("panel renders", () => {
    renderPanel();
    expect(screen.getByTestId("quick-view-panel")).toBeInTheDocument();
  });

  it("hidden (translate-x-full) when farmerId is null", () => {
    renderPanel({ farmerId: null });

    const panel = screen.getByTestId("quick-view-panel");
    expect(panel.className).toContain("translate-x-full");
    expect(panel).toHaveAttribute("aria-hidden", "true");
  });

  it("visible (translate-x-0) when farmerId is set", () => {
    renderPanel({ farmerId: 42 });

    const panel = screen.getByTestId("quick-view-panel");
    expect(panel.className).toContain("translate-x-0");
    expect(panel).toHaveAttribute("aria-hidden", "false");
  });

  // ─── Loading ────────────────────────────────────────────────

  it("shows loading skeleton while fetching", () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderPanel();

    expect(screen.getByTestId("quick-view-loading")).toBeInTheDocument();
  });

  // ─── Loaded content ─────────────────────────────────────────

  it("shows farmer name + village after load", async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("quick-view-content")).toBeInTheDocument();
    });

    expect(screen.getByTestId("quick-view-name")).toHaveTextContent("Rajesh Patil");
    expect(screen.getByTestId("quick-view-village")).toHaveTextContent("Wardha");
  });

  it("shows score and decision badge", async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("quick-view-score")).toHaveTextContent("720");
    });

    expect(screen.getByTestId("quick-view-decision")).toHaveTextContent("SANCTION");
    expect(screen.getByTestId("quick-view-decision").className).toContain("bg-green-100");
  });

  it("shows mini pillar chart with 6 bars", async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("mini-pillar-chart")).toBeInTheDocument();
    });

    expect(screen.getByTestId("mini-bar-P1")).toBeInTheDocument();
    expect(screen.getByTestId("mini-bar-P2")).toBeInTheDocument();
    expect(screen.getByTestId("mini-bar-P3")).toBeInTheDocument();
    expect(screen.getByTestId("mini-bar-P4")).toBeInTheDocument();
    expect(screen.getByTestId("mini-bar-P5")).toBeInTheDocument();
    expect(screen.getByTestId("mini-bar-P6")).toBeInTheDocument();
  });

  it("computed date displayed", async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("quick-view-date")).toBeInTheDocument();
    });

    expect(screen.getByTestId("quick-view-date").textContent).toContain("Computed:");
  });

  // ─── Actions ────────────────────────────────────────────────

  it('"Open full review" button fires onOpenFull', async () => {
    const onOpenFull = jest.fn();
    renderPanel({ onOpenFull });

    await waitFor(() => {
      expect(screen.getByTestId("open-full-review-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("open-full-review-btn"));
    expect(onOpenFull).toHaveBeenCalledWith(42);
  });

  it("Esc closes panel (fires onClose)", async () => {
    const onClose = jest.fn();
    renderPanel({ onClose });

    await waitFor(() => {
      expect(screen.getByTestId("quick-view-content")).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("close button fires onClose", () => {
    const onClose = jest.fn();
    renderPanel({ onClose });

    fireEvent.click(screen.getByTestId("quick-view-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ─── Error ──────────────────────────────────────────────────

  it("error state shows error message", async () => {
    mockApiGet.mockRejectedValue(new Error("Network error"));
    renderPanel();

    await waitFor(() => {
      expect(screen.getByTestId("quick-view-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("quick-view-error")).toHaveTextContent("Network error");
  });

  // ─── Accessibility ──────────────────────────────────────────

  it('panel has role="complementary" and aria-label', () => {
    renderPanel();

    const panel = screen.getByTestId("quick-view-panel");
    expect(panel).toHaveAttribute("role", "complementary");
    expect(panel).toHaveAttribute("aria-label", "Farmer quick view");
  });
});

// ─── MiniPillarChart Tests ──────────────────────────────────────

describe("MiniPillarChart", () => {
  it("renders 6 bars", () => {
    render(<MiniPillarChart pillars={MOCK_PILLARS} />);

    expect(screen.getByTestId("mini-bar-P1")).toBeInTheDocument();
    expect(screen.getByTestId("mini-bar-P6")).toBeInTheDocument();
  });

  it("bar width reflects score percentage", () => {
    render(<MiniPillarChart pillars={[{ code: "P1", name: "Personal", score: 75 }]} />);

    const fill = screen.getByTestId("mini-bar-fill-P1");
    expect(fill.style.width).toBe("75%");
  });

  it("empty state message when no pillars", () => {
    render(<MiniPillarChart pillars={[]} />);

    expect(screen.getByTestId("mini-chart-empty")).toHaveTextContent("No pillar data");
  });

  it("pillar codes as labels", () => {
    render(<MiniPillarChart pillars={MOCK_PILLARS} />);

    expect(screen.getByTestId("mini-bar-P1")).toHaveTextContent("P1");
    expect(screen.getByTestId("mini-bar-P3")).toHaveTextContent("P3");
  });

  it("score values shown", () => {
    render(<MiniPillarChart pillars={MOCK_PILLARS} />);

    expect(screen.getByTestId("mini-bar-P1")).toHaveTextContent("75");
    expect(screen.getByTestId("mini-bar-P2")).toHaveTextContent("80");
  });

  it('chart has role="img" with aria-label', () => {
    render(<MiniPillarChart pillars={MOCK_PILLARS} />);

    expect(screen.getByTestId("mini-pillar-chart")).toHaveAttribute("role", "img");
    expect(screen.getByTestId("mini-pillar-chart")).toHaveAttribute(
      "aria-label",
      "Pillar scores",
    );
  });

  it("clamps score at 100%", () => {
    render(<MiniPillarChart pillars={[{ code: "P1", name: "Test", score: 150 }]} />);

    const fill = screen.getByTestId("mini-bar-fill-P1");
    expect(fill.style.width).toBe("100%");
  });
});
