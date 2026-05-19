/**
 * useMissionRouter — Unit Tests (F1 — Spec §4 / §4.1 / §4.5)
 *
 * Tests:
 *   STATE MACHINE TRANSITIONS
 *   1.  Initial step is INTRO
 *   2.  next() advances INTRO → ACTION
 *   3.  next() advances ACTION → CONFIRM
 *   4.  next() advances CONFIRM → RESULT
 *   5.  next() on RESULT stays on RESULT
 *   6.  back() from ACTION → INTRO
 *   7.  back() from CONFIRM → ACTION
 *   8.  back() from INTRO calls onExit
 *   9.  goTo() jumps to specific step
 *  10.  stepIndex tracks position (0-based)
 *
 *   ANDROID BACK (§4.1)
 *  11.  Android back on ACTION returns to INTRO
 *  12.  Android back on CONFIRM returns to ACTION
 *  13.  Android back on INTRO calls onExit
 *
 *   PROGRESS PERSISTENCE (§4.5)
 *  14.  saveProgress stores data in AsyncStorage
 *  15.  loadProgress retrieves saved data
 *  16.  clearProgress removes saved data
 *  17.  hasResumableProgress true when saved past INTRO
 *  18.  resume() restores saved step
 *  19.  startFresh() clears data and resets to INTRO
 *  20.  Re-entry shows resume prompt
 */

import { renderHook, act } from "@testing-library/react-native";
import { BackHandler, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMissionRouter, STEP_ORDER } from "../useMissionRouter";

// ─── Mocks ─────────────────────────────────────────────────────

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

// Store the back handler callback so we can simulate pressing back
let backHandlerCallback: (() => boolean) | null = null;
jest.spyOn(BackHandler, "addEventListener").mockImplementation(
  (_event: string, handler: () => boolean) => {
    backHandlerCallback = handler;
    return { remove: jest.fn() };
  },
);

// ─── Helpers ───────────────────────────────────────────────────

const defaultOpts = {
  missionId: "test-mission",
  onExit: jest.fn(),
};

// ─── State machine tests ───────────────────────────────────────

describe("useMissionRouter (state machine)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    backHandlerCallback = null;
  });

  it("initial step is INTRO", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));
    expect(result.current.step).toBe("INTRO");
    expect(result.current.stepIndex).toBe(0);
  });

  it("next() advances INTRO → ACTION", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    act(() => { result.current.next(); });
    expect(result.current.step).toBe("ACTION");
  });

  it("next() advances ACTION → CONFIRM", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    act(() => { result.current.next(); }); // → ACTION
    act(() => { result.current.next(); }); // → CONFIRM
    expect(result.current.step).toBe("CONFIRM");
  });

  it("next() advances CONFIRM → RESULT", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    act(() => { result.current.next(); });
    act(() => { result.current.next(); });
    act(() => { result.current.next(); }); // → RESULT
    expect(result.current.step).toBe("RESULT");
  });

  it("next() on RESULT stays on RESULT", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    act(() => { result.current.next(); });
    act(() => { result.current.next(); });
    act(() => { result.current.next(); }); // → RESULT
    act(() => { result.current.next(); }); // still RESULT
    expect(result.current.step).toBe("RESULT");
  });

  it("back() from ACTION → INTRO", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    act(() => { result.current.next(); }); // → ACTION
    act(() => { result.current.back(); }); // → INTRO
    expect(result.current.step).toBe("INTRO");
  });

  it("back() from CONFIRM → ACTION", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    act(() => { result.current.next(); }); // → ACTION
    act(() => { result.current.next(); }); // → CONFIRM
    act(() => { result.current.back(); }); // → ACTION
    expect(result.current.step).toBe("ACTION");
  });

  it("back() from INTRO calls onExit", () => {
    const onExit = jest.fn();
    const { result } = renderHook(() =>
      useMissionRouter({ ...defaultOpts, onExit }),
    );

    act(() => { result.current.back(); });
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("goTo() jumps to specific step", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    act(() => { result.current.goTo("CONFIRM"); });
    expect(result.current.step).toBe("CONFIRM");
  });

  it("stepIndex tracks position (0-based)", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    expect(result.current.stepIndex).toBe(0);
    act(() => { result.current.next(); });
    expect(result.current.stepIndex).toBe(1);
    act(() => { result.current.next(); });
    expect(result.current.stepIndex).toBe(2);
    act(() => { result.current.next(); });
    expect(result.current.stepIndex).toBe(3);
  });
});

// ─── Android back tests ────────────────────────────────────────

describe("useMissionRouter (Android back)", () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    backHandlerCallback = null;
    (Platform as any).OS = "android";
  });

  afterEach(() => {
    (Platform as any).OS = originalPlatform;
  });

  it("Android back on ACTION returns to INTRO", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    act(() => { result.current.next(); }); // → ACTION
    expect(result.current.step).toBe("ACTION");

    // Simulate Android back
    act(() => {
      const consumed = backHandlerCallback?.();
      expect(consumed).toBe(true);
    });
    expect(result.current.step).toBe("INTRO");
  });

  it("Android back on CONFIRM returns to ACTION", () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    act(() => { result.current.next(); }); // → ACTION
    act(() => { result.current.next(); }); // → CONFIRM

    act(() => { backHandlerCallback?.(); });
    expect(result.current.step).toBe("ACTION");
  });

  it("Android back on INTRO calls onExit", () => {
    const onExit = jest.fn();
    renderHook(() => useMissionRouter({ ...defaultOpts, onExit }));

    act(() => { backHandlerCallback?.(); });
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

// ─── Progress persistence tests ────────────────────────────────

describe("useMissionRouter (progress)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("saveProgress stores data in AsyncStorage", async () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    await act(async () => {
      await result.current.saveProgress({ field: "value" });
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "farmerpay:mission:test-mission",
      expect.stringContaining('"field":"value"'),
    );
  });

  it("loadProgress retrieves saved data", async () => {
    const saved = JSON.stringify({
      step: "ACTION",
      data: { field: "loaded" },
      savedAt: Date.now(),
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(saved);

    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    let data: any;
    await act(async () => {
      data = await result.current.loadProgress();
    });

    expect(data).toEqual({ field: "loaded" });
  });

  it("clearProgress removes saved data", async () => {
    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    await act(async () => {
      await result.current.clearProgress();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "farmerpay:mission:test-mission",
    );
  });

  it("hasResumableProgress true when saved past INTRO", async () => {
    const saved = JSON.stringify({
      step: "ACTION",
      data: {},
      savedAt: Date.now(),
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(saved);

    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    // Wait for the async check
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.hasResumableProgress).toBe(true);
  });

  it("resume() restores saved step", async () => {
    const saved = JSON.stringify({
      step: "CONFIRM",
      data: { foo: "bar" },
      savedAt: Date.now(),
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(saved);

    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    await act(async () => {
      await result.current.resume();
    });

    expect(result.current.step).toBe("CONFIRM");
  });

  it("startFresh() clears data and resets to INTRO", async () => {
    const saved = JSON.stringify({
      step: "CONFIRM",
      data: {},
      savedAt: Date.now(),
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(saved);

    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    await act(async () => {
      await result.current.resume();
    });
    expect(result.current.step).toBe("CONFIRM");

    await act(async () => {
      await result.current.startFresh();
    });

    expect(result.current.step).toBe("INTRO");
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
    expect(result.current.hasResumableProgress).toBe(false);
  });

  it("re-entry with saved progress shows resume prompt flag", async () => {
    const saved = JSON.stringify({
      step: "ACTION",
      data: { partial: true },
      savedAt: Date.now(),
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(saved);

    const { result } = renderHook(() => useMissionRouter(defaultOpts));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Hook starts at INTRO but flags resumable progress
    expect(result.current.step).toBe("INTRO");
    expect(result.current.hasResumableProgress).toBe(true);
  });
});
