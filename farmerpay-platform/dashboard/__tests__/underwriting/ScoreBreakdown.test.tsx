/**
 * ScoreBreakdown — Tests.
 *
 * Covers: full data, partial data, missing columns, "not enough data" state,
 * stale badges, grade display, component rows, and zero-vs-missing distinction.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import ScoreBreakdown from "../../src/components/underwriting/ScoreBreakdown";
import type { TrustData, FhsData } from "../../src/components/underwriting/ScoreBreakdown";

const FULL_TRUST: TrustData = {
  score: 75,
  band: "building",
  sectionScores: { identity: 80, behavioural: 70, repayment: 75, attestation: 65 },
  calculatedAt: "2026-04-01T00:00:00Z",
};

const FULL_FHS: FhsData = {
  score: 68,
  band: "building",
  grade: "B",
  components: {
    cashFlowStability: { score: 72, details: {} },
    balanceAdequacy: { score: 65, details: {} },
    incomeDiversity: { score: 60, details: {} },
    debtDiscipline: { score: 80, details: {} },
    govtTransferAccess: { score: 50, details: {} },
    digitalAdoption: { score: 55, details: {} },
  },
  analysisMode: "raw_transactions",
  transactionCount: 240,
  createdAt: "2026-04-05T00:00:00Z",
};

// ═══════════════════════════════════════════════════════════════════

describe("ScoreBreakdown", () => {
  // ─── Full data rendering ───────────────────────────────────

  it("renders both columns with full data", () => {
    render(
      <ScoreBreakdown trust={FULL_TRUST} financialHealth={FULL_FHS} />,
    );

    expect(screen.getByTestId("trust-breakdown")).toBeTruthy();
    expect(screen.getByTestId("fhs-breakdown")).toBeTruthy();
  });

  it("shows TRUST total score and band", () => {
    render(
      <ScoreBreakdown trust={FULL_TRUST} financialHealth={FULL_FHS} />,
    );

    expect(screen.getByTestId("trust-breakdown-total")).toHaveTextContent("75");
    expect(screen.getByTestId("trust-breakdown-band")).toHaveTextContent("Building");
  });

  it("shows FHS total score, band, and grade", () => {
    render(
      <ScoreBreakdown trust={FULL_TRUST} financialHealth={FULL_FHS} />,
    );

    expect(screen.getByTestId("fhs-breakdown-total")).toHaveTextContent("68");
    expect(screen.getByTestId("fhs-breakdown-band")).toHaveTextContent("Building");
    expect(screen.getByTestId("fhs-breakdown-grade")).toHaveTextContent("Grade B");
  });

  // ─── Component rows ───────────────────────────────────────

  it("renders TRUST section score rows with values", () => {
    render(
      <ScoreBreakdown trust={FULL_TRUST} financialHealth={FULL_FHS} />,
    );

    expect(screen.getByTestId("trust-breakdown-row-identity")).toHaveTextContent("80");
    expect(screen.getByTestId("trust-breakdown-row-behavioural")).toHaveTextContent("70");
    expect(screen.getByTestId("trust-breakdown-row-repayment")).toHaveTextContent("75");
    expect(screen.getByTestId("trust-breakdown-row-attestation")).toHaveTextContent("65");
  });

  it("renders FHS component rows with values", () => {
    render(
      <ScoreBreakdown trust={FULL_TRUST} financialHealth={FULL_FHS} />,
    );

    expect(screen.getByTestId("fhs-breakdown-row-cashFlowStability")).toHaveTextContent("72");
    expect(screen.getByTestId("fhs-breakdown-row-debtDiscipline")).toHaveTextContent("80");
    expect(screen.getByTestId("fhs-breakdown-row-digitalAdoption")).toHaveTextContent("55");
  });

  // ─── Missing columns ──────────────────────────────────────

  it("renders 'Not enough data' when TRUST is null", () => {
    render(
      <ScoreBreakdown trust={null} financialHealth={FULL_FHS} />,
    );

    expect(screen.getByTestId("trust-breakdown-missing")).toHaveTextContent("Not enough data");
  });

  it("renders 'Not enough data' when FHS is null", () => {
    render(
      <ScoreBreakdown trust={FULL_TRUST} financialHealth={null} />,
    );

    expect(screen.getByTestId("fhs-breakdown-missing")).toHaveTextContent("Not enough data");
  });

  it("renders both missing when both are null", () => {
    render(
      <ScoreBreakdown trust={null} financialHealth={null} />,
    );

    expect(screen.getByTestId("trust-breakdown-missing")).toBeTruthy();
    expect(screen.getByTestId("fhs-breakdown-missing")).toBeTruthy();
  });

  // ─── Missing individual components (not enough data, NOT 0) ─

  it("shows 'No data' for missing TRUST section scores, not 0", () => {
    const partialTrust: TrustData = {
      score: 60,
      band: "building",
      sectionScores: { identity: 80 },
    };

    render(
      <ScoreBreakdown trust={partialTrust} financialHealth={FULL_FHS} />,
    );

    // identity has a value
    expect(screen.getByTestId("trust-breakdown-row-identity")).toHaveTextContent("80");
    // behavioural is missing — should show "No data", not "0"
    expect(screen.getByTestId("trust-breakdown-nodata-behavioural")).toHaveTextContent("No data");
    expect(screen.getByTestId("trust-breakdown-nodata-repayment")).toHaveTextContent("No data");
    expect(screen.getByTestId("trust-breakdown-nodata-attestation")).toHaveTextContent("No data");
  });

  it("shows 'No data' for missing FHS components, not 0", () => {
    const partialFhs: FhsData = {
      score: 50,
      band: "building",
      components: {
        cashFlowStability: { score: 72, details: {} },
      },
    };

    render(
      <ScoreBreakdown trust={FULL_TRUST} financialHealth={partialFhs} />,
    );

    expect(screen.getByTestId("fhs-breakdown-row-cashFlowStability")).toHaveTextContent("72");
    expect(screen.getByTestId("fhs-breakdown-nodata-balanceAdequacy")).toHaveTextContent("No data");
    expect(screen.getByTestId("fhs-breakdown-nodata-debtDiscipline")).toHaveTextContent("No data");
  });

  // ─── Staleness ─────────────────────────────────────────────

  it("shows stale badge when trust is stale", () => {
    render(
      <ScoreBreakdown
        trust={FULL_TRUST}
        financialHealth={FULL_FHS}
        stalenessFlags={{ trust: true, fhs: false }}
      />,
    );

    expect(screen.getByTestId("trust-breakdown-stale")).toHaveTextContent("Stale");
  });

  it("shows stale badge when FHS is stale", () => {
    render(
      <ScoreBreakdown
        trust={FULL_TRUST}
        financialHealth={FULL_FHS}
        stalenessFlags={{ trust: false, fhs: true }}
      />,
    );

    expect(screen.getByTestId("fhs-breakdown-stale")).toHaveTextContent("Stale");
  });

  it("does not show stale badge when not stale", () => {
    const { container } = render(
      <ScoreBreakdown
        trust={FULL_TRUST}
        financialHealth={FULL_FHS}
        stalenessFlags={{ trust: false, fhs: false }}
      />,
    );

    expect(container.querySelector("[data-testid='trust-breakdown-stale']")).toBeNull();
    expect(container.querySelector("[data-testid='fhs-breakdown-stale']")).toBeNull();
  });

  // ─── Meta footer ───────────────────────────────────────────

  it("shows FHS meta info (analysis mode + transaction count)", () => {
    render(
      <ScoreBreakdown trust={FULL_TRUST} financialHealth={FULL_FHS} />,
    );

    const fhsPanel = screen.getByTestId("fhs-breakdown");
    expect(fhsPanel.textContent).toContain("raw transactions");
    expect(fhsPanel.textContent).toContain("240 txns");
  });

  // ─── Date formatting ──────────────────────────────────────

  it("shows formatted date in footer", () => {
    render(
      <ScoreBreakdown trust={FULL_TRUST} financialHealth={FULL_FHS} />,
    );

    const trustPanel = screen.getByTestId("trust-breakdown");
    // Should contain a formatted date (Apr 2026 or similar)
    expect(trustPanel.textContent).toContain("2026");
  });

  // ─── Null sectionScores but trust present ──────────────────

  it("shows 'No data' for all sections when sectionScores is null", () => {
    const trustNoSections: TrustData = { score: 60, band: "building", sectionScores: null };

    render(
      <ScoreBreakdown trust={trustNoSections} financialHealth={FULL_FHS} />,
    );

    expect(screen.getByTestId("trust-breakdown-total")).toHaveTextContent("60");
    expect(screen.getByTestId("trust-breakdown-nodata-identity")).toHaveTextContent("No data");
    expect(screen.getByTestId("trust-breakdown-nodata-behavioural")).toHaveTextContent("No data");
  });
});
