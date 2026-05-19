/**
 * Mission step components — Unit Tests (F1)
 *
 * Tests:
 *   MISSION INTRO
 *   1.  Renders intro container
 *   2.  Shows title (en)
 *   3.  Shows title (hi)
 *   4.  Shows body text
 *   5.  Shows illustration
 *   6.  Shows point-lift badge with "+N points"
 *   7.  Shows estimated minutes
 *   8.  Primary CTA fires onPrimary
 *   9.  Later button fires onLater
 *  10.  Resume prompt shown when hasResumableProgress=true
 *  11.  Resume prompt hidden by default
 *  12.  Resume fires onResume
 *  13.  Primary CTA a11y label matches locale
 *
 *   MISSION PROGRESS (Action step)
 *  14.  Renders progress container
 *  15.  Shows step indicator "Step 2 of 4"
 *  16.  Shows step indicator (hi)
 *  17.  Shows title
 *  18.  Back button fires onBack
 *  19.  Renders children
 *  20.  Does NOT show point-lift (spec §4)
 *  21.  Progress bar shows filled dots up to currentStep
 *
 *   MISSION CONFIRM
 *  22.  Renders confirm container
 *  23.  Shows title
 *  24.  Shows summary
 *  25.  Confirm button fires onConfirm
 *  26.  Cancel button fires onCancel
 *  27.  Does NOT show point-lift (spec §4)
 *  28.  Shows items when provided
 *
 *   MISSION RESULT
 *  29.  Renders result container
 *  30.  Shows before/after scores
 *  31.  Shows point-lift badge
 *  32.  Done CTA fires onDone
 *  33.  Honesty: shows estimated + actual when they differ (§4.5)
 *  34.  Honesty: shows explanation line
 *  35.  Honesty: hidden when estimated == actual
 *  36.  Hindi result title
 */

import React from "react";
import { View, Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { MissionIntro, type MissionIntroProps } from "../MissionIntro";
import { MissionProgress, type MissionProgressProps } from "../MissionProgress";
import { MissionConfirm, type MissionConfirmProps } from "../MissionConfirm";
import { MissionResult, type MissionResultProps } from "../MissionResult";

// ─── Stub illustration ─────────────────────────────────────────

function StubIllustration() {
  return <View testID="stub-illustration" />;
}

// ═══════════════════════════════════════════════════════════════
// MissionIntro
// ═══════════════════════════════════════════════════════════════

describe("MissionIntro", () => {
  const DEFAULT_PROPS: MissionIntroProps = {
    title: { en: "Link your bank", hi: "बैंक जोड़ें" },
    body: { en: "This will help build your score.", hi: "इससे आपका स्कोर बनेगा।" },
    illustration: StubIllustration,
    pointLift: 25,
    estimatedMinutes: 5,
    primaryCta: { en: "Start", hi: "शुरू करें" },
    onPrimary: jest.fn(),
    onLater: jest.fn(),
    locale: "en",
  };

  const renderIntro = (overrides: Partial<MissionIntroProps> = {}) =>
    render(<MissionIntro {...DEFAULT_PROPS} {...overrides} />);

  beforeEach(() => jest.clearAllMocks());

  it("renders intro container", () => {
    renderIntro();
    expect(screen.getByTestId("mission-intro")).toBeTruthy();
  });

  it("shows title (en)", () => {
    renderIntro({ locale: "en" });
    expect(screen.getByText("Link your bank")).toBeTruthy();
  });

  it("shows title (hi)", () => {
    renderIntro({ locale: "hi" });
    expect(screen.getByText("बैंक जोड़ें")).toBeTruthy();
  });

  it("shows body text", () => {
    renderIntro({ locale: "en" });
    expect(screen.getByText("This will help build your score.")).toBeTruthy();
  });

  it("shows illustration", () => {
    renderIntro();
    expect(screen.getByTestId("stub-illustration")).toBeTruthy();
  });

  it("shows point-lift badge", () => {
    renderIntro({ locale: "en", pointLift: 25 });
    expect(screen.getByTestId("mission-intro-points")).toBeTruthy();
    expect(screen.getByText("+25 points")).toBeTruthy();
  });

  it("shows estimated minutes", () => {
    renderIntro({ locale: "en", estimatedMinutes: 5 });
    expect(screen.getByText("~5 min")).toBeTruthy();
  });

  it("primary CTA fires onPrimary", () => {
    const onPrimary = jest.fn();
    renderIntro({ onPrimary });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it("later button fires onLater", () => {
    const onLater = jest.fn();
    renderIntro({ onLater });

    fireEvent.press(screen.getByTestId("mission-intro-later"));
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it("resume prompt shown when hasResumableProgress=true", () => {
    renderIntro({ hasResumableProgress: true, onResume: jest.fn() });
    expect(screen.getByTestId("mission-resume-prompt")).toBeTruthy();
  });

  it("resume prompt hidden by default", () => {
    renderIntro();
    expect(screen.queryByTestId("mission-resume-prompt")).toBeNull();
  });

  it("resume fires onResume", () => {
    const onResume = jest.fn();
    renderIntro({ hasResumableProgress: true, onResume });

    fireEvent.press(screen.getByTestId("mission-resume-prompt"));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("primary CTA a11y label matches locale", () => {
    renderIntro({ locale: "hi" });
    const btn = screen.getByTestId("mission-intro-primary");
    expect(btn.props.accessibilityLabel).toBe("शुरू करें");
  });
});

// ═══════════════════════════════════════════════════════════════
// MissionProgress (Action step)
// ═══════════════════════════════════════════════════════════════

describe("MissionProgress", () => {
  const DEFAULT_PROPS: MissionProgressProps = {
    title: { en: "Enter details", hi: "विवरण दर्ज करें" },
    currentStep: 2,
    totalSteps: 4,
    locale: "en",
    onBack: jest.fn(),
    children: <Text testID="test-child">Child content</Text>,
  };

  const renderProgress = (overrides: Partial<MissionProgressProps> = {}) =>
    render(<MissionProgress {...DEFAULT_PROPS} {...overrides} />);

  beforeEach(() => jest.clearAllMocks());

  it("renders progress container", () => {
    renderProgress();
    expect(screen.getByTestId("mission-progress")).toBeTruthy();
  });

  it('shows step indicator "Step 2 of 4"', () => {
    renderProgress({ currentStep: 2, totalSteps: 4, locale: "en" });
    expect(screen.getByText("Step 2 of 4")).toBeTruthy();
  });

  it("shows step indicator (hi)", () => {
    renderProgress({ currentStep: 2, totalSteps: 4, locale: "hi" });
    expect(screen.getByText("चरण 2 / 4")).toBeTruthy();
  });

  it("shows title", () => {
    renderProgress({ locale: "en" });
    expect(screen.getByText("Enter details")).toBeTruthy();
  });

  it("back button fires onBack", () => {
    const onBack = jest.fn();
    renderProgress({ onBack });

    fireEvent.press(screen.getByTestId("mission-progress-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("renders children", () => {
    renderProgress();
    expect(screen.getByTestId("test-child")).toBeTruthy();
    expect(screen.getByText("Child content")).toBeTruthy();
  });

  it("does NOT show point-lift (spec §4)", () => {
    renderProgress();
    // Ensure no "points" or "अंक" text in the progress step
    expect(screen.queryByText(/points/i)).toBeNull();
    expect(screen.queryByText(/अंक/)).toBeNull();
  });

  it("progress bar shows filled dots up to currentStep", () => {
    renderProgress({ currentStep: 2, totalSteps: 4 });

    const dot0 = screen.getByTestId("progress-dot-0");
    const dot1 = screen.getByTestId("progress-dot-1");
    const dot2 = screen.getByTestId("progress-dot-2");
    const dot3 = screen.getByTestId("progress-dot-3");

    // First 2 dots should be filled (currentStep=2, so indices 0 and 1)
    const getStyles = (el: any) => {
      const s = el.props.style;
      return (Array.isArray(s) ? s : [s]).flat(10);
    };

    const hasFilled = (el: any) =>
      getStyles(el).some((s: any) => s?.backgroundColor === "#22C55E");

    expect(hasFilled(dot0)).toBe(true);
    expect(hasFilled(dot1)).toBe(true);
    expect(hasFilled(dot2)).toBe(false);
    expect(hasFilled(dot3)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// MissionConfirm
// ═══════════════════════════════════════════════════════════════

describe("MissionConfirm", () => {
  const DEFAULT_PROPS: MissionConfirmProps = {
    title: { en: "Confirm linking", hi: "लिंकिंग पुष्टि करें" },
    summary: { en: "We will connect your bank.", hi: "हम आपका बैंक जोड़ेंगे।" },
    confirmLabel: { en: "Confirm", hi: "पुष्टि करें" },
    cancelLabel: { en: "Go back", hi: "वापस जाएं" },
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    locale: "en",
  };

  const renderConfirm = (overrides: Partial<MissionConfirmProps> = {}) =>
    render(<MissionConfirm {...DEFAULT_PROPS} {...overrides} />);

  beforeEach(() => jest.clearAllMocks());

  it("renders confirm container", () => {
    renderConfirm();
    expect(screen.getByTestId("mission-confirm")).toBeTruthy();
  });

  it("shows title", () => {
    renderConfirm({ locale: "en" });
    expect(screen.getByText("Confirm linking")).toBeTruthy();
  });

  it("shows summary", () => {
    renderConfirm({ locale: "en" });
    expect(screen.getByText("We will connect your bank.")).toBeTruthy();
  });

  it("confirm button fires onConfirm", () => {
    const onConfirm = jest.fn();
    renderConfirm({ onConfirm });

    fireEvent.press(screen.getByTestId("mission-confirm-btn"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancel button fires onCancel", () => {
    const onCancel = jest.fn();
    renderConfirm({ onCancel });

    fireEvent.press(screen.getByTestId("mission-cancel-btn"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does NOT show point-lift (spec §4)", () => {
    renderConfirm();
    expect(screen.queryByText(/points/i)).toBeNull();
    expect(screen.queryByText(/अंक/)).toBeNull();
  });

  it("shows items when provided", () => {
    renderConfirm({
      items: [
        { label: "Bank", value: "SBI" },
        { label: "Account", value: "****1234" },
      ],
    });
    expect(screen.getByTestId("mission-confirm-items")).toBeTruthy();
    expect(screen.getByTestId("confirm-item-0")).toBeTruthy();
    expect(screen.getByTestId("confirm-item-1")).toBeTruthy();
    expect(screen.getByText("SBI")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// MissionResult
// ═══════════════════════════════════════════════════════════════

describe("MissionResult", () => {
  const DEFAULT_PROPS: MissionResultProps = {
    beforeScore: 600,
    afterScore: 625,
    estimatedLift: 25,
    actualLift: 25,
    onDone: jest.fn(),
    locale: "en",
  };

  const renderResult = (overrides: Partial<MissionResultProps> = {}) =>
    render(<MissionResult {...DEFAULT_PROPS} {...overrides} />);

  beforeEach(() => jest.clearAllMocks());

  it("renders result container", () => {
    renderResult();
    expect(screen.getByTestId("mission-result")).toBeTruthy();
  });

  it("shows before/after scores", () => {
    renderResult({ beforeScore: 600, afterScore: 625 });
    expect(screen.getByTestId("mission-result-before").props.children).toBe(600);
    expect(screen.getByTestId("mission-result-after").props.children).toBe(625);
  });

  it("shows point-lift badge", () => {
    renderResult({ actualLift: 25, locale: "en" });
    expect(screen.getByTestId("mission-result-lift")).toBeTruthy();
    expect(screen.getByText("+25 points")).toBeTruthy();
  });

  it("done CTA fires onDone", () => {
    const onDone = jest.fn();
    renderResult({ onDone });

    fireEvent.press(screen.getByTestId("mission-result-done"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("honesty: shows estimated + actual when they differ (§4.5)", () => {
    renderResult({ estimatedLift: 25, actualLift: 18 });
    expect(screen.getByTestId("mission-result-honesty")).toBeTruthy();
    expect(screen.getByTestId("mission-result-estimated")).toBeTruthy();
    expect(screen.getByTestId("mission-result-actual")).toBeTruthy();
  });

  it("honesty: shows explanation line", () => {
    renderResult({ estimatedLift: 25, actualLift: 18 });
    expect(screen.getByTestId("mission-result-explanation")).toBeTruthy();
    expect(
      screen.getByText(/may differ based on other factors/),
    ).toBeTruthy();
  });

  it("honesty: hidden when estimated == actual", () => {
    renderResult({ estimatedLift: 25, actualLift: 25 });
    expect(screen.queryByTestId("mission-result-honesty")).toBeNull();
  });

  it("Hindi result title", () => {
    renderResult({ locale: "hi" });
    expect(screen.getByText("मिशन पूरा हुआ!")).toBeTruthy();
  });
});
