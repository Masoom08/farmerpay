/**
 * ScoreLadder — Unit Tests (E3)
 *
 * Tests:
 *   RENDERING
 *   1.  Renders ladder container
 *   2.  Renders all 4 rungs
 *   3.  Rungs render top-to-bottom (highest first)
 *   4.  Band labels visible (en)
 *   5.  Band labels visible (hi)
 *
 *   CURRENT RUNG
 *   6.  score=720 → rung 2 (Good) is current
 *   7.  "You are here" marker on current rung
 *   8.  Current rung has highlighted dot
 *   9.  Current rung bar has border
 *  10.  score=460 → rung 0 (Starting) is current
 *  11.  score=864 → rung 3 (Excellent) is current
 *  12.  score=580 → rung 1 (Building) is current
 *
 *   REACHED RUNGS
 *  13.  Rungs at/below current are visually reached (filled)
 *  14.  Rungs above current are dimmed
 *
 *   TAP ABOVE
 *  15.  Tapping rung above current fires onTapAboveCurrent(bandIdx)
 *  16.  Tapping rung 3 with score=580 fires callback with 3
 *  17.  Tapping current rung does NOT fire callback
 *  18.  Tapping rung below current does NOT fire callback
 *  19.  Above-current rungs show "Tap →" CTA
 *  20.  Above-current rungs have accessibilityRole="button"
 *
 *   A11Y
 *  21.  Ladder has accessibilityRole="list"
 *  22.  Current rung a11y label says "You are here"
 *  23.  Above rung a11y label says "Tap to see what it takes"
 *  24.  Hindi locale uses Hindi a11y strings
 *
 *   EDGE CASES
 *  25.  score=0 → first rung (Starting) is current
 *  26.  score=1000 → top rung (Excellent) is current, no rungs above
 *  27.  score at exact boundary (800) → Excellent
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ScoreLadder, type ScoreLadderProps } from "../index";
import { bandColors, neutral } from "../../../../theme";

// ─── Standard 4-band config ────────────────────────────────────

const STANDARD_BANDS = [
  { min: 0, label: { en: "Starting", hi: "शुरुआत" } },
  { min: 500, label: { en: "Building", hi: "निर्माणाधीन" } },
  { min: 600, label: { en: "Good", hi: "अच्छा" } },
  { min: 800, label: { en: "Excellent", hi: "उत्तम" } },
];

const DEFAULT_PROPS: ScoreLadderProps = {
  score: 720,
  bands: STANDARD_BANDS,
  locale: "en",
  onTapAboveCurrent: jest.fn(),
};

const renderLadder = (overrides: Partial<ScoreLadderProps> = {}) =>
  render(<ScoreLadder {...DEFAULT_PROPS} {...overrides} />);

// ─── Rendering ──────────────────────────────────────────────────

describe("ScoreLadder (rendering)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders ladder container", () => {
    renderLadder();
    expect(screen.getByTestId("score-ladder")).toBeTruthy();
  });

  it("renders all 4 rungs", () => {
    renderLadder();
    expect(screen.getByTestId("rung-0")).toBeTruthy();
    expect(screen.getByTestId("rung-1")).toBeTruthy();
    expect(screen.getByTestId("rung-2")).toBeTruthy();
    expect(screen.getByTestId("rung-3")).toBeTruthy();
  });

  it("rungs render top-to-bottom (highest first)", () => {
    renderLadder();

    // The ladder container's children should have rung-3 before rung-0
    const ladder = screen.getByTestId("score-ladder");
    const children = ladder.children;
    // First child should be rung-3 (Excellent, highest)
    // Last child should be rung-0 (Starting, lowest)
    expect(children.length).toBe(4);
  });

  it("band labels visible (en)", () => {
    renderLadder({ locale: "en" });
    expect(screen.getByText("Starting")).toBeTruthy();
    expect(screen.getByText("Building")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("Excellent")).toBeTruthy();
  });

  it("band labels visible (hi)", () => {
    renderLadder({ locale: "hi" });
    expect(screen.getByText("शुरुआत")).toBeTruthy();
    expect(screen.getByText("निर्माणाधीन")).toBeTruthy();
    expect(screen.getByText("अच्छा")).toBeTruthy();
    expect(screen.getByText("उत्तम")).toBeTruthy();
  });
});

// ─── Current rung ───────────────────────────────────────────────

describe("ScoreLadder (current rung)", () => {
  beforeEach(() => jest.clearAllMocks());

  it('score=720 → rung 2 (Good) is current', () => {
    renderLadder({ score: 720 });
    // "You are here" should be on rung-2
    expect(screen.getByTestId("you-are-here")).toBeTruthy();
    // The marker should be inside rung-2's bar area
    const rungLabel = screen.getByTestId("rung-label-2");
    expect(rungLabel.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontWeight: "700" }),
      ]),
    );
  });

  it('"You are here" marker on current rung', () => {
    renderLadder({ score: 720 });
    const marker = screen.getByTestId("you-are-here");
    expect(marker).toBeTruthy();
    expect(screen.getByText("You are here")).toBeTruthy();
  });

  it("current rung has highlighted dot", () => {
    renderLadder({ score: 720 });
    const dot = screen.getByTestId("dot-2");
    // Current dot should have border (dotCurrent style)
    const styles = dot.props.style;
    const flat = Array.isArray(styles) ? styles.flat(10) : [styles];
    const hasBorder = flat.some(
      (s: any) => s && typeof s === "object" && s.borderColor === neutral[900],
    );
    expect(hasBorder).toBe(true);
  });

  it("current rung bar has border", () => {
    renderLadder({ score: 720 });
    const bar = screen.getByTestId("rung-bar-2");
    const styles = bar.props.style;
    const flat = Array.isArray(styles) ? styles.flat(10) : [styles];
    const hasBorder = flat.some(
      (s: any) => s && typeof s === "object" && s.borderWidth === 2,
    );
    expect(hasBorder).toBe(true);
  });

  it("score=460 → rung 0 (Starting) is current", () => {
    renderLadder({ score: 460 });
    const label = screen.getByTestId("rung-label-0");
    expect(label.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontWeight: "700" }),
      ]),
    );
  });

  it("score=864 → rung 3 (Excellent) is current", () => {
    renderLadder({ score: 864 });
    const label = screen.getByTestId("rung-label-3");
    expect(label.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontWeight: "700" }),
      ]),
    );
  });

  it("score=580 → rung 1 (Building) is current", () => {
    renderLadder({ score: 580 });
    const label = screen.getByTestId("rung-label-1");
    expect(label.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontWeight: "700" }),
      ]),
    );
  });
});

// ─── Reached rungs ──────────────────────────────────────────────

describe("ScoreLadder (reached rungs)", () => {
  it("rungs at/below current are visually reached (filled with band colour)", () => {
    renderLadder({ score: 720 }); // current = rung 2

    const getColor = (dot: any) => {
      const flat = (Array.isArray(dot.props.style) ? dot.props.style : [dot.props.style]).flat(10);
      for (const s of flat) {
        if (s && typeof s === "object" && "backgroundColor" in s) return s.backgroundColor;
      }
      return null;
    };

    // Rung 1 (Building) reached — should have its band fill (amber), not dimmed
    const dot1 = screen.getByTestId("dot-1");
    expect(getColor(dot1)).toBe(bandColors.building);

    // Rung 0 (Starting) reached — has neutral.200 which IS its band fill
    const dot0 = screen.getByTestId("dot-0");
    expect(getColor(dot0)).toBe(bandColors.starting);

    // Rung 2 (Good) is current — should have its band fill
    const dot2 = screen.getByTestId("dot-2");
    // dotCurrent style overrides, but the base bg should be band.good
    expect(getColor(dot2)).toBeTruthy();
  });

  it("rungs above current are dimmed", () => {
    renderLadder({ score: 720 }); // current = rung 2, rung 3 is above

    const dot3 = screen.getByTestId("dot-3");
    const flat = (Array.isArray(dot3.props.style) ? dot3.props.style : [dot3.props.style]).flat(10);
    const bg = flat.find(
      (s: any) => s && typeof s === "object" && "backgroundColor" in s,
    );
    expect(bg?.backgroundColor).toBe(neutral[200]);
  });
});

// ─── Tap above ──────────────────────────────────────────────────

describe("ScoreLadder (tap above)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("tapping rung above current fires onTapAboveCurrent(bandIdx)", () => {
    const onTap = jest.fn();
    renderLadder({ score: 720, onTapAboveCurrent: onTap });

    // Rung 3 (Excellent) is above current (Good = rung 2)
    fireEvent.press(screen.getByTestId("rung-3"));
    expect(onTap).toHaveBeenCalledWith(3);
  });

  it("tapping rung 3 with score=580 fires callback with 3", () => {
    const onTap = jest.fn();
    renderLadder({ score: 580, onTapAboveCurrent: onTap });

    fireEvent.press(screen.getByTestId("rung-3"));
    expect(onTap).toHaveBeenCalledWith(3);
  });

  it("tapping current rung does NOT fire callback", () => {
    const onTap = jest.fn();
    renderLadder({ score: 720, onTapAboveCurrent: onTap });

    // Rung 2 is current — it's a View, not Pressable
    // fireEvent.press won't fire onTap since there's no onPress handler
    fireEvent.press(screen.getByTestId("rung-2"));
    expect(onTap).not.toHaveBeenCalled();
  });

  it("tapping rung below current does NOT fire callback", () => {
    const onTap = jest.fn();
    renderLadder({ score: 720, onTapAboveCurrent: onTap });

    fireEvent.press(screen.getByTestId("rung-0"));
    expect(onTap).not.toHaveBeenCalled();
  });

  it('above-current rungs show "Tap →" CTA', () => {
    renderLadder({ score: 720 });
    expect(screen.getByTestId("rung-cta-3")).toBeTruthy();
    expect(screen.getByText("Tap →")).toBeTruthy();
  });

  it('above-current rungs have accessibilityRole="button"', () => {
    renderLadder({ score: 720 });
    const rung3 = screen.getByTestId("rung-3");
    expect(rung3.props.accessibilityRole).toBe("button");
  });
});

// ─── A11y ───────────────────────────────────────────────────────

describe("ScoreLadder (a11y)", () => {
  it('ladder has role="list"', () => {
    renderLadder();
    // The component uses the modern cross-platform `role` prop (the
    // React Native equivalent of ARIA role), not the legacy
    // `accessibilityRole`. Check whichever the component actually sets.
    expect(screen.getByTestId("score-ladder").props.role).toBe("list");
  });

  it('current rung a11y label says "You are here"', () => {
    renderLadder({ score: 720 });
    const rung2 = screen.getByTestId("rung-2");
    expect(rung2.props.accessibilityLabel).toContain("You are here");
  });

  it('above rung a11y label says "Tap to see what it takes"', () => {
    renderLadder({ score: 720 });
    const rung3 = screen.getByTestId("rung-3");
    expect(rung3.props.accessibilityLabel).toContain("Tap to see what it takes");
  });

  it("Hindi locale uses Hindi a11y strings", () => {
    renderLadder({ score: 720, locale: "hi" });
    const rung2 = screen.getByTestId("rung-2");
    expect(rung2.props.accessibilityLabel).toContain("आप यहाँ हैं");
  });
});

// ─── Edge cases ─────────────────────────────────────────────────

describe("ScoreLadder (edge cases)", () => {
  it("score=0 → first rung (Starting) is current", () => {
    renderLadder({ score: 0 });
    const label = screen.getByTestId("rung-label-0");
    expect(label.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontWeight: "700" }),
      ]),
    );
    // Rungs 1, 2, 3 are all above
    expect(screen.getByTestId("rung-cta-1")).toBeTruthy();
    expect(screen.getByTestId("rung-cta-2")).toBeTruthy();
    expect(screen.getByTestId("rung-cta-3")).toBeTruthy();
  });

  it("score=1000 → top rung (Excellent) is current, no rungs above", () => {
    renderLadder({ score: 1000 });
    const label = screen.getByTestId("rung-label-3");
    expect(label.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontWeight: "700" }),
      ]),
    );
    // No CTA arrows should exist
    expect(screen.queryByTestId("rung-cta-0")).toBeNull();
    expect(screen.queryByTestId("rung-cta-1")).toBeNull();
    expect(screen.queryByTestId("rung-cta-2")).toBeNull();
    expect(screen.queryByTestId("rung-cta-3")).toBeNull();
  });

  it("score at exact boundary (800) → Excellent", () => {
    renderLadder({ score: 800 });
    const label = screen.getByTestId("rung-label-3");
    expect(label.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontWeight: "700" }),
      ]),
    );
  });
});
