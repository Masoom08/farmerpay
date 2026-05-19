/**
 * useTts — Unit Tests (E6)
 *
 * Tests:
 *   1.  Initially isSpeaking is false
 *   2.  toggle() calls Speech.speak with correct en-IN language
 *   3.  toggle() calls Speech.speak with correct hi-IN language
 *   4.  toggle() sets isSpeaking to true
 *   5.  Second toggle() calls Speech.stop
 *   6.  Second toggle() sets isSpeaking to false
 *   7.  stop() calls Speech.stop
 *   8.  Speech.speak onDone resets isSpeaking
 *   9.  Speech.speak onError resets isSpeaking
 *  10.  Unmount calls Speech.stop
 *  11.  Hindi dev warning logged when no Hindi voice available
 */

import { renderHook, act } from "@testing-library/react-native";
import * as Speech from "expo-speech";
import { useTts } from "../useTts";

// ─── Mock expo-speech ──────────────────────────────────────────

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(async () => []),
}));

// ─── Tests ─────────────────────────────────────────────────────

describe("useTts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initially isSpeaking is false", () => {
    const { result } = renderHook(() => useTts());
    expect(result.current.isSpeaking).toBe(false);
  });

  it("toggle() calls Speech.speak with en-IN language", () => {
    const { result } = renderHook(() => useTts({ locale: "en" }));

    act(() => {
      result.current.toggle("Hello world");
    });

    expect(Speech.speak).toHaveBeenCalledTimes(1);
    expect(Speech.speak).toHaveBeenCalledWith(
      "Hello world",
      expect.objectContaining({ language: "en-IN" }),
    );
  });

  it("toggle() calls Speech.speak with hi-IN language", () => {
    const { result } = renderHook(() => useTts({ locale: "hi" }));

    act(() => {
      result.current.toggle("नमस्ते");
    });

    expect(Speech.speak).toHaveBeenCalledTimes(1);
    expect(Speech.speak).toHaveBeenCalledWith(
      "नमस्ते",
      expect.objectContaining({ language: "hi-IN" }),
    );
  });

  it("toggle() sets isSpeaking to true", () => {
    const { result } = renderHook(() => useTts());

    act(() => {
      result.current.toggle("Test");
    });

    expect(result.current.isSpeaking).toBe(true);
  });

  it("second toggle() calls Speech.stop", () => {
    const { result } = renderHook(() => useTts());

    // First toggle → start speaking
    act(() => {
      result.current.toggle("Test");
    });
    expect(result.current.isSpeaking).toBe(true);

    // Second toggle → stop
    act(() => {
      result.current.toggle("Test");
    });

    expect(Speech.stop).toHaveBeenCalled();
  });

  it("second toggle() sets isSpeaking to false", () => {
    const { result } = renderHook(() => useTts());

    act(() => {
      result.current.toggle("Test");
    });

    act(() => {
      result.current.toggle("Test");
    });

    expect(result.current.isSpeaking).toBe(false);
  });

  it("stop() calls Speech.stop", () => {
    const { result } = renderHook(() => useTts());

    act(() => {
      result.current.toggle("Test");
    });

    act(() => {
      result.current.stop();
    });

    expect(Speech.stop).toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);
  });

  it("Speech.speak onDone resets isSpeaking", () => {
    const { result } = renderHook(() => useTts());

    act(() => {
      result.current.toggle("Test");
    });
    expect(result.current.isSpeaking).toBe(true);

    // Extract the onDone callback from the speak call
    const speakCall = (Speech.speak as jest.Mock).mock.calls[0];
    const options = speakCall[1];

    act(() => {
      options.onDone();
    });

    expect(result.current.isSpeaking).toBe(false);
  });

  it("Speech.speak onError resets isSpeaking", () => {
    const { result } = renderHook(() => useTts());

    act(() => {
      result.current.toggle("Test");
    });

    const speakCall = (Speech.speak as jest.Mock).mock.calls[0];
    const options = speakCall[1];

    act(() => {
      options.onError();
    });

    expect(result.current.isSpeaking).toBe(false);
  });

  it("unmount calls Speech.stop", () => {
    const { unmount } = renderHook(() => useTts());

    unmount();

    expect(Speech.stop).toHaveBeenCalled();
  });

  it("Hindi dev warning logged when no Hindi voice available", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    // __DEV__ is true in test env
    (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([
      { language: "en-US", name: "English" },
    ]);

    const { result } = renderHook(() => useTts({ locale: "hi" }));

    act(() => {
      result.current.toggle("Test");
    });

    // Wait for the async voice check
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No Hindi voice found"),
    );

    warnSpy.mockRestore();
  });
});
