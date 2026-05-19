/**
 * StressBar — Unit Tests (D6)
 *
 * Tests:
 *   RENDERING
 *   1.  Renders stress bar container
 *   2.  Shows trigger button when inactive
 *   3.  Trigger button text is "DRISHTI stress test"
 *   4.  Trigger disabled when no farmers
 *
 *   STRESS ACTIVATION
 *   5.  Click trigger → calls fetchStressResults → fires onStressChange with active state
 *   6.  Shows loading text while fetching
 *   7.  Error state renders error message
 *
 *   ACTIVE MODE
 *   8.  Shows STRESS MODE badge when active
 *   9.  Shows worsened count
 *  10.  Shows improved count
 *  11.  Shows unchanged count
 *  12.  Shows Reset button when active
 *  13.  Hides trigger button when active
 *
 *   RESET
 *  14.  Click Reset → fires onStressChange with inactive state
 *  15.  After reset, trigger button reappears
 *
 *   A11Y
 *  16.  aria-live region present
 *  17.  Live region announces mode change on activate
 *  18.  Live region announces on reset
 *
 *   HEATMAP INTEGRATION
 *  19.  Heatmap cells change colour under stress
 *  20.  Heatmap cells restore colour after reset
 *  21.  Cells use 320ms transition in stress mode
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { StressBar, type StressBarProps } from "@/components/portfolio/StressBar";
import {
  PortfolioHeatmap,
  type PortfolioHeatmapProps,
  type HeatmapFarmer,
} from "@/components/portfolio/PortfolioHeatmap";
import {
  INITIAL_STRESS_STATE,
  type StressState,
  type Decision,
} from "@/app/dashboard/portfolio/stressMode";

// ─── Mocks ─────────────────────────────────────────────────────

const mockApiPost = jest.fn();
jest.mock("@/lib/api", () => ({
  apiGet: jest.fn(),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}));

Object.defineProperty(window, "localStorage", {
  value: { getItem: jest.fn(() => "mock-token"), setItem: jest.fn(), removeItem: jest.fn() },
  writable: true,
});

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_FARMERS: { farmerId: number; decision: Decision }[] = [
  { farmerId: 1, decision: "SANCTION" },
  { farmerId: 2, decision: "SANCTION" },
  { farmerId: 3, decision: "RECONSIDER" },
  { farmerId: 4, decision: "REJECT" },
];

const MOCK_STRESS_RESPONSE = {
  data: [
    { farmerId: 1, stressedDecision: "REJECT", stressedScore: 380 },
    { farmerId: 2, stressedDecision: "RECONSIDER", stressedScore: 520 },
    // farmer 3 and 4 not in response → unchanged
  ],
};

const DEFAULT_PROPS: StressBarProps = {
  farmers: MOCK_FARMERS,
  onStressChange: jest.fn(),
};

const renderBar = (overrides: Partial<StressBarProps> = {}) =>
  render(<StressBar {...DEFAULT_PROPS} {...overrides} />);

// ─── Rendering tests ────────────────────────────────────────────

describe("StressBar (rendering)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders stress bar container", () => {
    renderBar();
    expect(screen.getByTestId("stress-bar")).toBeInTheDocument();
  });

  it("shows trigger button when inactive", () => {
    renderBar();
    expect(screen.getByTestId("stress-trigger-btn")).toBeInTheDocument();
  });

  it('trigger button text is "DRISHTI stress test"', () => {
    renderBar();
    expect(screen.getByTestId("stress-trigger-btn")).toHaveTextContent("DRISHTI stress test");
  });

  it("trigger disabled when no farmers", () => {
    renderBar({ farmers: [] });
    expect(screen.getByTestId("stress-trigger-btn")).toBeDisabled();
  });
});

// ─── Stress activation tests ────────────────────────────────────

describe("StressBar (activation)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPost.mockResolvedValue(MOCK_STRESS_RESPONSE);
  });

  it("click trigger → calls API and fires onStressChange with active state", async () => {
    const onStressChange = jest.fn();
    renderBar({ onStressChange });

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-trigger-btn"));
    });

    await waitFor(() => {
      expect(onStressChange).toHaveBeenCalledTimes(1);
    });

    const state = onStressChange.mock.calls[0][0] as StressState;
    expect(state.active).toBe(true);
    expect(state.stressedDecisions.get(1)).toBe("REJECT");
    expect(state.stressedDecisions.get(2)).toBe("RECONSIDER");
  });

  it("shows loading text while fetching", async () => {
    mockApiPost.mockReturnValue(new Promise(() => {})); // never resolves
    renderBar();

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-trigger-btn"));
    });

    expect(screen.getByTestId("stress-loading")).toBeInTheDocument();
  });

  it("error state renders error message", async () => {
    mockApiPost.mockRejectedValue(new Error("Network error"));
    renderBar();

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-trigger-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("stress-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("stress-error")).toHaveTextContent("Network error");
  });
});

// ─── Active mode tests ──────────────────────────────────────────

describe("StressBar (active mode)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPost.mockResolvedValue(MOCK_STRESS_RESPONSE);
  });

  async function activateStress(overrides: Partial<StressBarProps> = {}) {
    const result = renderBar(overrides);

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-trigger-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("stress-badge")).toBeInTheDocument();
    });

    return result;
  }

  it("shows STRESS MODE badge", async () => {
    await activateStress();
    expect(screen.getByTestId("stress-badge")).toHaveTextContent("STRESS MODE");
  });

  it("shows worsened count", async () => {
    await activateStress();
    // farmer 1: SANCTION→REJECT (worsened), farmer 2: SANCTION→RECONSIDER (worsened)
    expect(screen.getByTestId("stress-worsened")).toHaveTextContent("2 worsened");
  });

  it("shows improved count", async () => {
    await activateStress();
    expect(screen.getByTestId("stress-improved")).toHaveTextContent("0 improved");
  });

  it("shows unchanged count", async () => {
    await activateStress();
    // farmers 3 and 4 not in stress response
    expect(screen.getByTestId("stress-unchanged")).toHaveTextContent("2 unchanged");
  });

  it("shows Reset button", async () => {
    await activateStress();
    expect(screen.getByTestId("stress-reset-btn")).toBeInTheDocument();
  });

  it("hides trigger button", async () => {
    await activateStress();
    expect(screen.queryByTestId("stress-trigger-btn")).not.toBeInTheDocument();
  });
});

// ─── Reset tests ────────────────────────────────────────────────

describe("StressBar (reset)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPost.mockResolvedValue(MOCK_STRESS_RESPONSE);
  });

  it("click Reset → fires onStressChange with inactive state", async () => {
    const onStressChange = jest.fn();
    renderBar({ onStressChange });

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-trigger-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("stress-reset-btn")).toBeInTheDocument();
    });

    onStressChange.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-reset-btn"));
    });

    expect(onStressChange).toHaveBeenCalledWith(
      expect.objectContaining({ active: false }),
    );
  });

  it("after reset, trigger button reappears", async () => {
    renderBar();

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-trigger-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("stress-reset-btn")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-reset-btn"));
    });

    expect(screen.getByTestId("stress-trigger-btn")).toBeInTheDocument();
  });
});

// ─── Accessibility tests ────────────────────────────────────────

describe("StressBar (a11y)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPost.mockResolvedValue(MOCK_STRESS_RESPONSE);
  });

  it("aria-live region present", () => {
    renderBar();

    const live = screen.getByTestId("stress-live-region");
    expect(live).toBeInTheDocument();
    expect(live).toHaveAttribute("role", "status");
    expect(live).toHaveAttribute("aria-live", "polite");
  });

  it("live region announces mode change on activate", async () => {
    renderBar();

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-trigger-btn"));
    });

    await waitFor(() => {
      const live = screen.getByTestId("stress-live-region");
      expect(live.textContent).toContain("Stress test complete");
    });
  });

  it("live region announces on reset", async () => {
    renderBar();

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-trigger-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("stress-reset-btn")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("stress-reset-btn"));
    });

    const live = screen.getByTestId("stress-live-region");
    expect(live.textContent).toContain("reset");
  });
});

// ─── Heatmap integration tests ──────────────────────────────────

describe("PortfolioHeatmap (stress integration)", () => {
  const HEATMAP_FARMERS: HeatmapFarmer[] = [
    { farmerId: 1, name: "Rajesh", village: "Wardha", score: 720, decision: "SANCTION", dataAgeDays: 5 },
    { farmerId: 2, name: "Sita", village: "Wardha", score: 650, decision: "SANCTION", dataAgeDays: 10 },
    { farmerId: 3, name: "Mohan", village: "Wardha", score: 450, decision: "REJECT", dataAgeDays: 20 },
  ];

  const ACTIVE_STRESS: StressState = {
    active: true,
    loading: false,
    error: null,
    stressedDecisions: new Map([
      [1, "REJECT"],      // was SANCTION → now REJECT
      [2, "RECONSIDER"],  // was SANCTION → now RECONSIDER
    ]),
    stressedScores: new Map([
      [1, 380],
      [2, 520],
    ]),
  };

  const renderHeatmap = (overrides: Partial<PortfolioHeatmapProps> = {}) =>
    render(
      <PortfolioHeatmap
        farmers={HEATMAP_FARMERS}
        cellSize={32}
        groupBy="none"
        showLetters={false}
        onSelect={jest.fn()}
        {...overrides}
      />,
    );

  it("cells change colour under stress", () => {
    renderHeatmap({ stressState: ACTIVE_STRESS });

    // Farmer 1 was SANCTION (green-600) → now REJECT (red-600)
    const cell1 = screen.getByTestId("cell-1");
    expect(cell1.className).toContain("bg-red-600");
    expect(cell1.className).not.toContain("bg-green-600");

    // Farmer 2 was SANCTION → now RECONSIDER (amber-500)
    const cell2 = screen.getByTestId("cell-2");
    expect(cell2.className).toContain("bg-amber-500");
  });

  it("cells restore colour after reset (no stress)", () => {
    renderHeatmap({ stressState: INITIAL_STRESS_STATE });

    // Farmer 1 should be SANCTION (green-600)
    const cell1 = screen.getByTestId("cell-1");
    expect(cell1.className).toContain("bg-green-600");

    // Farmer 3 should be REJECT (red-600) — original
    const cell3 = screen.getByTestId("cell-3");
    expect(cell3.className).toContain("bg-red-600");
  });

  it("cells use 320ms transition in stress mode", () => {
    renderHeatmap({ stressState: ACTIVE_STRESS });

    const cell1 = screen.getByTestId("cell-1");
    expect(cell1.style.transitionDuration).toBe("320ms");
  });

  it("cells use 100ms transition when not stressed", () => {
    renderHeatmap({ stressState: null });

    const cell1 = screen.getByTestId("cell-1");
    expect(cell1.style.transitionDuration).toBe("100ms");
  });

  it("farmer not in stress map keeps original decision", () => {
    renderHeatmap({ stressState: ACTIVE_STRESS });

    // Farmer 3 not in stress map → stays REJECT (red-600)
    const cell3 = screen.getByTestId("cell-3");
    expect(cell3.className).toContain("bg-red-600");
  });
});
