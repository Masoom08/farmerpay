/**
 * BandLadder — Unit Tests (C8)
 *
 * Tests:
 *   1. Renders all sub-feature rows
 *   2. Each row shows feature name, band label, band score
 *   3. Source chip renders with correct label
 *   4. 5-dot indicator: aria-label "{n} of 5"
 *   5. Empty state renders message
 *   6. role="list" / role="listitem"
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  BandLadder,
  type SubFeature,
} from "@/components/trust/BandLadder";

const MOCK_FEATURES: SubFeature[] = [
  { featureCode: "Q_101", featureName: "Age & household size", band: 4, bandLabel: "Strong", source: "QUESTIONNAIRE" },
  { featureCode: "AA_FH", featureName: "Financial health", band: 3, bandLabel: "Building", source: "AA" },
  { featureCode: "CIBIL_OD", featureName: "CIBIL overdue", band: 2, bandLabel: "Weak", source: "CIBIL" },
];

const renderLadder = (features: SubFeature[] = MOCK_FEATURES) =>
  render(<BandLadder subFeatures={features} />);

describe("BandLadder", () => {
  it("renders all sub-feature rows", () => {
    renderLadder();

    expect(screen.getByTestId("ladder-row-Q_101")).toBeInTheDocument();
    expect(screen.getByTestId("ladder-row-AA_FH")).toBeInTheDocument();
    expect(screen.getByTestId("ladder-row-CIBIL_OD")).toBeInTheDocument();
  });

  it("shows feature name in each row", () => {
    renderLadder();

    expect(screen.getByTestId("ladder-row-Q_101")).toHaveTextContent("Age & household size");
    expect(screen.getByTestId("ladder-row-AA_FH")).toHaveTextContent("Financial health");
    expect(screen.getByTestId("ladder-row-CIBIL_OD")).toHaveTextContent("CIBIL overdue");
  });

  it("shows band label and score (n / 5)", () => {
    renderLadder();

    expect(screen.getByTestId("ladder-row-Q_101")).toHaveTextContent("Strong (4 / 5)");
    expect(screen.getByTestId("ladder-row-AA_FH")).toHaveTextContent("Building (3 / 5)");
    expect(screen.getByTestId("ladder-row-CIBIL_OD")).toHaveTextContent("Weak (2 / 5)");
  });

  it("renders source chip with correct label", () => {
    renderLadder();

    expect(screen.getByTestId("source-chip-Q_101")).toHaveTextContent("QUESTIONNAIRE");
    expect(screen.getByTestId("source-chip-AA_FH")).toHaveTextContent("AA");
    expect(screen.getByTestId("source-chip-CIBIL_OD")).toHaveTextContent("CIBIL");
  });

  it("source chips have appropriate colour classes", () => {
    renderLadder();

    expect(screen.getByTestId("source-chip-Q_101").className).toContain("bg-blue-100");
    expect(screen.getByTestId("source-chip-AA_FH").className).toContain("bg-brand-primary-100");
    expect(screen.getByTestId("source-chip-CIBIL_OD").className).toContain("bg-purple-100");
  });

  it('5-dot indicator has aria-label "{n} of 5"', () => {
    renderLadder();

    const dots = screen.getAllByRole("img");
    expect(dots[0]).toHaveAttribute("aria-label", "4 of 5");
    expect(dots[1]).toHaveAttribute("aria-label", "3 of 5");
    expect(dots[2]).toHaveAttribute("aria-label", "2 of 5");
  });

  it("empty state shows message", () => {
    render(<BandLadder subFeatures={[]} />);

    expect(screen.getByTestId("band-ladder-empty")).toHaveTextContent(
      "No sub-features available",
    );
  });

  it('container has role="list"', () => {
    renderLadder();

    const ladder = screen.getByTestId("band-ladder");
    expect(ladder).toHaveAttribute("role", "list");
    expect(ladder).toHaveAttribute("aria-label", "Sub-feature bands");
  });

  it('each row has role="listitem"', () => {
    renderLadder();

    const row = screen.getByTestId("ladder-row-Q_101");
    expect(row).toHaveAttribute("role", "listitem");
  });
});
