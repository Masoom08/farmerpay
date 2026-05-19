/**
 * Farmer Home + Drill-Down — Visual regression snapshots.
 *
 * Baseline snapshots for role-gated farmer surfaces.
 * CI fails on unintended structural diffs.
 *
 * Surfaces:
 *   - LoanReadinessBadge: all 4 states
 *   - ReadinessWhy: scores hidden vs shown, missing FHS
 *
 * FHS gate: farmer role shows bands (not scores) unless toggled.
 */

import React from "react";
import renderer, { act } from "react-test-renderer";
import LoanReadinessBadge from "../../components/readiness/LoanReadinessBadge";
import type { ReadinessState } from "../../lib/readinessStrings";

// ─── Mocks for ReadinessWhy ──────────────────────────────────────

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

const mockWhyDataFull = {
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

let mockApiResult: any = mockWhyDataFull;
let mockShowScores = false;

jest.mock("../../lib/readiness", () => ({
  getReadinessWhy: jest.fn(async () => mockApiResult),
  // ReadinessWhy screen gates on farmerBadge; without the mock the
  // real getReadinessFlags runs, errors, and the screen ends up on
  // the error state for every assertion.
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
  mockApiResult = mockWhyDataFull;
  mockShowScores = false;
});

// ═══════════════════════════════════════════════════════════════════

const STATES: ReadinessState[] = ["ready", "almost", "notReady", "needsData"];

describe("Visual regression: Farmer readiness", () => {
  // ─── Badge snapshots ───────────────────────────────────────

  describe("LoanReadinessBadge — all states", () => {
    for (const state of STATES) {
      it(`snapshot: state="${state}"`, () => {
        let tree: renderer.ReactTestRenderer;
        act(() => {
          tree = renderer.create(
            <LoanReadinessBadge state={state} onPress={() => {}} />
          );
        });
        expect(tree!.toJSON()).toMatchSnapshot();
      });
    }
  });

  // ─── Drill-down: scores hidden (default) ───────────────────
  // NOTE: ReadinessWhyScreen tree is too large/deep for toMatchSnapshot().
  // We use text extraction + structural assertions instead (same pattern
  // as farmer-app/__tests__/screens/ReadinessWhy.test.tsx).

  describe("ReadinessWhy — scores hidden (default)", () => {
    it("renders bands visible, no numeric scores", async () => {
      let tree: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(<ReadinessWhyScreen />);
      });

      const text = extractText(tree!.toJSON());
      // Bands should be present (capitalized in UI)
      expect(text).toContain("Building");
      expect(text).toContain("Low");
      // Structural guard: no raw scores in output
      expect(text).not.toContain("72");
      expect(text).not.toContain("38");
    });
  });

  // ─── Drill-down: scores shown ─────────────────────────────

  describe("ReadinessWhy — scores shown", () => {
    it("renders numeric scores visible when toggled on", async () => {
      mockShowScores = true;
      let tree: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(<ReadinessWhyScreen />);
      });

      const text = extractText(tree!.toJSON());
      expect(text).toContain("72");
      expect(text).toContain("38");
    });
  });

  // ─── Drill-down: missing FHS ──────────────────────────────

  describe("ReadinessWhy — missing FHS", () => {
    it("renders connect bank CTA, no FHS score row", async () => {
      mockApiResult = mockWhyDataMissingFhs;
      let tree: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(<ReadinessWhyScreen />);
      });

      const text = extractText(tree!.toJSON());
      expect(text).toContain("Connect your bank");
      expect(text).not.toContain("Financial Health");
    });
  });

  // ─── FHS gate: farmer never sees raw FHS outside toggle ────

  describe("FHS gate enforcement", () => {
    it("scores-hidden mode never contains FHS numeric score in output", async () => {
      mockShowScores = false;
      let tree: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(<ReadinessWhyScreen />);
      });
      const text = extractText(tree!.toJSON());
      // FHS numeric score (38) must not appear
      expect(text).not.toContain("38");
    });
  });
});
