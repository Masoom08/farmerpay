/**
 * Table2GroupPanel — Unit Tests (C6)
 *
 * Tests:
 *   1. All 4 chips render with correct labels and scores
 *   2. Click fires onGroupClick with correct code
 *   3. aria-label format: "Demographic 18 out of 20"
 *   4. Chips are <button> elements (keyboard reachable)
 *   5. Shows "0 / 20" when earned=0 (never hidden)
 *   6. role="group" on container
 *   7. Colour classes: high fill (green), medium (amber), low (red)
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Table2GroupPanel,
  type Table2GroupPanelProps,
  type Group,
} from "@/components/trust/Table2GroupPanel";

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_GROUPS: Group[] = [
  { code: "DEMO", earned: 18, max: 20 },
  { code: "OPS", earned: 40, max: 45 },
  { code: "ASSET", earned: 22, max: 25 },
  { code: "EXT", earned: 9, max: 10 },
];

const renderPanel = (overrides: Partial<Table2GroupPanelProps> = {}) => {
  const onGroupClick = jest.fn();
  const result = render(
    <Table2GroupPanel
      groups={MOCK_GROUPS}
      onGroupClick={onGroupClick}
      {...overrides}
    />,
  );
  return { ...result, onGroupClick: overrides.onGroupClick ?? onGroupClick };
};

// ─── Tests ──────────────────────────────────────────────────────

describe("Table2GroupPanel", () => {
  // ─── Rendering ──────────────────────────────────────────────

  it("renders the panel container", () => {
    renderPanel();
    expect(screen.getByTestId("table2-group-panel")).toBeInTheDocument();
  });

  it("renders all 4 group chips", () => {
    renderPanel();

    expect(screen.getByTestId("group-chip-DEMO")).toBeInTheDocument();
    expect(screen.getByTestId("group-chip-OPS")).toBeInTheDocument();
    expect(screen.getByTestId("group-chip-ASSET")).toBeInTheDocument();
    expect(screen.getByTestId("group-chip-EXT")).toBeInTheDocument();
  });

  it("renders correct labels", () => {
    renderPanel();

    expect(screen.getByTestId("group-chip-DEMO")).toHaveTextContent("Demographic");
    expect(screen.getByTestId("group-chip-OPS")).toHaveTextContent("Operational");
    expect(screen.getByTestId("group-chip-ASSET")).toHaveTextContent("Asset & Land");
    expect(screen.getByTestId("group-chip-EXT")).toHaveTextContent("External");
  });

  it("renders earned / max scores", () => {
    renderPanel();

    expect(screen.getByTestId("group-chip-DEMO")).toHaveTextContent("18 / 20");
    expect(screen.getByTestId("group-chip-OPS")).toHaveTextContent("40 / 45");
    expect(screen.getByTestId("group-chip-ASSET")).toHaveTextContent("22 / 25");
    expect(screen.getByTestId("group-chip-EXT")).toHaveTextContent("9 / 10");
  });

  // ─── Click interaction ──────────────────────────────────────

  it("click on DEMO chip fires onGroupClick with 'DEMO'", () => {
    const onGroupClick = jest.fn();
    renderPanel({ onGroupClick });

    fireEvent.click(screen.getByTestId("group-chip-DEMO"));
    expect(onGroupClick).toHaveBeenCalledWith("DEMO");
  });

  it("click on OPS chip fires onGroupClick with 'OPS'", () => {
    const onGroupClick = jest.fn();
    renderPanel({ onGroupClick });

    fireEvent.click(screen.getByTestId("group-chip-OPS"));
    expect(onGroupClick).toHaveBeenCalledWith("OPS");
  });

  it("click on ASSET chip fires onGroupClick with 'ASSET'", () => {
    const onGroupClick = jest.fn();
    renderPanel({ onGroupClick });

    fireEvent.click(screen.getByTestId("group-chip-ASSET"));
    expect(onGroupClick).toHaveBeenCalledWith("ASSET");
  });

  it("click on EXT chip fires onGroupClick with 'EXT'", () => {
    const onGroupClick = jest.fn();
    renderPanel({ onGroupClick });

    fireEvent.click(screen.getByTestId("group-chip-EXT"));
    expect(onGroupClick).toHaveBeenCalledWith("EXT");
  });

  // ─── Accessibility ──────────────────────────────────────────

  it('aria-label format: "Demographic 18 out of 20"', () => {
    renderPanel();

    expect(screen.getByTestId("group-chip-DEMO")).toHaveAttribute(
      "aria-label",
      "Demographic 18 out of 20",
    );
  });

  it("aria-label on each chip matches label + earned + max", () => {
    renderPanel();

    expect(screen.getByTestId("group-chip-OPS")).toHaveAttribute(
      "aria-label",
      "Operational 40 out of 45",
    );
    expect(screen.getByTestId("group-chip-ASSET")).toHaveAttribute(
      "aria-label",
      "Asset & Land 22 out of 25",
    );
    expect(screen.getByTestId("group-chip-EXT")).toHaveAttribute(
      "aria-label",
      "External 9 out of 10",
    );
  });

  it("chips are <button> elements", () => {
    renderPanel();

    const chip = screen.getByTestId("group-chip-DEMO");
    expect(chip.tagName).toBe("BUTTON");
    expect(chip).toHaveAttribute("type", "button");
  });

  it('container has role="group" with aria-label', () => {
    renderPanel();

    const container = screen.getByTestId("table2-group-panel");
    expect(container).toHaveAttribute("role", "group");
    expect(container).toHaveAttribute("aria-label", "Table-2 group scores");
  });

  // ─── Zero earned — never hidden ────────────────────────────

  it('shows "0 / 20" when earned is 0', () => {
    renderPanel({
      groups: [
        { code: "DEMO", earned: 0, max: 20 },
        { code: "OPS", earned: 40, max: 45 },
        { code: "ASSET", earned: 0, max: 25 },
        { code: "EXT", earned: 9, max: 10 },
      ],
    });

    expect(screen.getByTestId("group-chip-DEMO")).toHaveTextContent("0 / 20");
    expect(screen.getByTestId("group-chip-ASSET")).toHaveTextContent("0 / 25");
    // Both chips still visible
    expect(screen.getByTestId("group-chip-DEMO")).toBeInTheDocument();
    expect(screen.getByTestId("group-chip-ASSET")).toBeInTheDocument();
  });

  it("aria-label correct when earned is 0", () => {
    renderPanel({
      groups: [{ code: "DEMO", earned: 0, max: 20 }],
    });

    expect(screen.getByTestId("group-chip-DEMO")).toHaveAttribute(
      "aria-label",
      "Demographic 0 out of 20",
    );
  });

  // ─── Colour classes ─────────────────────────────────────────

  it("high fill ratio (>=80%) gets green class", () => {
    renderPanel({
      groups: [{ code: "DEMO", earned: 18, max: 20 }], // 90%
    });

    const chip = screen.getByTestId("group-chip-DEMO");
    expect(chip.className).toContain("bg-brand-primary-100");
  });

  it("medium fill ratio (50-79%) gets amber class", () => {
    renderPanel({
      groups: [{ code: "OPS", earned: 30, max: 45 }], // 67%
    });

    const chip = screen.getByTestId("group-chip-OPS");
    expect(chip.className).toContain("bg-brand-accent-amber");
  });

  it("low fill ratio (<50%) gets red class", () => {
    renderPanel({
      groups: [{ code: "EXT", earned: 3, max: 10 }], // 30%
    });

    const chip = screen.getByTestId("group-chip-EXT");
    expect(chip.className).toContain("bg-decision-reject");
  });
});
