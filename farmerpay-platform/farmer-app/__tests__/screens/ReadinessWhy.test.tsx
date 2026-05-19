/**
 * ReadinessWhyScreen — Behavior tests.
 * Variants: scores hidden, scores shown, missing FHS, loading, error.
 */

import React from "react";
import renderer, { act } from "react-test-renderer";

// ─── Mocks ─────────────────────────────────────────────────────────

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    const React = require("react");
    React.useEffect(() => { cb(); }, []);
  },
}));

const mockStore: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
  setItem: jest.fn(async (key: string, val: string) => { mockStore[key] = val; }),
  removeItem: jest.fn(async (key: string) => { delete mockStore[key]; }),
  multiRemove: jest.fn(async () => {}),
}));

const mockWhyData = {
  state: "almost_ready",
  reasons: [
    { field: "trust", status: "met", band: "building" },
    { field: "fhs", status: "below", band: "low" },
  ],
  components: {
    trust: { band: "building", met: true, threshold: 60, score: 72 },
    financialHealth: { band: "low", met: false, threshold: 50, score: 38 },
  },
  nextSteps: [
    { labelKey: "readiness.next.close_gap", action: "You are close — address the items below threshold" },
  ],
};

const mockWhyDataMissingFhs = {
  state: "needs_data",
  reasons: [
    { field: "trust", status: "met", band: "building" },
    { field: "fhs", status: "missing" },
  ],
  components: {
    trust: { band: "building", met: true, threshold: 60, score: 72 },
  },
  nextSteps: [
    { labelKey: "readiness.next.link_bank", action: "Link your bank account via Account Aggregator" },
  ],
};

let mockApiResult: any = mockWhyData;
let mockApiThrows = false;
let mockShowScores = false;

jest.mock("../../lib/readiness", () => ({
  getReadinessWhy: jest.fn(async () => {
    if (mockApiThrows) throw new Error("Network error");
    return mockApiResult;
  }),
  // ReadinessWhy screen now gates on the farmerBadge flag; without
  // this mock the real getReadinessFlags runs, errors/redirects, and
  // every assertion ends up on the error screen.
  getReadinessFlags: jest.fn(async () => ({
    farmerBadge: true,
    sathiCoachingPriority: false,
    bankerMatrix: false,
  })),
  getShowNumericScores: jest.fn(async () => mockShowScores),
  setShowNumericScores: jest.fn(async () => {}),
  mapState: jest.fn((s: string) => {
    switch (s) {
      case "ready": return "ready";
      case "almost_ready": return "almost";
      case "not_ready": return "notReady";
      case "needs_data": return "needsData";
      default: return "needsData";
    }
  }),
}));

import ReadinessWhyScreen from "../../app/readiness-why";

/**
 * Recursively extract all text content from a rendered tree.
 */
function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node.children) return node.children.map(extractText).join("");
  return "";
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  mockApiResult = mockWhyData;
  mockApiThrows = false;
  mockShowScores = false;
});

// ═══════════════════════════════════════════════════════════════════

describe("ReadinessWhyScreen", () => {
  it("renders with scores hidden (default) — shows bands, no numbers", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessWhyScreen />);
    });
    const text = extractText(tree!.toJSON());
    expect(text).toContain("Building");
    expect(text).toContain("Low");
    // Numeric scores should NOT appear when toggle is off
    expect(text).not.toContain("72");
    expect(text).not.toContain("38");
  });

  it("renders with scores shown — includes numeric values", async () => {
    mockShowScores = true;
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessWhyScreen />);
    });
    const text = extractText(tree!.toJSON());
    expect(text).toContain("72");
    expect(text).toContain("38");
    expect(text).toContain("Building");
    expect(text).toContain("Low");
  });

  it("renders with missing FHS — shows connect bank CTA", async () => {
    mockApiResult = mockWhyDataMissingFhs;
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessWhyScreen />);
    });
    const text = extractText(tree!.toJSON());
    expect(text).toContain("Connect your bank");
    expect(text).toContain("Account Aggregator");
    // FHS score row label should not appear
    expect(text).not.toContain("Financial Health");
  });

  it("renders error state with retry button", async () => {
    mockApiThrows = true;
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessWhyScreen />);
    });
    const text = extractText(tree!.toJSON());
    expect(text).toContain("Something went wrong");
    expect(text).toContain("Try Again");
  });

  it("renders empty state when API returns null", async () => {
    mockApiResult = null;
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessWhyScreen />);
    });
    const text = extractText(tree!.toJSON());
    expect(text).toContain("No Data Yet");
  });

  it("shows actionable next steps for missing FHS", async () => {
    mockApiResult = mockWhyDataMissingFhs;
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessWhyScreen />);
    });
    const text = extractText(tree!.toJSON());
    expect(text).toContain("Link your bank account");
  });

  it("maps almost_ready to Almost Ready badge label", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessWhyScreen />);
    });
    const text = extractText(tree!.toJSON());
    expect(text).toContain("Almost Ready");
  });

  it("shows title and subtitle", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessWhyScreen />);
    });
    const text = extractText(tree!.toJSON());
    expect(text).toContain("Your Loan-Readiness");
    expect(text).toContain("Why you are");
  });

  it("shows What will help section", async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<ReadinessWhyScreen />);
    });
    const text = extractText(tree!.toJSON());
    expect(text).toContain("What will help");
    expect(text).toContain("address the items below threshold");
  });
});
