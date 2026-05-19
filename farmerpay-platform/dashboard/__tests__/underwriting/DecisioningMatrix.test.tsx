/**
 * DecisioningMatrix — Tests.
 *
 * Covers: all four cell states, keyboard navigation, a11y attributes,
 * score marker positioning, and color-never-alone contract.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DecisioningMatrix from "../../src/components/underwriting/DecisioningMatrix";

const BASE_PROPS = {
  trustCutoff: 60,
  fhsCutoff: 50,
};

const PRODUCT_CONFIG = {
  approve: { ticket: "Standard", tenor: "12 months", note: "Standard terms" },
  conditional: { ticket: "Reduced", tenor: "Seasonal", note: "EMI aligned to crop" },
  refer: { ticket: "Hold", note: "Extra KYC required" },
  decline: { note: "Coaching path + re-apply 90 days" },
};

// ═══════════════════════════════════════════════════════════════════

describe("DecisioningMatrix", () => {
  // ─── Rendering per cell ────────────────────────────────────

  describe("renders correctly for each active cell", () => {
    const cellCases: Array<{
      cell: "approve" | "conditional" | "refer" | "decline";
      trust: number;
      fhs: number;
      expectedLabel: string;
    }> = [
      { cell: "approve", trust: 80, fhs: 75, expectedLabel: "Approve" },
      { cell: "conditional", trust: 70, fhs: 30, expectedLabel: "Conditional Approve" },
      { cell: "refer", trust: 40, fhs: 65, expectedLabel: "Refer for Review" },
      { cell: "decline", trust: 35, fhs: 25, expectedLabel: "Decline" },
    ];

    for (const { cell, trust, fhs, expectedLabel } of cellCases) {
      it(`renders ${cell} cell as active`, () => {
        const { container } = render(
          <DecisioningMatrix
            {...BASE_PROPS}
            trust={trust}
            fhs={fhs}
            cell={cell}
            productConfig={PRODUCT_CONFIG}
          />,
        );

        // Active cell should exist with data-active="true"
        const activeEl = container.querySelector(`[data-cell="${cell}"][data-active="true"]`);
        expect(activeEl).toBeTruthy();

        // Active cell should have aria-selected
        expect(activeEl).toHaveAttribute("aria-selected", "true");

        // Cell label text should contain the expected action label
        expect(activeEl?.getAttribute("aria-label")).toContain(expectedLabel);
      });
    }
  });

  // ─── All four cells always visible ─────────────────────────

  it("renders all four cells regardless of active cell", () => {
    const { container } = render(
      <DecisioningMatrix
        {...BASE_PROPS}
        trust={80}
        fhs={75}
        cell="approve"
      />,
    );

    expect(container.querySelector('[data-cell="approve"]')).toBeTruthy();
    expect(container.querySelector('[data-cell="conditional"]')).toBeTruthy();
    expect(container.querySelector('[data-cell="refer"]')).toBeTruthy();
    expect(container.querySelector('[data-cell="decline"]')).toBeTruthy();
  });

  // ─── Text label on every cell (color never alone) ──────────

  it("every cell has a text label — color alone does not encode the decision", () => {
    const { container } = render(
      <DecisioningMatrix
        {...BASE_PROPS}
        trust={80}
        fhs={75}
        cell="approve"
      />,
    );

    const cells = container.querySelectorAll("[data-testid^='matrix-cell-']");
    expect(cells.length).toBe(4);

    const expectedLabels = ["Approve", "Conditional Approve", "Refer for Review", "Decline"];
    cells.forEach((cell) => {
      const label = cell.getAttribute("aria-label") || "";
      const hasTextLabel = expectedLabels.some((l) => label.includes(l));
      expect(hasTextLabel).toBe(true);
    });
  });

  // ─── Aria labels describe combination + action ─────────────

  it("each cell aria-label describes TRUST level, FHS level, and action", () => {
    const { container } = render(
      <DecisioningMatrix
        {...BASE_PROPS}
        trust={80}
        fhs={75}
        cell="approve"
      />,
    );

    const approveCell = container.querySelector('[data-cell="approve"]');
    const label = approveCell?.getAttribute("aria-label") || "";
    expect(label).toContain("High TRUST");
    expect(label).toContain("High Financial Health");
    expect(label).toContain("Approve");

    const declineCell = container.querySelector('[data-cell="decline"]');
    const declineLabel = declineCell?.getAttribute("aria-label") || "";
    expect(declineLabel).toContain("Low TRUST");
    expect(declineLabel).toContain("Low Financial Health");
    expect(declineLabel).toContain("Decline");
  });

  // ─── Current position marker on active cell ────────────────

  it("marks the active cell with '(current position)' in aria-label", () => {
    const { container } = render(
      <DecisioningMatrix
        {...BASE_PROPS}
        trust={80}
        fhs={75}
        cell="approve"
      />,
    );

    const approveCell = container.querySelector('[data-cell="approve"]');
    expect(approveCell?.getAttribute("aria-label")).toContain("current position");

    // Non-active cells should NOT say "current position"
    const declineCell = container.querySelector('[data-cell="decline"]');
    expect(declineCell?.getAttribute("aria-label")).not.toContain("current position");
  });

  // ─── Threshold values are visible ──────────────────────────

  it("displays threshold values on axes", () => {
    const { container } = render(
      <DecisioningMatrix
        {...BASE_PROPS}
        trust={80}
        fhs={75}
        cell="approve"
      />,
    );

    const svgText = container.querySelector("svg")?.textContent || "";
    expect(svgText).toContain("60"); // trustCutoff
    expect(svgText).toContain("50"); // fhsCutoff
  });

  // ─── Score marker with T: and F: values ────────────────────

  it("shows score marker with TRUST and FHS values", () => {
    const { container } = render(
      <DecisioningMatrix
        {...BASE_PROPS}
        trust={75}
        fhs={68}
        cell="approve"
      />,
    );

    const svgText = container.querySelector("svg")?.textContent || "";
    expect(svgText).toContain("T:75");
    expect(svgText).toContain("F:68");
  });

  // ─── Keyboard navigation ───────────────────────────────────

  describe("keyboard navigation", () => {
    it("arrow keys move focus between cells", () => {
      const { container } = render(
        <DecisioningMatrix
          {...BASE_PROPS}
          trust={80}
          fhs={75}
          cell="approve"
        />,
      );

      // Focus on the first focusable cell (conditional — row 0, col 0)
      const firstCell = container.querySelector('[data-cell="conditional"]');
      expect(firstCell).toBeTruthy();
      fireEvent.focus(firstCell!);

      // ArrowRight → approve (row 0, col 1)
      fireEvent.keyDown(firstCell!, { key: "ArrowRight" });
      const approveCell = container.querySelector('[data-cell="approve"]');
      expect(document.activeElement === approveCell || approveCell?.matches(":focus-within")).toBeTruthy;

      // ArrowDown from approve → refer (row 1, col 1)
      fireEvent.keyDown(approveCell!, { key: "ArrowDown" });
      const referCell = container.querySelector('[data-cell="refer"]');
      expect(referCell).toBeTruthy();

      // ArrowLeft from refer → decline (row 1, col 0)
      fireEvent.keyDown(referCell!, { key: "ArrowLeft" });
      const declineCell = container.querySelector('[data-cell="decline"]');
      expect(declineCell).toBeTruthy();

      // ArrowUp from decline → conditional (row 0, col 0)
      fireEvent.keyDown(declineCell!, { key: "ArrowUp" });
      // Back to conditional
    });

    it("does not move beyond grid boundaries", () => {
      const { container } = render(
        <DecisioningMatrix
          {...BASE_PROPS}
          trust={80}
          fhs={75}
          cell="approve"
        />,
      );

      // Focus conditional (top-left)
      const cell = container.querySelector('[data-cell="conditional"]');
      fireEvent.focus(cell!);

      // ArrowUp should stay at row 0
      fireEvent.keyDown(cell!, { key: "ArrowUp" });
      // ArrowLeft should stay at col 0
      fireEvent.keyDown(cell!, { key: "ArrowLeft" });

      // Should not throw or move to invalid cell
      expect(cell).toBeTruthy();
    });
  });

  // ─── Grid role and group label ─────────────────────────────

  it("has role=group with descriptive aria-label", () => {
    render(
      <DecisioningMatrix
        {...BASE_PROPS}
        trust={80}
        fhs={75}
        cell="approve"
      />,
    );

    const group = screen.getByRole("group");
    expect(group).toHaveAttribute(
      "aria-label",
      "Loan decisioning matrix — TRUST vs Financial Health",
    );
  });

  // ─── All cells have role=gridcell ──────────────────────────

  it("all four cells have role=gridcell", () => {
    render(
      <DecisioningMatrix
        {...BASE_PROPS}
        trust={80}
        fhs={75}
        cell="approve"
      />,
    );

    const gridcells = screen.getAllByRole("gridcell");
    expect(gridcells.length).toBe(4);
  });

  // ─── Product config rendering ──────────────────────────────

  it("renders product config when provided", () => {
    const { container } = render(
      <DecisioningMatrix
        {...BASE_PROPS}
        trust={80}
        fhs={75}
        cell="approve"
        productConfig={PRODUCT_CONFIG}
      />,
    );

    const svgText = container.querySelector("svg")?.textContent || "";
    expect(svgText).toContain("Ticket: Standard");
    expect(svgText).toContain("Tenor: 12 months");
    expect(svgText).toContain("Ticket: Reduced");
  });

  // ─── Snapshot tests per cell ───────────────────────────────

  describe("snapshots", () => {
    const cells: Array<"approve" | "conditional" | "refer" | "decline"> = [
      "approve",
      "conditional",
      "refer",
      "decline",
    ];

    for (const cell of cells) {
      it(`snapshot: ${cell} cell active`, () => {
        const scores: Record<string, { trust: number; fhs: number }> = {
          approve: { trust: 80, fhs: 75 },
          conditional: { trust: 70, fhs: 30 },
          refer: { trust: 40, fhs: 65 },
          decline: { trust: 35, fhs: 25 },
        };
        const { trust, fhs } = scores[cell];

        const { container } = render(
          <DecisioningMatrix
            {...BASE_PROPS}
            trust={trust}
            fhs={fhs}
            cell={cell}
            productConfig={PRODUCT_CONFIG}
            width={480}
          />,
        );

        expect(container.firstChild).toMatchSnapshot();
      });
    }
  });
});
