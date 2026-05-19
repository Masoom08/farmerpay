/**
 * HelpSheet — Unit Tests (E6)
 *
 * Tests:
 *   RENDERING
 *   1.  Renders sheet container
 *   2.  Shows title (en)
 *   3.  Shows title (hi)
 *   4.  Body contains score value (en)
 *   5.  Body contains score value (hi)
 *   6.  Shows improvement tips (en)
 *   7.  Shows improvement tips (hi)
 *   8.  Shows 4 tips
 *
 *   SPEAK BUTTON
 *   9.  Speak button present with 🔊 icon
 *  10.  Speak button has ≥48dp touch target
 *  11.  Tap speak calls Speech.speak with en-IN
 *  12.  Tap speak calls Speech.speak with hi-IN
 *  13.  Speech text includes title + body + tips
 *  14.  While speaking, icon changes to ⏹
 *  15.  While speaking, label changes to "Stop" / "रुकें"
 *  16.  Second tap calls Speech.stop
 *
 *   CLOSE
 *  17.  Close button present
 *  18.  Close button fires onClose
 *  19.  Close button has ≥48dp touch target
 *
 *   A11Y
 *  20.  Speak button has accessibilityRole="button"
 *  21.  Speak button a11y label says "Listen" (en)
 *  22.  Speak button a11y label says "सुनें" (hi)
 *  23.  Close button has accessibilityRole="button"
 *  24.  Speak button has busy state when speaking
 *
 *   LOCALE
 *  25.  Hindi body has Devanagari lineHeight
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import * as Speech from "expo-speech";
import { HelpSheet, type HelpSheetProps } from "../index";

// ─── Mock expo-speech ──────────────────────────────────────────

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(async () => []),
}));

// ─── Helpers ───────────────────────────────────────────────────

const DEFAULT_PROPS: HelpSheetProps = {
  score: 650,
  locale: "en",
  onClose: jest.fn(),
};

const renderSheet = (overrides: Partial<HelpSheetProps> = {}) =>
  render(<HelpSheet {...DEFAULT_PROPS} {...overrides} />);

// ─── Rendering ─────────────────────────────────────────────────

describe("HelpSheet (rendering)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders sheet container", () => {
    renderSheet();
    expect(screen.getByTestId("help-sheet")).toBeTruthy();
  });

  it("shows title (en)", () => {
    renderSheet({ locale: "en" });
    expect(screen.getByText("What is a TRUST score?")).toBeTruthy();
  });

  it("shows title (hi)", () => {
    renderSheet({ locale: "hi" });
    expect(screen.getByText("TRUST स्कोर क्या है?")).toBeTruthy();
  });

  it("body contains score value (en)", () => {
    renderSheet({ score: 650, locale: "en" });
    const body = screen.getByTestId("help-body");
    expect(body.props.children).toContain("650");
  });

  it("body contains score value (hi)", () => {
    renderSheet({ score: 750, locale: "hi" });
    const body = screen.getByTestId("help-body");
    expect(body.props.children).toContain("750");
  });

  it("shows improvement tips (en)", () => {
    renderSheet({ locale: "en" });
    expect(screen.getByText("Link your bank account")).toBeTruthy();
    expect(screen.getByText("Connect crop insurance")).toBeTruthy();
  });

  it("shows improvement tips (hi)", () => {
    renderSheet({ locale: "hi" });
    expect(screen.getByText("अपना बैंक अकाउंट जोड़ें")).toBeTruthy();
    expect(screen.getByText("फसल बीमा लिंक करें")).toBeTruthy();
  });

  it("shows 4 tips", () => {
    renderSheet();
    expect(screen.getByTestId("help-tip-0")).toBeTruthy();
    expect(screen.getByTestId("help-tip-1")).toBeTruthy();
    expect(screen.getByTestId("help-tip-2")).toBeTruthy();
    expect(screen.getByTestId("help-tip-3")).toBeTruthy();
  });
});

// ─── Speak button ──────────────────────────────────────────────

describe("HelpSheet (speak)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("speak button present with 🔊 icon", () => {
    renderSheet();
    const icon = screen.getByTestId("help-speak-icon");
    expect(icon.props.children).toBe("🔊");
  });

  it("speak button has ≥48dp touch target", () => {
    renderSheet();
    const btn = screen.getByTestId("help-speak-btn");
    const styles = btn.props.style;
    const flat = (Array.isArray(styles) ? styles : [styles]).flat(10);
    const hasMinHeight = flat.some((s: any) => s?.minHeight >= 48);
    expect(hasMinHeight).toBe(true);
  });

  it("tap speak calls Speech.speak with en-IN", () => {
    renderSheet({ locale: "en" });
    fireEvent.press(screen.getByTestId("help-speak-btn"));

    expect(Speech.speak).toHaveBeenCalledTimes(1);
    expect(Speech.speak).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ language: "en-IN" }),
    );
  });

  it("tap speak calls Speech.speak with hi-IN", () => {
    renderSheet({ locale: "hi" });
    fireEvent.press(screen.getByTestId("help-speak-btn"));

    expect(Speech.speak).toHaveBeenCalledTimes(1);
    expect(Speech.speak).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ language: "hi-IN" }),
    );
  });

  it("speech text includes title + body + tips", () => {
    renderSheet({ locale: "en", score: 650 });
    fireEvent.press(screen.getByTestId("help-speak-btn"));

    const spokenText = (Speech.speak as jest.Mock).mock.calls[0][0] as string;

    expect(spokenText).toContain("What is a TRUST score?");
    expect(spokenText).toContain("650");
    expect(spokenText).toContain("Link your bank account");
    expect(spokenText).toContain("How to improve your score");
  });

  it("while speaking, icon changes to ⏹", () => {
    renderSheet();
    fireEvent.press(screen.getByTestId("help-speak-btn"));

    const icon = screen.getByTestId("help-speak-icon");
    expect(icon.props.children).toBe("⏹");
  });

  it('while speaking, label changes to "Stop" (en)', () => {
    renderSheet({ locale: "en" });
    fireEvent.press(screen.getByTestId("help-speak-btn"));

    const label = screen.getByTestId("help-speak-label");
    expect(label.props.children).toBe("Stop");
  });

  it('while speaking, label changes to "रुकें" (hi)', () => {
    renderSheet({ locale: "hi" });
    fireEvent.press(screen.getByTestId("help-speak-btn"));

    const label = screen.getByTestId("help-speak-label");
    expect(label.props.children).toBe("रुकें");
  });

  it("second tap calls Speech.stop", () => {
    renderSheet();

    // First tap → start
    fireEvent.press(screen.getByTestId("help-speak-btn"));
    expect(Speech.speak).toHaveBeenCalledTimes(1);

    // Second tap → stop
    fireEvent.press(screen.getByTestId("help-speak-btn"));
    expect(Speech.stop).toHaveBeenCalled();
  });
});

// ─── Close ─────────────────────────────────────────────────────

describe("HelpSheet (close)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("close button present", () => {
    renderSheet();
    expect(screen.getByTestId("help-close-btn")).toBeTruthy();
  });

  it("close button fires onClose", () => {
    const onClose = jest.fn();
    renderSheet({ onClose });

    fireEvent.press(screen.getByTestId("help-close-btn"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("close button has ≥48dp touch target", () => {
    renderSheet();
    const btn = screen.getByTestId("help-close-btn");
    const styles = btn.props.style;
    const flat = (Array.isArray(styles) ? styles : [styles]).flat(10);
    const hasMinHeight = flat.some((s: any) => s?.minHeight >= 48);
    expect(hasMinHeight).toBe(true);
  });
});

// ─── A11y ──────────────────────────────────────────────────────

describe("HelpSheet (a11y)", () => {
  beforeEach(() => jest.clearAllMocks());

  it('speak button has accessibilityRole="button"', () => {
    renderSheet();
    const btn = screen.getByTestId("help-speak-btn");
    expect(btn.props.accessibilityRole).toBe("button");
  });

  it('speak button a11y label says "Listen" (en)', () => {
    renderSheet({ locale: "en" });
    const btn = screen.getByTestId("help-speak-btn");
    expect(btn.props.accessibilityLabel).toBe("Listen");
  });

  it('speak button a11y label says "सुनें" (hi)', () => {
    renderSheet({ locale: "hi" });
    const btn = screen.getByTestId("help-speak-btn");
    expect(btn.props.accessibilityLabel).toBe("सुनें");
  });

  it('close button has accessibilityRole="button"', () => {
    renderSheet();
    const btn = screen.getByTestId("help-close-btn");
    expect(btn.props.accessibilityRole).toBe("button");
  });

  it("speak button has busy state when speaking", () => {
    renderSheet();
    fireEvent.press(screen.getByTestId("help-speak-btn"));

    const btn = screen.getByTestId("help-speak-btn");
    expect(btn.props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true }),
    );
  });
});

// ─── Locale ────────────────────────────────────────────────────

describe("HelpSheet (locale)", () => {
  it("Hindi body has Devanagari lineHeight", () => {
    renderSheet({ locale: "hi" });
    const body = screen.getByTestId("help-body");
    const styles = body.props.style;
    const flat = (Array.isArray(styles) ? styles : [styles]).flat(10);
    // Body is 14px, lineHeight should be ≥ 14 * 1.55 = 21.7
    const hasDevanagariLH = flat.some(
      (s: any) => s?.lineHeight != null && s.lineHeight >= 21.7,
    );
    expect(hasDevanagariLH).toBe(true);
  });
});
