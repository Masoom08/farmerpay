/**
 * DrishtiPanel — Unit Tests (C11)
 *
 * Tests:
 *   1.  Renders panel with scenario selector
 *   2.  Shows idle message when no scenario selected
 *   3.  Selecting scenario shows loading skeleton
 *   4.  Loading state has Skeleton.Score with role="status"
 *   5.  Successful preview shows projected score delta
 *   6.  Positive delta renders green styling
 *   7.  Negative delta renders red styling
 *   8.  Zero delta renders neutral styling
 *   9.  Error shows inline error message
 *  10.  Error shows retry button
 *  11.  Retry re-fetches the projection
 *  12.  Scenario options rendered from props
 *  13.  sr-only text for accessibility
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import {
  DrishtiPanel,
  type DrishtiPanelProps,
  type DrishtiScenarioOption,
} from "@/app/dashboard/farmer/[id]/trust-review/tabs/DrishtiPanel";

// ─── Mock modules ──────────────────────────────────────────────

// Mock drishti lib
const mockGetFarmerScenarios = jest.fn();
const mockGetScenarioResult = jest.fn();

jest.mock("@/lib/drishti", () => ({
  getFarmerScenarios: (...args: unknown[]) => mockGetFarmerScenarios(...args),
  getScenarioResult: (...args: unknown[]) => mockGetScenarioResult(...args),
  ENGINE_LABELS: {
    pre_loan: "Pre-Loan Analysis",
    climate_stress: "Climate Stress Test",
    household_portfolio: "Household Portfolio",
  },
}));

// Mock trustPreview lib
const mockPreviewTrustScore = jest.fn();

jest.mock("@/lib/trustPreview", () => ({
  previewTrustScore: (...args: unknown[]) => mockPreviewTrustScore(...args),
}));

// Mock localStorage
const mockGetItem = jest.fn(() => "mock-token");
Object.defineProperty(window, "localStorage", {
  value: { getItem: mockGetItem, setItem: jest.fn(), removeItem: jest.fn() },
  writable: true,
});

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_SCENARIOS: DrishtiScenarioOption[] = [
  {
    runUuid: "run-1",
    engineType: "pre_loan",
    label: "Baseline",
    createdAt: "2025-12-01T10:00:00Z",
  },
  {
    runUuid: "run-2",
    engineType: "climate_stress",
    label: "Drought scenario",
    createdAt: "2025-12-02T10:00:00Z",
  },
  {
    runUuid: "run-3",
    engineType: "household_portfolio",
    label: "Household mix",
    createdAt: "2025-12-03T10:00:00Z",
  },
];

const DEFAULT_PROPS: DrishtiPanelProps = {
  farmerId: 42,
  currentScore: 720,
  scenarios: MOCK_SCENARIOS,
};

const renderPanel = (overrides: Partial<DrishtiPanelProps> = {}) =>
  render(<DrishtiPanel {...DEFAULT_PROPS} {...overrides} />);

// ─── Tests ──────────────────────────────────────────────────────

describe("DrishtiPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetScenarioResult.mockResolvedValue({
      projections: { risk_score: 0.3 },
    });
  });

  // ─── Basic rendering ────────────────────────────────────────

  it("renders panel container", () => {
    renderPanel();
    expect(screen.getByTestId("drishti-panel")).toBeInTheDocument();
  });

  it("renders scenario selector", () => {
    renderPanel();
    expect(screen.getByTestId("scenario-select")).toBeInTheDocument();
  });

  it("renders scenario options from props", () => {
    renderPanel();

    const select = screen.getByTestId("scenario-select") as HTMLSelectElement;
    // Default option + 3 scenarios = 4 options
    expect(select.options).toHaveLength(4);
    expect(select.options[1].textContent).toContain("Baseline");
    expect(select.options[1].textContent).toContain("Pre-Loan Analysis");
    expect(select.options[2].textContent).toContain("Drought scenario");
  });

  // ─── Idle state ─────────────────────────────────────────────

  it("shows idle message when no scenario selected", () => {
    renderPanel();

    expect(screen.getByTestId("projection-idle")).toBeInTheDocument();
    expect(screen.getByTestId("projection-idle")).toHaveTextContent(
      "Select a scenario above to see projected TRUST impact.",
    );
  });

  // ─── Loading state ──────────────────────────────────────────

  it("selecting scenario shows loading skeleton", async () => {
    // Make the preview hang
    mockPreviewTrustScore.mockReturnValue(new Promise(() => {}));

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-1" },
      });
    });

    expect(screen.getByTestId("projection-loading")).toBeInTheDocument();
  });

  it('loading state has skeleton with role="status"', async () => {
    mockPreviewTrustScore.mockReturnValue(new Promise(() => {}));

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-1" },
      });
    });

    const skeleton = screen.getByTestId("skeleton-score");
    expect(skeleton).toHaveAttribute("role", "status");
    expect(skeleton).toHaveAttribute("aria-label", "Loading projected score");
  });

  // ─── Successful projection ─────────────────────────────────

  it("successful preview shows projected score delta", async () => {
    mockPreviewTrustScore.mockResolvedValue({
      projectedScore: 680,
      currentScore: 720,
      scenarioRunUuid: "run-2",
    });

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-2" },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("projection-ready")).toBeInTheDocument();
    });

    expect(screen.getByTestId("current-score")).toHaveTextContent("720");
    expect(screen.getByTestId("projected-score")).toHaveTextContent("680");
    expect(screen.getByTestId("score-delta")).toHaveTextContent("(-40)");
  });

  it("shows scenario label in the projection result", async () => {
    mockPreviewTrustScore.mockResolvedValue({
      projectedScore: 680,
      currentScore: 720,
      scenarioRunUuid: "run-2",
    });

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-2" },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("projection-ready")).toHaveTextContent(
        "Drought scenario",
      );
    });
  });

  // ─── Delta styling ─────────────────────────────────────────

  it("negative delta renders red styling", async () => {
    mockPreviewTrustScore.mockResolvedValue({
      projectedScore: 650,
      currentScore: 720,
      scenarioRunUuid: "run-1",
    });

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-1" },
      });
    });

    await waitFor(() => {
      const delta = screen.getByTestId("score-delta");
      expect(delta.className).toContain("text-red-700");
    });
  });

  it("positive delta renders green styling", async () => {
    mockPreviewTrustScore.mockResolvedValue({
      projectedScore: 800,
      currentScore: 720,
      scenarioRunUuid: "run-1",
    });

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-1" },
      });
    });

    await waitFor(() => {
      const delta = screen.getByTestId("score-delta");
      expect(delta.className).toContain("text-emerald-700");
      expect(delta).toHaveTextContent("(+80)");
    });
  });

  it("zero delta renders neutral styling", async () => {
    mockPreviewTrustScore.mockResolvedValue({
      projectedScore: 720,
      currentScore: 720,
      scenarioRunUuid: "run-1",
    });

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-1" },
      });
    });

    await waitFor(() => {
      const delta = screen.getByTestId("score-delta");
      expect(delta.className).toContain("text-neutral-500");
      expect(delta).toHaveTextContent("(0)");
    });
  });

  // ─── Error state ────────────────────────────────────────────

  it("error shows inline error message", async () => {
    mockPreviewTrustScore.mockRejectedValue(new Error("Network failure"));

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-1" },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("projection-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("projection-error")).toHaveTextContent(
      "Network failure",
    );
  });

  it("error has role=alert", async () => {
    mockPreviewTrustScore.mockRejectedValue(new Error("Server error"));

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-1" },
      });
    });

    await waitFor(() => {
      const errorEl = screen.getByTestId("projection-error");
      expect(errorEl).toHaveAttribute("role", "alert");
    });
  });

  it("error shows retry button", async () => {
    mockPreviewTrustScore.mockRejectedValue(new Error("Timeout"));

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-1" },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("retry-btn")).toBeInTheDocument();
      expect(screen.getByTestId("retry-btn")).toHaveTextContent("Retry");
    });
  });

  it("retry re-fetches the projection", async () => {
    // First call fails
    mockPreviewTrustScore.mockRejectedValueOnce(new Error("Fail"));

    renderPanel();

    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-1" },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("retry-btn")).toBeInTheDocument();
    });

    // Second call succeeds
    mockPreviewTrustScore.mockResolvedValueOnce({
      projectedScore: 750,
      currentScore: 720,
      scenarioRunUuid: "run-1",
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("retry-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("projection-ready")).toBeInTheDocument();
    });

    expect(screen.getByTestId("projected-score")).toHaveTextContent("750");
    // 2 calls total: initial fail + retry
    expect(mockPreviewTrustScore).toHaveBeenCalledTimes(2);
  });

  // ─── Resetting selection ────────────────────────────────────

  it("selecting empty option returns to idle", async () => {
    mockPreviewTrustScore.mockResolvedValue({
      projectedScore: 680,
      currentScore: 720,
      scenarioRunUuid: "run-1",
    });

    renderPanel();

    // Select scenario
    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "run-1" },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("projection-ready")).toBeInTheDocument();
    });

    // Reset to empty
    await act(async () => {
      fireEvent.change(screen.getByTestId("scenario-select"), {
        target: { value: "" },
      });
    });

    expect(screen.getByTestId("projection-idle")).toBeInTheDocument();
  });

  // ─── Accessibility ──────────────────────────────────────────

  it("has label for scenario selector", () => {
    renderPanel();

    const label = screen.getByText(
      /Select a DRISHTI scenario to preview projected TRUST score/,
    );
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute("for", "scenario-select");
  });
});
