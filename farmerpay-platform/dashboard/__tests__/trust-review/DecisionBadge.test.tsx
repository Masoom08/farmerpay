/**
 * DecisionBadge — Unit Tests (C4)
 *
 * Tests:
 *   1. SANCTION renders label + correct token colour class
 *   2. RECONSIDER renders label + correct token colour class
 *   3. REJECT renders label + correct token colour class
 *   4. Tooltip contains score and threshold text
 *   5. Tooltip text for each decision includes correct threshold
 *   6. Size variants: sm, md, lg apply correct height classes
 *   7. aria-label on badge
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  DecisionBadge,
  type DecisionBadgeProps,
} from "@/components/trust/DecisionBadge";

const renderBadge = (overrides: Partial<DecisionBadgeProps> = {}) =>
  render(
    <DecisionBadge
      decision="SANCTION"
      score={864}
      size="md"
      {...overrides}
    />,
  );

describe("DecisionBadge", () => {
  // ─── Decision label + colour ────────────────────────────────

  it('renders SANCTION label with sanction token colour', () => {
    renderBadge({ decision: "SANCTION" });

    const badge = screen.getByTestId("decision-badge");
    expect(badge).toHaveTextContent("Sanction");
    expect(badge.className).toContain("bg-decision-sanction");
    expect(badge.className).toContain("text-decision-sanction-fg");
  });

  it('renders RECONSIDER label with reconsider token colour', () => {
    renderBadge({ decision: "RECONSIDER" });

    const badge = screen.getByTestId("decision-badge");
    expect(badge).toHaveTextContent("Reconsider");
    expect(badge.className).toContain("bg-decision-reconsider");
    expect(badge.className).toContain("text-decision-reconsider-fg");
  });

  it('renders REJECT label with reject token colour', () => {
    renderBadge({ decision: "REJECT" });

    const badge = screen.getByTestId("decision-badge");
    expect(badge).toHaveTextContent("Reject");
    expect(badge.className).toContain("bg-decision-reject");
    expect(badge.className).toContain("text-decision-reject-fg");
  });

  // ─── Tooltip content ────────────────────────────────────────

  it('SANCTION tooltip shows score and "above 600" threshold', () => {
    renderBadge({ decision: "SANCTION", score: 864 });

    const tooltip = screen.getByTestId("decision-tooltip");
    expect(tooltip).toHaveTextContent("Score 864");
    expect(tooltip).toHaveTextContent("Threshold for Sanction: above 600");
  });

  it('RECONSIDER tooltip shows "500–600" range', () => {
    renderBadge({ decision: "RECONSIDER", score: 550 });

    const tooltip = screen.getByTestId("decision-tooltip");
    expect(tooltip).toHaveTextContent("Score 550");
    expect(tooltip).toHaveTextContent("Threshold for Reconsider: 500\u2013600");
  });

  it('REJECT tooltip shows "below 500" threshold', () => {
    renderBadge({ decision: "REJECT", score: 300 });

    const tooltip = screen.getByTestId("decision-tooltip");
    expect(tooltip).toHaveTextContent("Score 300");
    expect(tooltip).toHaveTextContent("Threshold for Reject: below 500");
  });

  it("tooltip shows only threshold when score is not provided", () => {
    renderBadge({ decision: "SANCTION", score: undefined });

    const tooltip = screen.getByTestId("decision-tooltip");
    expect(tooltip).toHaveTextContent("Threshold for Sanction: above 600");
    expect(tooltip.textContent).not.toContain("Score");
  });

  // ─── Size variants ──────────────────────────────────────────

  it("sm size applies h-5 class", () => {
    renderBadge({ size: "sm" });
    expect(screen.getByTestId("decision-badge").className).toContain("h-5");
  });

  it("md size applies h-6 class", () => {
    renderBadge({ size: "md" });
    expect(screen.getByTestId("decision-badge").className).toContain("h-6");
  });

  it("lg size applies h-8 class", () => {
    renderBadge({ size: "lg" });
    expect(screen.getByTestId("decision-badge").className).toContain("h-8");
  });

  // ─── Accessibility ──────────────────────────────────────────

  it("has aria-label with decision name", () => {
    renderBadge({ decision: "SANCTION" });

    const badge = screen.getByTestId("decision-badge");
    expect(badge).toHaveAttribute("aria-label", "Decision: Sanction");
  });

  it("tooltip element has role=tooltip", () => {
    renderBadge();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });
});
