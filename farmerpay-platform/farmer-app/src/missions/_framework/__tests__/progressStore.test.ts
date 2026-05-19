/**
 * progressStore — Unit Tests (F6 — Spec §4.5)
 *
 * Tests:
 *   SAVE / LOAD
 *   1.  saveProgress stores entry in AsyncStorage
 *   2.  loadProgress retrieves saved entry
 *   3.  loadProgress returns null when not found
 *   4.  loadProgress returns null when expired (>24h)
 *   5.  loadProgress cleans up expired entries
 *   6.  loadProgress returns entry within 24h window
 *
 *   RESUME
 *   7.  hasResumableProgress true for ACTION step within 24h
 *   8.  hasResumableProgress false for INTRO step
 *   9.  hasResumableProgress false for RESULT step
 *  10.  hasResumableProgress false when expired
 *  11.  getAllResumable returns only valid non-INTRO/RESULT entries
 *
 *   CLEAR
 *  12.  clearProgress removes entry
 *
 *   POINT-LIFT HONESTY
 *  13.  comparePointLift: same values → differs=false
 *  14.  comparePointLift: different values → differs=true
 *  15.  comparePointLift: actual > estimated → betterThanEstimated=true
 *  16.  comparePointLift: actual < estimated → betterThanEstimated=false
 *  17.  comparePointLift: delta is absolute
 *  18.  buildHonestyStrings: null when no difference
 *  19.  buildHonestyStrings: returns strings when different (en)
 *  20.  buildHonestyStrings: returns strings when different (hi)
 *  21.  buildHonestyStrings: explanation line present
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  saveProgress,
  loadProgress,
  hasResumableProgress,
  clearProgress,
  getAllResumable,
  comparePointLift,
  buildHonestyStrings,
  RESUME_WINDOW_MS,
  PROGRESS_PREFIX,
} from "../progressStore";

// ─── Mock ──────────────────────────────────────────────────────

jest.mock("@react-native-async-storage/async-storage", () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    __clear: () => { store = {}; },
  };
});

const clearStore = () => (AsyncStorage as any).__clear();

// ─── Constants ─────────────────────────────────────────────────

const NOW = 1700000000000; // fixed timestamp
const FRESH = NOW - 1000; // 1s ago
const EXPIRED = NOW - RESUME_WINDOW_MS - 1000; // 24h+1s ago

// ─── Save / Load ───────────────────────────────────────────────

describe("progressStore (save/load)", () => {
  beforeEach(() => {
    clearStore();
    jest.clearAllMocks();
  });

  it("saveProgress stores entry in AsyncStorage", async () => {
    await saveProgress("aa-f1", "ACTION", { field: "val" });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      `${PROGRESS_PREFIX}aa-f1`,
      expect.stringContaining('"step":"ACTION"'),
    );
  });

  it("loadProgress retrieves saved entry", async () => {
    await saveProgress("aa-f1", "ACTION", { x: 1 });

    const entry = await loadProgress("aa-f1");
    expect(entry).not.toBeNull();
    expect(entry!.missionId).toBe("aa-f1");
    expect(entry!.step).toBe("ACTION");
    expect(entry!.data).toEqual({ x: 1 });
  });

  it("loadProgress returns null when not found", async () => {
    const entry = await loadProgress("nonexistent");
    expect(entry).toBeNull();
  });

  it("loadProgress returns null when expired (>24h)", async () => {
    // Manually store an old entry
    const oldEntry = {
      missionId: "aa-f1",
      step: "ACTION",
      data: {},
      savedAt: EXPIRED,
    };
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}aa-f1`,
      JSON.stringify(oldEntry),
    );

    const entry = await loadProgress("aa-f1", NOW);
    expect(entry).toBeNull();
  });

  it("loadProgress cleans up expired entries", async () => {
    const oldEntry = {
      missionId: "aa-f1",
      step: "ACTION",
      data: {},
      savedAt: EXPIRED,
    };
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}aa-f1`,
      JSON.stringify(oldEntry),
    );

    await loadProgress("aa-f1", NOW);

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      `${PROGRESS_PREFIX}aa-f1`,
    );
  });

  it("loadProgress returns entry within 24h window", async () => {
    const freshEntry = {
      missionId: "aa-f1",
      step: "CONFIRM",
      data: { partial: true },
      savedAt: FRESH,
    };
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}aa-f1`,
      JSON.stringify(freshEntry),
    );

    const entry = await loadProgress("aa-f1", NOW);
    expect(entry).not.toBeNull();
    expect(entry!.step).toBe("CONFIRM");
  });
});

// ─── Resume ────────────────────────────────────────────────────

describe("progressStore (resume)", () => {
  beforeEach(() => {
    clearStore();
    jest.clearAllMocks();
  });

  it("hasResumableProgress true for ACTION step within 24h", async () => {
    const entry = {
      missionId: "aa-f1",
      step: "ACTION",
      data: {},
      savedAt: FRESH,
    };
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}aa-f1`,
      JSON.stringify(entry),
    );

    expect(await hasResumableProgress("aa-f1", NOW)).toBe(true);
  });

  it("hasResumableProgress false for INTRO step", async () => {
    const entry = {
      missionId: "aa-f1",
      step: "INTRO",
      data: {},
      savedAt: FRESH,
    };
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}aa-f1`,
      JSON.stringify(entry),
    );

    expect(await hasResumableProgress("aa-f1", NOW)).toBe(false);
  });

  it("hasResumableProgress false for RESULT step", async () => {
    const entry = {
      missionId: "aa-f1",
      step: "RESULT",
      data: {},
      savedAt: FRESH,
    };
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}aa-f1`,
      JSON.stringify(entry),
    );

    expect(await hasResumableProgress("aa-f1", NOW)).toBe(false);
  });

  it("hasResumableProgress false when expired", async () => {
    const entry = {
      missionId: "aa-f1",
      step: "ACTION",
      data: {},
      savedAt: EXPIRED,
    };
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}aa-f1`,
      JSON.stringify(entry),
    );

    expect(await hasResumableProgress("aa-f1", NOW)).toBe(false);
  });

  it("getAllResumable returns only valid non-INTRO/RESULT entries", async () => {
    // Fresh ACTION
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}m1`,
      JSON.stringify({ missionId: "m1", step: "ACTION", data: {}, savedAt: FRESH }),
    );
    // Fresh INTRO (excluded)
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}m2`,
      JSON.stringify({ missionId: "m2", step: "INTRO", data: {}, savedAt: FRESH }),
    );
    // Fresh CONFIRM
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}m3`,
      JSON.stringify({ missionId: "m3", step: "CONFIRM", data: {}, savedAt: FRESH }),
    );
    // Expired ACTION (excluded)
    await AsyncStorage.setItem(
      `${PROGRESS_PREFIX}m4`,
      JSON.stringify({ missionId: "m4", step: "ACTION", data: {}, savedAt: EXPIRED }),
    );

    const results = await getAllResumable(["m1", "m2", "m3", "m4"], NOW);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.missionId).sort()).toEqual(["m1", "m3"]);
  });
});

// ─── Clear ─────────────────────────────────────────────────────

describe("progressStore (clear)", () => {
  beforeEach(() => {
    clearStore();
    jest.clearAllMocks();
  });

  it("clearProgress removes entry", async () => {
    await saveProgress("aa-f1", "ACTION", {});
    await clearProgress("aa-f1");

    const entry = await loadProgress("aa-f1");
    expect(entry).toBeNull();
  });
});

// ─── Point-lift honesty ────────────────────────────────────────

describe("progressStore (point-lift honesty)", () => {
  it("comparePointLift: same values → differs=false", () => {
    const result = comparePointLift(25, 25);
    expect(result.differs).toBe(false);
    expect(result.delta).toBe(0);
  });

  it("comparePointLift: different values → differs=true", () => {
    const result = comparePointLift(25, 18);
    expect(result.differs).toBe(true);
  });

  it("comparePointLift: actual > estimated → betterThanEstimated=true", () => {
    const result = comparePointLift(25, 30);
    expect(result.betterThanEstimated).toBe(true);
  });

  it("comparePointLift: actual < estimated → betterThanEstimated=false", () => {
    const result = comparePointLift(25, 18);
    expect(result.betterThanEstimated).toBe(false);
  });

  it("comparePointLift: delta is absolute", () => {
    expect(comparePointLift(25, 18).delta).toBe(7);
    expect(comparePointLift(18, 25).delta).toBe(7);
  });

  it("buildHonestyStrings: null when no difference", () => {
    const result = comparePointLift(25, 25);
    expect(buildHonestyStrings(result)).toBeNull();
  });

  it("buildHonestyStrings: returns strings when different (en)", () => {
    const result = comparePointLift(25, 18);
    const strings = buildHonestyStrings(result, "en");

    expect(strings).not.toBeNull();
    expect(strings!.estimatedLine).toBe("Estimated: +25 points");
    expect(strings!.actualLine).toBe("Actual: +18 points");
  });

  it("buildHonestyStrings: returns strings when different (hi)", () => {
    const result = comparePointLift(25, 18);
    const strings = buildHonestyStrings(result, "hi");

    expect(strings).not.toBeNull();
    expect(strings!.estimatedLine).toBe("अनुमानित: +25 अंक");
    expect(strings!.actualLine).toBe("वास्तविक: +18 अंक");
  });

  it("buildHonestyStrings: explanation line present", () => {
    const result = comparePointLift(25, 18);
    const strings = buildHonestyStrings(result, "en");

    expect(strings!.explanationLine).toContain("may differ");
  });
});
