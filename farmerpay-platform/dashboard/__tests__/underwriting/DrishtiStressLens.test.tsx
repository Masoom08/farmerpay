/**
 * DrishtiStressLens — Tests.
 *
 * Covers: scenario toggles, worst-case computation, stress markers,
 * baseline unchanged, scenario detail chips, FHS estimation logic.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DrishtiStressLens from "../../src/components/underwriting/DrishtiStressLens";
import type { StressScenario } from "../../src/components/underwriting/DrishtiStressLens";
import type { ScenarioProjection } from "../../src/lib/drishti";

// ─── Fixtures ────────────────────────────────────────────────────

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

const CLIMATE_STRESS: StressScenario = {
  id: "climate-stress",
  label: "Climate Stress",
  description: "Monsoon deficit -30%",
  projections: {
    ...BASE_PROJECTION,
    health_status: "stressed",
    emi_to_income_ratio: 0.45,
  },
};

const MARKET_ADVERSE: StressScenario = {
  id: "market-adverse",
  label: "Market Adverse",
  description: "Commodity price drop -20%",
  projections: {
    ...BASE_PROJECTION,
    health_status: "watch",
    emi_to_income_ratio: 0.35,
  },
};

const NPA_SCENARIO: StressScenario = {
  id: "npa-scenario",
  label: "NPA Shock",
  description: "Cascading default scenario",
  projections: {
    ...BASE_PROJECTION,
    health_status: "npa",
    emi_to_income_ratio: 0.6,
  },
};

const PRECOMPUTED_SCENARIO: StressScenario = {
  id: "precomputed",
  label: "Pre-computed",
  description: "Backend-computed FHS",
  projections: BASE_PROJECTION,
  stressedFhs: 30,
};

const SCENARIOS = [CLIMATE_STRESS, MARKET_ADVERSE];

const BASE_PROPS = {
  trust: 75,
  fhs: 72,
  trustCutoff: 60,
  fhsCutoff: 50,
  baselineCell: "approve" as const,
  scenarios: SCENARIOS,
};

// ═══════════════════════════════════════════════════════════════════

describe("DrishtiStressLens", () => {
  // ─── Rendering ─────────────────────────────────────────────

  it("renders the component container", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);
    expect(screen.getByTestId("drishti-stress-lens")).toBeTruthy();
  });

  it("renders scenario toggle buttons for all scenarios", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);
    expect(screen.getByTestId("toggle-climate-stress")).toBeTruthy();
    expect(screen.getByTestId("toggle-market-adverse")).toBeTruthy();
  });

  it("renders SVG overlay", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);
    expect(screen.getByTestId("stress-svg")).toBeTruthy();
  });

  it("renders worst-case summary bar", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);
    expect(screen.getByTestId("worst-case-summary")).toBeTruthy();
  });

  // ─── Default state: all scenarios enabled ──────────────────

  it("all scenarios are enabled by default (aria-pressed=true)", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);

    const btn1 = screen.getByTestId("toggle-climate-stress");
    const btn2 = screen.getByTestId("toggle-market-adverse");
    expect(btn1).toHaveAttribute("aria-pressed", "true");
    expect(btn2).toHaveAttribute("aria-pressed", "true");
  });

  it("renders stress markers for all enabled scenarios", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);

    expect(screen.getByTestId("stress-marker-climate-stress")).toBeTruthy();
    expect(screen.getByTestId("stress-marker-market-adverse")).toBeTruthy();
  });

  it("renders scenario detail chips for all enabled scenarios", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);

    expect(screen.getByTestId("scenario-detail-climate-stress")).toBeTruthy();
    expect(screen.getByTestId("scenario-detail-market-adverse")).toBeTruthy();
  });

  // ─── Toggle behavior ──────────────────────────────────────

  it("toggling a scenario off removes its stress marker", () => {
    const { container } = render(<DrishtiStressLens {...BASE_PROPS} />);

    // Disable climate-stress
    fireEvent.click(screen.getByTestId("toggle-climate-stress"));

    expect(screen.getByTestId("toggle-climate-stress")).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelector('[data-testid="stress-marker-climate-stress"]')).toBeNull();
    // Market adverse should still be visible
    expect(screen.getByTestId("stress-marker-market-adverse")).toBeTruthy();
  });

  it("toggling a scenario back on restores its stress marker", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);

    // Disable then re-enable
    fireEvent.click(screen.getByTestId("toggle-climate-stress"));
    expect(screen.getByTestId("toggle-climate-stress")).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByTestId("toggle-climate-stress"));
    expect(screen.getByTestId("toggle-climate-stress")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("stress-marker-climate-stress")).toBeTruthy();
  });

  it("toggling does not change baseline props (no refetch)", () => {
    const { rerender } = render(<DrishtiStressLens {...BASE_PROPS} />);

    // Toggle climate-stress off
    fireEvent.click(screen.getByTestId("toggle-climate-stress"));

    // Baseline action should still show "Approve"
    expect(screen.getByTestId("baseline-action")).toHaveTextContent("Approve");

    // Re-render with same props to verify no prop mutation
    rerender(<DrishtiStressLens {...BASE_PROPS} />);
    expect(screen.getByTestId("baseline-action")).toHaveTextContent("Approve");
  });

  // ─── Worst-case computation ────────────────────────────────

  it("shows worst-case action when stress shifts the cell", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);

    // Climate stress (stressed + high EMI) should drop FHS significantly
    // from 72 → ~24 (degradation 38 + 10 = 48), putting it below fhsCutoff 50
    // With trust=75 >= trustCutoff=60 and FHS < 50: → conditional
    // Market adverse (watch + EMI 0.35) → FHS ~47 (degradation 20 + 5), also < 50 → conditional
    // Both conditional. Worst case = conditional.
    const worstAction = screen.getByTestId("worst-case-action");
    expect(worstAction).toHaveTextContent("Conditional Approve");
  });

  it("shows 'Action unchanged' when no stress shifts the cell", () => {
    // Use mild scenario that won't shift cell
    const mildScenario: StressScenario = {
      id: "mild",
      label: "Mild",
      description: "Minor stress",
      projections: {
        ...BASE_PROJECTION,
        health_status: "good",
        emi_to_income_ratio: 0.2,
      },
    };

    render(
      <DrishtiStressLens
        {...BASE_PROPS}
        fhs={90}
        scenarios={[mildScenario]}
      />,
    );

    // good health → 5 pt degradation. FHS 90 → 85, still > 50. Cell stays approve.
    expect(screen.getByTestId("worst-case-summary")).toHaveTextContent("Action unchanged under stress");
  });

  it("worst-case correctly identifies decline as worst", () => {
    // NPA scenario: trust=45 (below trustCutoff=60), FHS will drop to near zero
    render(
      <DrishtiStressLens
        trust={45}
        fhs={60}
        trustCutoff={60}
        fhsCutoff={50}
        baselineCell="refer"
        scenarios={[NPA_SCENARIO]}
      />,
    );

    // NPA: degradation = min(60-5, 55) = 55, + 10 for EMI > 0.4 = 65, FHS = max(0, 60-65) = 0
    // trust 45 < 60 and FHS 0 < 50 → decline
    expect(screen.getByTestId("worst-case-action")).toHaveTextContent("Decline");
  });

  // ─── Baseline display ──────────────────────────────────────

  it("displays baseline action correctly", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);
    expect(screen.getByTestId("baseline-action")).toHaveTextContent("Approve");
  });

  it("displays baseline action for decline cell", () => {
    render(
      <DrishtiStressLens
        {...BASE_PROPS}
        baselineCell="decline"
        scenarios={[]}
      />,
    );
    expect(screen.getByTestId("baseline-action")).toHaveTextContent("Decline");
  });

  // ─── Pre-computed stressedFhs ──────────────────────────────

  it("uses pre-computed stressedFhs when provided", () => {
    render(
      <DrishtiStressLens
        {...BASE_PROPS}
        scenarios={[PRECOMPUTED_SCENARIO]}
      />,
    );

    // stressedFhs=30, trust=75>=60, FHS 30<50 → conditional
    const detail = screen.getByTestId("scenario-detail-precomputed");
    expect(detail).toHaveTextContent("FHS: 72 → 30");
    expect(detail).toHaveTextContent("Conditional Approve");
  });

  // ─── Scenario detail chips content ─────────────────────────

  it("scenario detail shows FHS shift values", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);

    const climateDetail = screen.getByTestId("scenario-detail-climate-stress");
    expect(climateDetail).toHaveTextContent("Climate Stress");
    expect(climateDetail).toHaveTextContent("Monsoon deficit -30%");
    expect(climateDetail).toHaveTextContent("FHS: 72");
  });

  it("scenario detail shows resulting action", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);

    const climateDetail = screen.getByTestId("scenario-detail-climate-stress");
    expect(climateDetail).toHaveTextContent("Conditional Approve");
  });

  // ─── Empty scenarios ───────────────────────────────────────

  it("renders gracefully with no scenarios", () => {
    render(
      <DrishtiStressLens {...BASE_PROPS} scenarios={[]} />,
    );

    expect(screen.getByTestId("drishti-stress-lens")).toBeTruthy();
    expect(screen.getByTestId("worst-case-summary")).toHaveTextContent("Action unchanged under stress");
  });

  // ─── Worst-case styling ────────────────────────────────────

  it("worst-case summary has red border when action changes", () => {
    const { container } = render(<DrishtiStressLens {...BASE_PROPS} />);

    const summary = screen.getByTestId("worst-case-summary");
    expect(summary.className).toContain("border-red-200");
  });

  it("worst-case summary has slate border when action unchanged", () => {
    render(
      <DrishtiStressLens {...BASE_PROPS} scenarios={[]} />,
    );

    const summary = screen.getByTestId("worst-case-summary");
    expect(summary.className).toContain("border-slate-200");
  });

  // ─── SVG accessibility ────────────────────────────────────

  it("SVG has descriptive aria-label", () => {
    render(<DrishtiStressLens {...BASE_PROPS} />);

    const svg = screen.getByTestId("stress-svg");
    expect(svg).toHaveAttribute("aria-label", "DRISHTI stress scenario overlay");
  });
});
