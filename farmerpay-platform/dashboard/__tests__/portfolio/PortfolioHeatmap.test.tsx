/**
 * PortfolioHeatmap — Unit Tests (D3)
 *
 * Tests:
 *   CELL
 *   1.  Cell renders with correct aria-label
 *   2.  Cell shows decision colour class
 *   3.  Cell opacity reflects dataAgeDays (computeOpacity)
 *   4.  Letter overlay visible when showLetter=true
 *   5.  Letter overlay hidden when showLetter=false
 *   6.  Letter is "S" for SANCTION, "R" for RECONSIDER, "J" for REJECT
 *   7.  Enter key fires onSelect
 *   8.  Shift+Enter fires onOpenReview
 *   9.  Click fires onSelect
 *  10.  aria-pressed reflects selected state
 *
 *   GRID
 *  11.  Renders heatmap-grid with all cells
 *  12.  Arrow right moves focus to next cell
 *  13.  Arrow left moves focus to previous cell
 *  14.  Arrow down moves focus down by columnsPerRow
 *  15.  Arrow up moves focus up by columnsPerRow
 *  16.  Empty state message
 *
 *   LEGEND
 *  17.  Legend renders with 3 swatches
 *  18.  Letter toggle checkbox reflects showLetters
 *  19.  Toggle checkbox changes letter visibility
 *
 *   CLUSTERING
 *  20.  groupBy='village' renders cluster buttons
 *  21.  Clicking cluster expands sub-grid
 *  22.  Back button returns to cluster view
 *
 *   HELPERS
 *  23.  computeOpacity: 0 days → 1.0
 *  24.  computeOpacity: 60 days → 0.2 (clamped)
 *  25.  computeOpacity: 30 days → 0.5
 *  26.  computeOpacity: 100 days → 0.2 (clamped floor)
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PortfolioHeatmap,
  type PortfolioHeatmapProps,
  type HeatmapFarmer,
  computeOpacity,
} from "@/components/portfolio/PortfolioHeatmap";
import { Cell, type CellProps } from "@/components/portfolio/PortfolioHeatmap/Cell";
import {
  HeatmapLegend,
  type HeatmapLegendProps,
} from "@/components/portfolio/PortfolioHeatmap/legend";

// ─── Test Data ──────────────────────────────────────────────────

function makeFarmer(overrides: Partial<HeatmapFarmer> = {}): HeatmapFarmer {
  return {
    farmerId: 1,
    name: "Rajesh Patil",
    village: "Wardha",
    score: 720,
    decision: "SANCTION",
    dataAgeDays: 5,
    ...overrides,
  };
}

const MOCK_FARMERS: HeatmapFarmer[] = [
  makeFarmer({ farmerId: 1, name: "Rajesh Patil", village: "Wardha", decision: "SANCTION", score: 720, dataAgeDays: 5 }),
  makeFarmer({ farmerId: 2, name: "Sita Devi", village: "Yavatmal", decision: "REJECT", score: 450, dataAgeDays: 45 }),
  makeFarmer({ farmerId: 3, name: "Mohan Sharma", village: "Wardha", decision: "RECONSIDER", score: 580, dataAgeDays: 20 }),
  makeFarmer({ farmerId: 4, name: "Priya Joshi", village: "Yavatmal", decision: "SANCTION", score: 810, dataAgeDays: 2 }),
  makeFarmer({ farmerId: 5, name: "Kiran Rao", village: "Amravati", decision: "REJECT", score: 380, dataAgeDays: 60 }),
];

const DEFAULT_GRID_PROPS: PortfolioHeatmapProps = {
  farmers: MOCK_FARMERS,
  cellSize: 32,
  groupBy: "none",
  showLetters: false,
  onSelect: jest.fn(),
  onOpenReview: jest.fn(),
};

const renderGrid = (overrides: Partial<PortfolioHeatmapProps> = {}) =>
  render(<PortfolioHeatmap {...DEFAULT_GRID_PROPS} {...overrides} />);

// ─── Cell unit tests ────────────────────────────────────────────

describe("Cell", () => {
  const defaultCellProps: CellProps = {
    farmer: makeFarmer(),
    cellSize: 32,
    showLetter: false,
    selected: false,
    onSelect: jest.fn(),
    onOpenReview: jest.fn(),
  };

  const renderCell = (overrides: Partial<CellProps> = {}) =>
    render(<Cell {...defaultCellProps} {...overrides} />);

  it("renders with correct aria-label", () => {
    renderCell();
    expect(screen.getByTestId("cell-1")).toHaveAttribute(
      "aria-label",
      "Rajesh Patil, Wardha, score 720, SANCTION",
    );
  });

  it("shows decision colour class for SANCTION", () => {
    renderCell();
    expect(screen.getByTestId("cell-1").className).toContain("bg-green-600");
  });

  it("shows decision colour class for REJECT", () => {
    renderCell({ farmer: makeFarmer({ decision: "REJECT" }) });
    expect(screen.getByTestId("cell-1").className).toContain("bg-red-600");
  });

  it("shows decision colour class for RECONSIDER", () => {
    renderCell({ farmer: makeFarmer({ decision: "RECONSIDER" }) });
    expect(screen.getByTestId("cell-1").className).toContain("bg-amber-500");
  });

  it("opacity reflects dataAgeDays", () => {
    renderCell({ farmer: makeFarmer({ dataAgeDays: 30 }) });
    const cell = screen.getByTestId("cell-1");
    expect(cell.style.opacity).toBe("0.5");
  });

  it("letter overlay visible when showLetter=true", () => {
    renderCell({ showLetter: true });
    expect(screen.getByTestId("letter-1")).toBeInTheDocument();
    expect(screen.getByTestId("letter-1")).toHaveTextContent("S");
  });

  it("letter overlay hidden when showLetter=false", () => {
    renderCell({ showLetter: false });
    expect(screen.queryByTestId("letter-1")).not.toBeInTheDocument();
  });

  it('letter is "S" for SANCTION', () => {
    renderCell({ showLetter: true, farmer: makeFarmer({ decision: "SANCTION" }) });
    expect(screen.getByTestId("letter-1")).toHaveTextContent("S");
  });

  it('letter is "R" for RECONSIDER', () => {
    renderCell({ showLetter: true, farmer: makeFarmer({ decision: "RECONSIDER" }) });
    expect(screen.getByTestId("letter-1")).toHaveTextContent("R");
  });

  it('letter is "J" for REJECT', () => {
    renderCell({ showLetter: true, farmer: makeFarmer({ decision: "REJECT" }) });
    expect(screen.getByTestId("letter-1")).toHaveTextContent("J");
  });

  it("Enter key fires onSelect", () => {
    const onSelect = jest.fn();
    renderCell({ onSelect });

    fireEvent.keyDown(screen.getByTestId("cell-1"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("Shift+Enter fires onOpenReview", () => {
    const onOpenReview = jest.fn();
    renderCell({ onOpenReview });

    fireEvent.keyDown(screen.getByTestId("cell-1"), { key: "Enter", shiftKey: true });
    expect(onOpenReview).toHaveBeenCalledWith(1);
  });

  it("click fires onSelect", () => {
    const onSelect = jest.fn();
    renderCell({ onSelect });

    fireEvent.click(screen.getByTestId("cell-1"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("aria-pressed reflects selected state", () => {
    renderCell({ selected: true });
    expect(screen.getByTestId("cell-1")).toHaveAttribute("aria-pressed", "true");

    renderCell({ selected: false });
    // Second render — check the non-selected cell
    const cells = screen.getAllByTestId("cell-1");
    expect(cells[1]).toHaveAttribute("aria-pressed", "false");
  });
});

// ─── Grid tests ─────────────────────────────────────────────────

describe("PortfolioHeatmap (grid)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders heatmap-grid with all cells", () => {
    renderGrid();

    expect(screen.getByTestId("heatmap-grid")).toBeInTheDocument();
    expect(screen.getByTestId("cell-1")).toBeInTheDocument();
    expect(screen.getByTestId("cell-2")).toBeInTheDocument();
    expect(screen.getByTestId("cell-3")).toBeInTheDocument();
    expect(screen.getByTestId("cell-4")).toBeInTheDocument();
    expect(screen.getByTestId("cell-5")).toBeInTheDocument();
  });

  it("arrow right moves focus to next cell", () => {
    renderGrid();

    const cell1 = screen.getByTestId("cell-1");
    cell1.focus();

    fireEvent.keyDown(screen.getByTestId("heatmap-grid"), { key: "ArrowRight" });

    expect(document.activeElement).toBe(screen.getByTestId("cell-2"));
  });

  it("arrow left moves focus to previous cell", () => {
    renderGrid();

    const cell3 = screen.getByTestId("cell-3");
    cell3.focus();

    fireEvent.keyDown(screen.getByTestId("heatmap-grid"), { key: "ArrowLeft" });

    expect(document.activeElement).toBe(screen.getByTestId("cell-2"));
  });

  it("arrow left at first cell stays at first cell", () => {
    renderGrid();

    screen.getByTestId("cell-1").focus();
    fireEvent.keyDown(screen.getByTestId("heatmap-grid"), { key: "ArrowLeft" });

    expect(document.activeElement).toBe(screen.getByTestId("cell-1"));
  });

  it("onSelect called when cell clicked", () => {
    const onSelect = jest.fn();
    renderGrid({ onSelect });

    fireEvent.click(screen.getByTestId("cell-3"));
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("empty state when no farmers", () => {
    renderGrid({ farmers: [] });

    expect(screen.getByTestId("heatmap-empty")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-empty")).toHaveTextContent(
      "No farmers to display.",
    );
  });

  it('grid has role="grid" with aria-label', () => {
    renderGrid();

    expect(screen.getByTestId("heatmap-grid")).toHaveAttribute("role", "grid");
    expect(screen.getByTestId("heatmap-grid")).toHaveAttribute(
      "aria-label",
      "Portfolio heatmap",
    );
  });
});

// ─── Legend tests ────────────────────────────────────────────────

describe("HeatmapLegend", () => {
  const defaultLegendProps: HeatmapLegendProps = {
    showLetters: false,
    onToggleLetters: jest.fn(),
  };

  const renderLegend = (overrides: Partial<HeatmapLegendProps> = {}) =>
    render(<HeatmapLegend {...defaultLegendProps} {...overrides} />);

  it("renders legend with 3 swatches", () => {
    renderLegend();

    expect(screen.getByTestId("legend-swatch-S")).toBeInTheDocument();
    expect(screen.getByTestId("legend-swatch-R")).toBeInTheDocument();
    expect(screen.getByTestId("legend-swatch-J")).toBeInTheDocument();
  });

  it("letter toggle checkbox reflects showLetters=false", () => {
    renderLegend({ showLetters: false });

    const checkbox = screen.getByTestId("letter-toggle-input") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("letter toggle checkbox reflects showLetters=true", () => {
    renderLegend({ showLetters: true });

    const checkbox = screen.getByTestId("letter-toggle-input") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("toggle fires onToggleLetters", () => {
    const onToggle = jest.fn();
    renderLegend({ onToggleLetters: onToggle });

    fireEvent.click(screen.getByTestId("letter-toggle-input"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// ─── Letter toggle integration ──────────────────────────────────

describe("PortfolioHeatmap (letter toggle)", () => {
  it("letter overlay appears after toggling show-letters checkbox", () => {
    renderGrid({ showLetters: false });

    // Initially no letters
    expect(screen.queryByTestId("letter-1")).not.toBeInTheDocument();

    // Toggle letters on
    fireEvent.click(screen.getByTestId("letter-toggle-input"));

    // Now letters visible
    expect(screen.getByTestId("letter-1")).toBeInTheDocument();
    expect(screen.getByTestId("letter-2")).toBeInTheDocument();
  });
});

// ─── Clustering tests ───────────────────────────────────────────

describe("PortfolioHeatmap (clustering)", () => {
  it("groupBy='village' renders cluster buttons", () => {
    renderGrid({ groupBy: "village" });

    expect(screen.getByTestId("heatmap-clusters")).toBeInTheDocument();
    expect(screen.getByTestId("cluster-Wardha")).toBeInTheDocument();
    expect(screen.getByTestId("cluster-Yavatmal")).toBeInTheDocument();
    expect(screen.getByTestId("cluster-Amravati")).toBeInTheDocument();
  });

  it("cluster shows farmer count", () => {
    renderGrid({ groupBy: "village" });

    expect(screen.getByTestId("cluster-Wardha")).toHaveTextContent("2 farmers");
    expect(screen.getByTestId("cluster-Yavatmal")).toHaveTextContent("2 farmers");
    expect(screen.getByTestId("cluster-Amravati")).toHaveTextContent("1 farmers");
  });

  it("clicking cluster expands sub-grid", () => {
    renderGrid({ groupBy: "village" });

    fireEvent.click(screen.getByTestId("cluster-Wardha"));

    expect(screen.getByTestId("heatmap-expanded")).toBeInTheDocument();
    expect(screen.getByTestId("cell-1")).toBeInTheDocument(); // Rajesh
    expect(screen.getByTestId("cell-3")).toBeInTheDocument(); // Mohan
    // Other villages not shown
    expect(screen.queryByTestId("cell-2")).not.toBeInTheDocument();
  });

  it("back button returns to cluster view", () => {
    renderGrid({ groupBy: "village" });

    fireEvent.click(screen.getByTestId("cluster-Wardha"));
    expect(screen.getByTestId("heatmap-expanded")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("cluster-back-btn"));
    expect(screen.getByTestId("heatmap-clusters")).toBeInTheDocument();
    expect(screen.queryByTestId("heatmap-expanded")).not.toBeInTheDocument();
  });

  it("cluster has correct aria-label", () => {
    renderGrid({ groupBy: "village" });

    expect(screen.getByTestId("cluster-Wardha")).toHaveAttribute(
      "aria-label",
      "Wardha: 2 farmers",
    );
  });
});

// ─── computeOpacity helper tests ────────────────────────────────

describe("computeOpacity", () => {
  it("0 days → 1.0", () => {
    expect(computeOpacity(0)).toBe(1);
  });

  it("60 days → 0.2 (at boundary)", () => {
    expect(computeOpacity(60)).toBeCloseTo(0.2, 5);
  });

  it("30 days → 0.5", () => {
    expect(computeOpacity(30)).toBe(0.5);
  });

  it("100 days → 0.2 (clamped floor)", () => {
    expect(computeOpacity(100)).toBe(0.2);
  });

  it("-10 days → 1.0 (clamped ceiling)", () => {
    expect(computeOpacity(-10)).toBe(1);
  });
});
