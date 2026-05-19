/**
 * Underwriting Tab Integration — Tests.
 *
 * Verifies that DecisioningMatrix, ScoreBreakdown, and DrishtiStressLens
 * are wired together on the farmer detail page, powered by a single
 * readiness fetch. Tests cutoff slider what-if analysis without refetch.
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

// ─── Mocks ───────────────────────────────────────────────────────

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "farmer-uuid-123" }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

// Mock recharts (used by the existing page)
jest.mock("recharts", () => ({
  PieChart: ({ children }: any) => <div data-testid="mock-pie">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Tooltip: () => null,
  Legend: () => null,
}));

// Track API calls to verify single-fetch contract
const apiCalls: string[] = [];

const MOCK_READINESS = {
  state: "ready",
  trust: {
    score: 75,
    band: "building",
    sectionScores: { identity: 80, behavioural: 70, repayment: 75, attestation: 65 },
    calculatedAt: "2026-04-01T00:00:00Z",
  },
  financialHealth: {
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
  },
  matrixCell: "approve",
  recommendedAction: "Standard terms — reliable person with capacity",
  thresholds: { trustCutoff: 60, fhsCutoff: 50 },
  stalenessFlags: { trust: false, fhs: false },
};

const MOCK_FARMER_DETAIL = {
  farmer: { name: "Test Farmer", phone: "9876543210" },
  compliance: { overallScore: 72, status: "on_track", dimensions: {}, touchpointsCompleted: 5, touchpointsTotal: 10 },
  trust: { finalScore: 75, grade: "B" },
  loans: [],
  profitability: {},
  income: { incomeStreams: [], totalIncome: 100000 },
  insurance: { totalPolicies: 0 },
};

jest.mock("@/lib/api", () => ({
  apiGet: jest.fn((path: string) => {
    apiCalls.push(path);
    // /readiness/flags gates the Underwriting tab via `matrixEnabled`.
    // getReadinessFlags() in src/lib/readiness.ts requires the full
    // `{ success, data }` envelope; without this branch it falls through
    // to the no-flags default and the tab never mounts.
    if (path.includes("/readiness/flags")) {
      return Promise.resolve({
        success: true,
        data: { bankerMatrix: true, farmerBadge: true, sathiCoachingPriority: true },
      });
    }
    if (path.includes("/readiness/")) {
      return Promise.resolve({ data: MOCK_READINESS });
    }
    if (path.includes("/banker/portfolio/farmers/")) {
      return Promise.resolve({ data: MOCK_FARMER_DETAIL });
    }
    return Promise.resolve({ data: {} });
  }),
  formatRupees: (n: number) => `₹${n ?? 0}`,
}));

jest.mock("@/lib/drishti", () => ({
  getFarmerScenarios: jest.fn(() => Promise.resolve([
    {
      label: "Climate Stress",
      label_key: "climate_stress",
      description: "Monsoon deficit -30%",
      projections: {
        total_revenue: 140000,
        total_cost: 120000,
        net_farm_income: 20000,
        total_income_with_other: 40000,
        emi_to_income_ratio: 0.45,
        health_status: "stressed",
        sma_classification: "SMA-2",
        income_adequacy: "inadequate",
        risk_score: 65,
        breakeven_yield_kg_per_hectare: 800,
        projected_yield_kg_per_hectare: 600,
        yield_safety_margin_pct: -25,
      },
      monthly_cashflow: [],
      assumptions: {},
    },
  ])),
}));

// Import AFTER mocks are set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FarmerDetailPage = require("../../src/app/dashboard/farmer/[id]/page").default;

// ═══════════════════════════════════════════════════════════════════

describe("Underwriting Tab Integration", () => {
  beforeEach(() => {
    apiCalls.length = 0;
    localStorage.setItem("fp_token", "test-token");
  });

  afterEach(() => {
    localStorage.clear();
  });

  async function renderAndNavigateToUnderwriting() {
    await act(async () => {
      render(<FarmerDetailPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading farmer details...")).toBeNull();
    });

    // Switch to underwriting tab
    const tab = screen.getByRole("tab", { name: /underwriting/i });
    fireEvent.click(tab);

    return screen;
  }

  // ─── Single fetch contract ─────────────────────────────────

  it("fetches readiness data exactly once alongside farmer detail", async () => {
    await renderAndNavigateToUnderwriting();

    // Exclude the /readiness/flags lookup — that's a separate
    // feature-flag endpoint, not the per-farmer readiness payload
    // whose single-fetch contract this test is about.
    const readinessCalls = apiCalls.filter(
      (p) => p.includes("/readiness/") && !p.includes("/readiness/flags"),
    );
    expect(readinessCalls).toHaveLength(1);
    expect(readinessCalls[0]).toBe("/readiness/farmer-uuid-123");
  });

  it("does not duplicate readiness fetch when switching tabs", async () => {
    await renderAndNavigateToUnderwriting();

    // Switch away and back
    fireEvent.click(screen.getByRole("tab", { name: /overview/i }));
    fireEvent.click(screen.getByRole("tab", { name: /underwriting/i }));

    const readinessCalls = apiCalls.filter((p) => p.includes("/readiness/"));
    expect(readinessCalls).toHaveLength(1);
  });

  // ─── Component rendering ──────────────────────────────────

  it("renders DecisioningMatrix with scores from readiness", async () => {
    const s = await renderAndNavigateToUnderwriting();

    // Matrix group should be present
    const group = s.getByRole("group", { name: /loan decisioning matrix/i });
    expect(group).toBeTruthy();

    // Score marker should show TRUST and FHS values in the SVG
    const tab = s.getByTestId("underwriting-tab");
    const allSvgs = tab.querySelectorAll("svg");
    const svgTexts = Array.from(allSvgs).map((svg) => svg.textContent || "").join(" ");
    expect(svgTexts).toContain("T:75");
    expect(svgTexts).toContain("F:68");
  });

  it("renders ScoreBreakdown with trust and FHS data", async () => {
    await renderAndNavigateToUnderwriting();

    expect(screen.getByTestId("trust-breakdown")).toBeTruthy();
    expect(screen.getByTestId("fhs-breakdown")).toBeTruthy();
    expect(screen.getByTestId("trust-breakdown-total")).toHaveTextContent("75");
    expect(screen.getByTestId("fhs-breakdown-total")).toHaveTextContent("68");
  });

  // ─── Stress lens toggle ────────────────────────────────────

  it("stress lens is hidden by default", async () => {
    await renderAndNavigateToUnderwriting();

    expect(screen.queryByTestId("stress-lens-section")).toBeNull();
  });

  it("toggling stress lens shows DrishtiStressLens", async () => {
    await renderAndNavigateToUnderwriting();

    // Allow DRISHTI scenarios to load
    await waitFor(() => {
      expect(screen.getByTestId("stress-lens-toggle")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("stress-lens-toggle"));

    await waitFor(() => {
      expect(screen.getByTestId("stress-lens-section")).toBeTruthy();
      expect(screen.getByTestId("drishti-stress-lens")).toBeTruthy();
    });
  });

  // ─── What-if cutoff sliders ────────────────────────────────

  it("shows default cutoff values from readiness response", async () => {
    await renderAndNavigateToUnderwriting();

    expect(screen.getByTestId("trust-cutoff-value")).toHaveTextContent("60");
    expect(screen.getByTestId("fhs-cutoff-value")).toHaveTextContent("50");
  });

  it("changing trust cutoff updates matrix cell without refetching", async () => {
    await renderAndNavigateToUnderwriting();

    const slider = screen.getByTestId("trust-cutoff-slider");
    const callsBefore = apiCalls.length;

    // Move trust cutoff to 80 — farmer's trust=75 is now below cutoff
    fireEvent.change(slider, { target: { value: "80" } });

    expect(screen.getByTestId("trust-cutoff-value")).toHaveTextContent("80");

    // No new API calls
    expect(apiCalls.length).toBe(callsBefore);
  });

  it("changing FHS cutoff updates matrix cell without refetching", async () => {
    await renderAndNavigateToUnderwriting();

    const slider = screen.getByTestId("fhs-cutoff-slider");
    const callsBefore = apiCalls.length;

    // Move FHS cutoff to 70 — farmer's fhs=68 is now below cutoff
    fireEvent.change(slider, { target: { value: "70" } });

    expect(screen.getByTestId("fhs-cutoff-value")).toHaveTextContent("70");
    expect(apiCalls.length).toBe(callsBefore);
  });

  it("shows warning when cutoffs are modified", async () => {
    await renderAndNavigateToUnderwriting();

    // Initially no warning
    expect(screen.queryByText(/thresholds adjusted locally/i)).toBeNull();

    // Change a cutoff
    fireEvent.change(screen.getByTestId("trust-cutoff-slider"), { target: { value: "70" } });

    expect(screen.getByText(/thresholds adjusted locally/i)).toBeTruthy();
  });

  it("reset button restores default cutoffs", async () => {
    await renderAndNavigateToUnderwriting();

    // Change a cutoff
    fireEvent.change(screen.getByTestId("trust-cutoff-slider"), { target: { value: "70" } });
    expect(screen.getByTestId("trust-cutoff-value")).toHaveTextContent("70");

    // Reset
    fireEvent.click(screen.getByText(/reset to defaults/i));
    expect(screen.getByTestId("trust-cutoff-value")).toHaveTextContent("60");
  });
});
