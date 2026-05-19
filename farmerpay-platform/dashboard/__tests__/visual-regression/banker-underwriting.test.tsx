/**
 * Banker dashboard — Visual regression snapshots.
 *
 * Baseline snapshots for banker role-gated underwriting surfaces.
 * CI fails on unintended structural diffs.
 *
 * Surfaces:
 *   - DecisioningMatrix: all 4 cell states with product config
 *   - ScoreBreakdown: full data, missing TRUST, missing FHS, stale
 *   - DrishtiStressLens: baseline + stress scenarios
 */

import React from "react";
import { render } from "@testing-library/react";
import DecisioningMatrix from "../../src/components/underwriting/DecisioningMatrix";
import ScoreBreakdown from "../../src/components/underwriting/ScoreBreakdown";
import DrishtiStressLens from "../../src/components/underwriting/DrishtiStressLens";
import type { StressScenario } from "../../src/components/underwriting/DrishtiStressLens";
import type { TrustData, FhsData } from "../../src/components/underwriting/ScoreBreakdown";
import type { ScenarioProjection } from "../../src/lib/drishti";

// ─── Fixtures ────────────────────────────────────────────────────

const PRODUCT_CONFIG = {
  approve: { ticket: "Standard", tenor: "12 months", note: "Standard terms" },
  conditional: { ticket: "Reduced", tenor: "Seasonal", note: "EMI aligned to crop" },
  refer: { ticket: "Hold", note: "Extra KYC required" },
  decline: { note: "Coaching path + re-apply 90 days" },
};

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

const BASE_PROJECTION: ScenarioProjection = {
  total_revenue: 200000,
  total_cost: 120000,
  net_farm_income: 80000,
  total_income_with_other: 100000,
  emi_to_income_ratio: 0.25,
  health_status: "good",
  sma_classification: "SMA-0",
  income_adequacy: "adequate",
  risk_score: 20,
  breakeven_yield_kg_per_hectare: 800,
  projected_yield_kg_per_hectare: 1200,
  yield_safety_margin_pct: 50,
};

const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: "climate-stress",
    label: "Climate Stress",
    description: "Monsoon deficit -30%",
    projections: { ...BASE_PROJECTION, health_status: "stressed", emi_to_income_ratio: 0.45 },
  },
  {
    id: "market-adverse",
    label: "Market Adverse",
    description: "Commodity price drop -20%",
    projections: { ...BASE_PROJECTION, health_status: "watch", emi_to_income_ratio: 0.35 },
  },
];

const CELL_CASES = [
  { cell: "approve" as const, trust: 80, fhs: 75 },
  { cell: "conditional" as const, trust: 70, fhs: 30 },
  { cell: "refer" as const, trust: 40, fhs: 65 },
  { cell: "decline" as const, trust: 35, fhs: 25 },
];

// ═══════════════════════════════════════════════════════════════════

describe("Visual regression: Banker underwriting", () => {
  // ─── DecisioningMatrix — per cell ──────────────────────────

  describe("DecisioningMatrix snapshots", () => {
    for (const { cell, trust, fhs } of CELL_CASES) {
      it(`snapshot: ${cell} cell active (T:${trust}, F:${fhs})`, () => {
        const { container } = render(
          <DecisioningMatrix
            trust={trust}
            fhs={fhs}
            trustCutoff={60}
            fhsCutoff={50}
            cell={cell}
            productConfig={PRODUCT_CONFIG}
            width={480}
          />
        );
        expect(container.firstChild).toMatchSnapshot();
      });
    }
  });

  // ─── ScoreBreakdown — full, missing, stale ─────────────────

  describe("ScoreBreakdown snapshots", () => {
    it("snapshot: full data (both scores)", () => {
      const { container } = render(
        <ScoreBreakdown trust={FULL_TRUST} financialHealth={FULL_FHS} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it("snapshot: missing TRUST", () => {
      const { container } = render(
        <ScoreBreakdown trust={null} financialHealth={FULL_FHS} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it("snapshot: missing FHS", () => {
      const { container } = render(
        <ScoreBreakdown trust={FULL_TRUST} financialHealth={null} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it("snapshot: both missing", () => {
      const { container } = render(
        <ScoreBreakdown trust={null} financialHealth={null} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it("snapshot: stale flags", () => {
      const { container } = render(
        <ScoreBreakdown
          trust={FULL_TRUST}
          financialHealth={FULL_FHS}
          stalenessFlags={{ trust: true, fhs: true }}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  // ─── DrishtiStressLens — baseline + stress ─────────────────

  describe("DrishtiStressLens snapshots", () => {
    it("snapshot: baseline with stress scenarios", () => {
      const { container } = render(
        <DrishtiStressLens
          trust={75}
          fhs={72}
          trustCutoff={60}
          fhsCutoff={50}
          baselineCell="approve"
          scenarios={STRESS_SCENARIOS}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it("snapshot: no scenarios (empty)", () => {
      const { container } = render(
        <DrishtiStressLens
          trust={75}
          fhs={72}
          trustCutoff={60}
          fhsCutoff={50}
          baselineCell="approve"
          scenarios={[]}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  // ─── Structural guards ─────────────────────────────────────

  describe("Banker surfaces include FHS (role-appropriate)", () => {
    it("ScoreBreakdown renders FHS breakdown when present", () => {
      const { container } = render(
        <ScoreBreakdown trust={FULL_TRUST} financialHealth={FULL_FHS} />
      );
      const html = container.innerHTML;
      expect(html).toContain("Financial Health");
      expect(html).toContain("68"); // FHS total score
      expect(html).toContain("Grade B");
    });

    it("DecisioningMatrix SVG contains both T: and F: values", () => {
      const { container } = render(
        <DecisioningMatrix
          trust={75}
          fhs={68}
          trustCutoff={60}
          fhsCutoff={50}
          cell="approve"
        />
      );
      const svg = container.querySelector("svg");
      expect(svg?.textContent).toContain("T:75");
      expect(svg?.textContent).toContain("F:68");
    });
  });
});
