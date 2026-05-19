/**
 * stressMode — Unit Tests (D6)
 *
 * Tests:
 *   REDUCER
 *   1.  Initial state is inactive
 *   2.  FETCH_START sets loading
 *   3.  FETCH_SUCCESS populates maps + sets active
 *   4.  FETCH_ERROR sets error, keeps inactive
 *   5.  RESET restores initial state
 *
 *   resolveDecision
 *   6.  Returns original when stress inactive
 *   7.  Returns stressed decision when active
 *   8.  Falls back to original when farmer not in stress map
 *
 *   countChanges
 *   9.  Counts worsened correctly
 *  10.  Counts improved correctly
 *  11.  Counts unchanged correctly
 *  12.  All unchanged when stress map empty
 */

import {
  stressReducer,
  INITIAL_STRESS_STATE,
  resolveDecision,
  countChanges,
  type StressState,
  type StressResult,
  type StressAction,
} from "@/app/dashboard/portfolio/stressMode";

// ─── Reducer tests ──────────────────────────────────────────────

describe("stressReducer", () => {
  it("initial state is inactive", () => {
    expect(INITIAL_STRESS_STATE.active).toBe(false);
    expect(INITIAL_STRESS_STATE.loading).toBe(false);
    expect(INITIAL_STRESS_STATE.error).toBeNull();
    expect(INITIAL_STRESS_STATE.stressedDecisions.size).toBe(0);
  });

  it("FETCH_START sets loading", () => {
    const next = stressReducer(INITIAL_STRESS_STATE, { type: "FETCH_START" });

    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
    expect(next.active).toBe(false);
  });

  it("FETCH_SUCCESS populates maps and sets active", () => {
    const results: StressResult[] = [
      { farmerId: 1, stressedDecision: "REJECT", stressedScore: 380 },
      { farmerId: 2, stressedDecision: "RECONSIDER", stressedScore: 520 },
    ];

    const loading: StressState = { ...INITIAL_STRESS_STATE, loading: true };
    const next = stressReducer(loading, { type: "FETCH_SUCCESS", results });

    expect(next.active).toBe(true);
    expect(next.loading).toBe(false);
    expect(next.stressedDecisions.get(1)).toBe("REJECT");
    expect(next.stressedDecisions.get(2)).toBe("RECONSIDER");
    expect(next.stressedScores.get(1)).toBe(380);
    expect(next.stressedScores.get(2)).toBe(520);
  });

  it("FETCH_ERROR sets error, keeps inactive", () => {
    const loading: StressState = { ...INITIAL_STRESS_STATE, loading: true };
    const next = stressReducer(loading, {
      type: "FETCH_ERROR",
      error: "Network error",
    });

    expect(next.loading).toBe(false);
    expect(next.error).toBe("Network error");
    expect(next.active).toBe(false);
  });

  it("RESET restores initial state", () => {
    const active: StressState = {
      active: true,
      loading: false,
      error: null,
      stressedDecisions: new Map([[1, "REJECT"]]),
      stressedScores: new Map([[1, 380]]),
    };

    const next = stressReducer(active, { type: "RESET" });

    expect(next.active).toBe(false);
    expect(next.stressedDecisions.size).toBe(0);
    expect(next.stressedScores.size).toBe(0);
  });
});

// ─── resolveDecision tests ──────────────────────────────────────

describe("resolveDecision", () => {
  it("returns original when stress inactive", () => {
    expect(resolveDecision(1, "SANCTION", INITIAL_STRESS_STATE)).toBe("SANCTION");
  });

  it("returns stressed decision when active", () => {
    const state: StressState = {
      active: true,
      loading: false,
      error: null,
      stressedDecisions: new Map([[1, "REJECT"]]),
      stressedScores: new Map([[1, 380]]),
    };

    expect(resolveDecision(1, "SANCTION", state)).toBe("REJECT");
  });

  it("falls back to original when farmer not in stress map", () => {
    const state: StressState = {
      active: true,
      loading: false,
      error: null,
      stressedDecisions: new Map([[99, "REJECT"]]),
      stressedScores: new Map([[99, 380]]),
    };

    expect(resolveDecision(1, "SANCTION", state)).toBe("SANCTION");
  });
});

// ─── countChanges tests ─────────────────────────────────────────

describe("countChanges", () => {
  const farmers = [
    { farmerId: 1, decision: "SANCTION" as const },
    { farmerId: 2, decision: "SANCTION" as const },
    { farmerId: 3, decision: "RECONSIDER" as const },
    { farmerId: 4, decision: "REJECT" as const },
  ];

  it("counts worsened correctly", () => {
    const state: StressState = {
      active: true,
      loading: false,
      error: null,
      stressedDecisions: new Map([
        [1, "REJECT"],    // SANCTION→REJECT = worsened
        [2, "RECONSIDER"], // SANCTION→RECONSIDER = worsened
      ]),
      stressedScores: new Map(),
    };

    const result = countChanges(farmers, state);
    expect(result.worsened).toBe(2);
  });

  it("counts improved correctly", () => {
    const state: StressState = {
      active: true,
      loading: false,
      error: null,
      stressedDecisions: new Map([
        [4, "SANCTION"], // REJECT→SANCTION = improved
      ]),
      stressedScores: new Map(),
    };

    const result = countChanges(farmers, state);
    expect(result.improved).toBe(1);
  });

  it("counts unchanged correctly", () => {
    const state: StressState = {
      active: true,
      loading: false,
      error: null,
      stressedDecisions: new Map([
        [1, "REJECT"], // worsened
      ]),
      stressedScores: new Map(),
    };

    const result = countChanges(farmers, state);
    // 3 unchanged (farmer 2, 3, 4 not in map = unchanged)
    expect(result.unchanged).toBe(3);
  });

  it("all unchanged when stress map empty", () => {
    const state: StressState = {
      active: true,
      loading: false,
      error: null,
      stressedDecisions: new Map(),
      stressedScores: new Map(),
    };

    const result = countChanges(farmers, state);
    expect(result.unchanged).toBe(4);
    expect(result.worsened).toBe(0);
    expect(result.improved).toBe(0);
  });
});
