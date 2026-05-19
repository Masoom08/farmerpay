/**
 * SummaryStrip + MovementPillar — Unit Tests (D2)
 *
 * Tests:
 *   SUMMARY STRIP
 *   1.  Renders summary-strip container
 *   2.  Shows 3 KPI cards
 *   3.  Sanction card shows count
 *   4.  Reconsider card shows count
 *   5.  Reject card shows count
 *   6.  Each card shows percentage
 *   7.  KPI labels match spec text
 *   8.  Cards have correct aria-label
 *   9.  Region role with aria-label
 *
 *   MOVEMENT PILLAR
 *  10.  Renders movement-pillar container
 *  11.  Shows "up" count with ▲ glyph
 *  12.  Shows "down" count with ▼ glyph
 *  13.  Shows "unchanged" count with • glyph
 *  14.  Full a11y label includes all values
 *  15.  role="status" on movement container
 *  16.  Up text is green, down text is red
 *  17.  Zero values render correctly
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  SummaryStrip,
  type SummaryStripProps,
} from "@/components/portfolio/SummaryStrip";
import {
  MovementPillar,
  type MovementPillarProps,
} from "@/components/portfolio/MovementPillar";

// ─── Test Data ──────────────────────────────────────────────────

const DEFAULT_PROPS: SummaryStripProps = {
  counts: { sanction: 284, reconsider: 96, reject: 32 },
  movement: { up: 18, down: 11, unchanged: 383 },
};

const renderStrip = (overrides: Partial<SummaryStripProps> = {}) =>
  render(<SummaryStrip {...DEFAULT_PROPS} {...overrides} />);

const renderMovement = (overrides: Partial<MovementPillarProps> = {}) =>
  render(
    <MovementPillar
      movement={{ up: 18, down: 11, unchanged: 383 }}
      {...overrides}
    />,
  );

// ─── SummaryStrip Tests ─────────────────────────────────────────

describe("SummaryStrip", () => {
  it("renders summary-strip container", () => {
    renderStrip();
    expect(screen.getByTestId("summary-strip")).toBeInTheDocument();
  });

  it("shows 3 KPI cards", () => {
    renderStrip();

    expect(screen.getByTestId("kpi-sanction")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-reconsider")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-reject")).toBeInTheDocument();
  });

  it("sanction card shows count 284", () => {
    renderStrip();

    expect(screen.getByTestId("kpi-sanction-count")).toHaveTextContent("284");
  });

  it("reconsider card shows count 96", () => {
    renderStrip();

    expect(screen.getByTestId("kpi-reconsider-count")).toHaveTextContent("96");
  });

  it("reject card shows count 32", () => {
    renderStrip();

    expect(screen.getByTestId("kpi-reject-count")).toHaveTextContent("32");
  });

  it("each card shows percentage", () => {
    renderStrip();
    // Total = 284 + 96 + 32 = 412
    // Sanction: 284/412 ≈ 69%
    expect(screen.getByTestId("kpi-sanction-pct")).toHaveTextContent("(69%)");
    // Reconsider: 96/412 ≈ 23%
    expect(screen.getByTestId("kpi-reconsider-pct")).toHaveTextContent("(23%)");
    // Reject: 32/412 ≈ 8%
    expect(screen.getByTestId("kpi-reject-pct")).toHaveTextContent("(8%)");
  });

  it("KPI labels match spec text", () => {
    renderStrip();

    expect(screen.getByTestId("kpi-sanction")).toHaveTextContent("Sanction-grade");
    expect(screen.getByTestId("kpi-reconsider")).toHaveTextContent("Reconsider");
    expect(screen.getByTestId("kpi-reject")).toHaveTextContent("Reject-grade");
  });

  it("cards have correct aria-label", () => {
    renderStrip();

    expect(screen.getByTestId("kpi-sanction")).toHaveAttribute(
      "aria-label",
      "Sanction-grade: 284",
    );
    expect(screen.getByTestId("kpi-reconsider")).toHaveAttribute(
      "aria-label",
      "Reconsider: 96",
    );
    expect(screen.getByTestId("kpi-reject")).toHaveAttribute(
      "aria-label",
      "Reject-grade: 32",
    );
  });

  it('container has role="region" with aria-label', () => {
    renderStrip();

    const strip = screen.getByTestId("summary-strip");
    expect(strip).toHaveAttribute("role", "region");
    expect(strip).toHaveAttribute("aria-label", "Portfolio summary");
  });

  it("handles zero counts gracefully", () => {
    renderStrip({ counts: { sanction: 0, reconsider: 0, reject: 0 } });

    expect(screen.getByTestId("kpi-sanction-count")).toHaveTextContent("0");
    expect(screen.getByTestId("kpi-sanction-pct")).toHaveTextContent("(0%)");
  });
});

// ─── MovementPillar Tests ───────────────────────────────────────

describe("MovementPillar", () => {
  it("renders movement-pillar container", () => {
    renderMovement();
    expect(screen.getByTestId("movement-pillar")).toBeInTheDocument();
  });

  it('shows "up" count with ▲ glyph', () => {
    renderMovement();

    const el = screen.getByTestId("movement-up");
    expect(el).toHaveTextContent("▲");
    expect(el).toHaveTextContent("18 moved up");
  });

  it('shows "down" count with ▼ glyph', () => {
    renderMovement();

    const el = screen.getByTestId("movement-down");
    expect(el).toHaveTextContent("▼");
    expect(el).toHaveTextContent("11 moved down");
  });

  it('shows "unchanged" count with • glyph', () => {
    renderMovement();

    const el = screen.getByTestId("movement-unchanged");
    expect(el).toHaveTextContent("•");
    expect(el).toHaveTextContent("383 unchanged");
  });

  it("full a11y label includes all movement values", () => {
    renderMovement();

    const pillar = screen.getByTestId("movement-pillar");
    expect(pillar).toHaveAttribute(
      "aria-label",
      "Movement: 18 moved up, 11 moved down, 383 unchanged",
    );
  });

  it('has role="status"', () => {
    renderMovement();

    expect(screen.getByTestId("movement-pillar")).toHaveAttribute(
      "role",
      "status",
    );
  });

  it("up text uses green colour class", () => {
    renderMovement();

    expect(screen.getByTestId("movement-up").className).toContain(
      "text-emerald-700",
    );
  });

  it("down text uses red colour class", () => {
    renderMovement();

    expect(screen.getByTestId("movement-down").className).toContain(
      "text-red-700",
    );
  });

  it("zero values render correctly", () => {
    renderMovement({ movement: { up: 0, down: 0, unchanged: 0 } });

    expect(screen.getByTestId("movement-up")).toHaveTextContent("0 moved up");
    expect(screen.getByTestId("movement-down")).toHaveTextContent("0 moved down");
    expect(screen.getByTestId("movement-unchanged")).toHaveTextContent("0 unchanged");
  });
});
