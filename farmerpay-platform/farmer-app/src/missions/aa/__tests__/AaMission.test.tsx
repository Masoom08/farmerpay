/**
 * AaMission — Integration Tests (F2 — Spec §4.1)
 *
 * Tests:
 *   FLOW
 *   1.  Renders mission container at INTRO step
 *   2.  Intro shows "+38 points"
 *   3.  Intro shows "~3 min"
 *   4.  Intro shows "Connect safely" CTA (en)
 *   5.  Intro shows "सुरक्षित जोड़ें" CTA (hi)
 *   6.  Intro illustration present
 *   7.  "Later" fires onExit
 *   8.  Primary CTA advances to ACTION (consent handoff)
 *   9.  Successful consent advances to CONFIRM (reading step)
 *  10.  Reading step shows analysis text
 *  11.  Reading completes and advances to RESULT
 *  12.  Result shows before/after scores
 *  13.  Result shows honesty line when lift differs
 *  14.  Done fires onExit
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AaMission, type AaMissionProps } from "../index";
import type { AaSdk, AaSdkResult } from "../ConsentHandoff";

// ─── Mocks ─────────────────────────────────────────────────────

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

function createMockSdk(result: AaSdkResult): AaSdk {
  return {
    initiateConsent: jest.fn(async () => result),
  };
}

// ─── Helpers ───────────────────────────────────────────────────

const DEFAULT_PROPS: AaMissionProps = {
  farmerId: "farmer-1",
  currentScore: 600,
  aaSdk: createMockSdk({ status: "SUCCESS", consentId: "c-test" }),
  locale: "en",
  recomputeScore: jest.fn(async () => ({ score: 638 })),
  onExit: jest.fn(),
};

const renderMission = (overrides: Partial<AaMissionProps> = {}) =>
  render(<AaMission {...DEFAULT_PROPS} {...overrides} />);

// ─── Tests ─────────────────────────────────────────────────────

describe("AaMission (flow)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders mission container at INTRO step", () => {
    renderMission();
    expect(screen.getByTestId("aa-mission")).toBeTruthy();
    expect(screen.getByTestId("mission-intro")).toBeTruthy();
  });

  it('intro shows "+38 points"', () => {
    renderMission({ locale: "en" });
    expect(screen.getByText("+38 points")).toBeTruthy();
  });

  it('intro shows "~3 min"', () => {
    renderMission({ locale: "en" });
    expect(screen.getByText("~3 min")).toBeTruthy();
  });

  it('intro shows "Connect safely" CTA (en)', () => {
    renderMission({ locale: "en" });
    expect(screen.getByText("Connect safely")).toBeTruthy();
  });

  it('intro shows "सुरक्षित जोड़ें" CTA (hi)', () => {
    renderMission({ locale: "hi" });
    expect(screen.getByText("सुरक्षित जोड़ें")).toBeTruthy();
  });

  it("intro illustration present", () => {
    renderMission();
    expect(screen.getByTestId("aa-illustration")).toBeTruthy();
  });

  it('"Later" fires onExit', () => {
    const onExit = jest.fn();
    renderMission({ onExit });

    fireEvent.press(screen.getByTestId("mission-intro-later"));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("primary CTA advances to ACTION (consent handoff)", async () => {
    // Use a slow SDK so we can see the in-flight state
    const slowSdk: AaSdk = {
      initiateConsent: jest.fn(
        () =>
          new Promise<AaSdkResult>((resolve) =>
            setTimeout(() => resolve({ status: "SUCCESS", consentId: "c-1" }), 60000),
          ),
      ),
    };
    renderMission({ aaSdk: slowSdk });

    // Tap primary CTA
    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    // Should now show consent handoff (in-flight)
    await waitFor(() => {
      expect(screen.getByTestId("consent-in-flight")).toBeTruthy();
    });
  });

  it("successful consent advances to CONFIRM (reading step)", async () => {
    const fastSdk = createMockSdk({ status: "SUCCESS", consentId: "c-fast" });
    renderMission({ aaSdk: fastSdk });

    // Advance from INTRO
    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    // SDK resolves immediately → onSuccess → next() → CONFIRM step
    await waitFor(() => {
      expect(screen.getByTestId("aa-reading")).toBeTruthy();
    });
  });

  it("reading step shows analysis text", async () => {
    const fastSdk = createMockSdk({ status: "SUCCESS", consentId: "c-fast" });
    renderMission({ aaSdk: fastSdk, locale: "en" });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    await waitFor(() => {
      expect(
        screen.getByText(/analysing your bank statements/i),
      ).toBeTruthy();
    });
  });

  it("reading completes and advances to RESULT", async () => {
    const fastSdk = createMockSdk({ status: "SUCCESS", consentId: "c-fast" });
    const recomputeScore = jest.fn(async () => ({ score: 638 }));

    renderMission({ aaSdk: fastSdk, recomputeScore });

    // INTRO → ACTION
    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    // Wait for CONFIRM (reading step)
    await waitFor(() => {
      expect(screen.getByTestId("aa-reading")).toBeTruthy();
    });

    // Advance timer to trigger ReadingTimer completion
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Wait for RESULT
    await waitFor(() => {
      expect(screen.getByTestId("mission-result")).toBeTruthy();
    });
  });

  it("result shows before/after scores", async () => {
    const fastSdk = createMockSdk({ status: "SUCCESS", consentId: "c-fast" });
    const recomputeScore = jest.fn(async () => ({ score: 638 }));

    renderMission({
      aaSdk: fastSdk,
      recomputeScore,
      currentScore: 600,
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    await waitFor(() => {
      expect(screen.getByTestId("aa-reading")).toBeTruthy();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("mission-result")).toBeTruthy();
    });

    expect(screen.getByTestId("mission-result-before").props.children).toBe(600);
    expect(screen.getByTestId("mission-result-after").props.children).toBe(638);
  });

  it("result shows honesty line when lift differs from estimated", async () => {
    const fastSdk = createMockSdk({ status: "SUCCESS", consentId: "c-fast" });
    // Actual lift is 20 (620-600), estimated was 38
    const recomputeScore = jest.fn(async () => ({ score: 620 }));

    renderMission({
      aaSdk: fastSdk,
      recomputeScore,
      currentScore: 600,
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    await waitFor(() => {
      expect(screen.getByTestId("aa-reading")).toBeTruthy();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("mission-result")).toBeTruthy();
    });

    // Actual lift (20) ≠ estimated (38) → honesty section shows
    expect(screen.getByTestId("mission-result-honesty")).toBeTruthy();
    expect(screen.getByTestId("mission-result-explanation")).toBeTruthy();
  });

  it("done fires onExit", async () => {
    const onExit = jest.fn();
    const fastSdk = createMockSdk({ status: "SUCCESS", consentId: "c-fast" });
    const recomputeScore = jest.fn(async () => ({ score: 638 }));

    renderMission({ aaSdk: fastSdk, recomputeScore, onExit });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    await waitFor(() => {
      expect(screen.getByTestId("aa-reading")).toBeTruthy();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByTestId("mission-result-done")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("mission-result-done"));
    });

    expect(onExit).toHaveBeenCalled();
  });
});
