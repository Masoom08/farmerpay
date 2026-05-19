/**
 * TrustScoreHero — Component Tests (E2 — Spec §3.3 / §3.4 / §3.6 / §3.7)
 *
 * Tests:
 *   RENDERING
 *   1.  Renders hero container
 *   2.  Shows numeric score when showNumeric=true
 *   3.  Hides numeric score when showNumeric=false
 *   4.  Shows band chip always
 *   5.  Band chip text matches score band (en)
 *   6.  Band chip text matches score band (hi)
 *   7.  Supporting line 1 visible
 *   8.  Supporting line 2 visible
 *   9.  As-of footer visible
 *
 *   BAND COLOURS
 *  10.  Excellent → primary.100 fill
 *  11.  Good → primary.100 fill
 *  12.  Building → amber fill
 *  13.  Starting → neutral.200 fill (NEVER red)
 *
 *   LOCALE
 *  14.  locale='hi' shows Hindi band label
 *  15.  locale='hi' shows Hindi supporting lines
 *  16.  locale='en' shows English band label
 *  17.  locale='en' as-of contains "Updated"
 *  18.  locale='hi' as-of contains "अपडेट"
 *
 *   INTERACTIONS
 *  19.  Long-press fires onLongPressToggleNumeric
 *  20.  Tap help fires onTapHelp
 *
 *   A11Y
 *  21.  Accessibility label includes score when numeric on
 *  22.  Accessibility label omits score when numeric off
 *  23.  Hero has accessibilityRole="summary"
 *  24.  Hindi text uses lineHeight ≥ 1.55× fontSize
 *
 *   NUMERIC OFF (band chip only)
 *  25.  Band chip is larger when numeric is off
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { TrustScoreHero, type TrustScoreHeroProps } from "../index";
import { bandColors, neutral } from "../../../../theme";

// ─── Default props ──────────────────────────────────────────────

const DEFAULT_PROPS: TrustScoreHeroProps = {
  score: 720,
  asOf: "2026-04-10T10:00:00Z",
  showNumeric: true,
  locale: "en",
  onTapHelp: jest.fn(),
  onLongPressToggleNumeric: jest.fn(),
};

const renderHero = (overrides: Partial<TrustScoreHeroProps> = {}) =>
  render(<TrustScoreHero {...DEFAULT_PROPS} {...overrides} />);

// ─── Rendering ──────────────────────────────────────────────────

describe("TrustScoreHero (rendering)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders hero container", () => {
    renderHero();
    expect(screen.getByTestId("trust-score-hero")).toBeTruthy();
  });

  it("shows numeric score when showNumeric=true", () => {
    renderHero({ showNumeric: true });
    expect(screen.getByTestId("hero-score-numeric")).toBeTruthy();
    expect(screen.getByText("720")).toBeTruthy();
  });

  it("hides numeric score when showNumeric=false", () => {
    renderHero({ showNumeric: false });
    expect(screen.queryByTestId("hero-score-numeric")).toBeNull();
  });

  it("shows band chip always", () => {
    renderHero({ showNumeric: true });
    expect(screen.getByTestId("hero-band-chip")).toBeTruthy();

    renderHero({ showNumeric: false });
    expect(screen.getByTestId("hero-band-chip")).toBeTruthy();
  });

  it("band chip text matches score band (en)", () => {
    renderHero({ score: 720, locale: "en" });
    expect(screen.getByTestId("hero-band-label")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
  });

  it("band chip text matches score band (hi)", () => {
    renderHero({ score: 720, locale: "hi" });
    expect(screen.getByText("अच्छा")).toBeTruthy();
  });

  it("supporting line 1 visible", () => {
    renderHero();
    expect(screen.getByTestId("hero-line1")).toBeTruthy();
  });

  it("supporting line 2 visible", () => {
    renderHero();
    expect(screen.getByTestId("hero-line2")).toBeTruthy();
  });

  it("as-of footer visible", () => {
    renderHero();
    expect(screen.getByTestId("hero-as-of")).toBeTruthy();
  });
});

// ─── Band colours ───────────────────────────────────────────────

describe("TrustScoreHero (band colours)", () => {
  // Helper to get the hero's backgroundColor from style
  function getHeroFill(score: number): string | undefined {
    renderHero({ score });
    const hero = screen.getByTestId("trust-score-hero");
    // Pressable style can be nested arrays; flatten to find backgroundColor
    const styles = hero.props.style;
    const flat = Array.isArray(styles) ? styles.flat(10) : [styles];
    for (const s of flat) {
      if (s && typeof s === "object" && "backgroundColor" in s) {
        return s.backgroundColor as string;
      }
    }
    return undefined;
  }

  it("excellent → primary.100 fill", () => {
    expect(getHeroFill(864)).toBe(bandColors.excellent);
  });

  it("good → primary.100 fill", () => {
    expect(getHeroFill(720)).toBe(bandColors.good);
  });

  it("building → amber fill", () => {
    expect(getHeroFill(580)).toBe(bandColors.building);
  });

  it("starting → neutral.200 fill (NEVER red)", () => {
    const fill = getHeroFill(460);
    expect(fill).toBe(bandColors.starting);
    expect(fill).toBe(neutral[200]);
  });
});

// ─── Locale ─────────────────────────────────────────────────────

describe("TrustScoreHero (locale)", () => {
  it("locale='hi' shows Hindi band label", () => {
    renderHero({ score: 864, locale: "hi" });
    expect(screen.getByText("उत्तम")).toBeTruthy();
  });

  it("locale='hi' shows Hindi supporting lines", () => {
    renderHero({ score: 720, locale: "hi" });
    expect(screen.getByTestId("hero-line1")).toBeTruthy();
    // The Hindi line for 'good' should be present
    const line1 = screen.getByTestId("hero-line1");
    expect(line1.props.children).toContain("मजबूत");
  });

  it("locale='en' shows English band label", () => {
    renderHero({ score: 580, locale: "en" });
    expect(screen.getByText("Building")).toBeTruthy();
  });

  it('locale=\'en\' as-of contains "Updated"', () => {
    renderHero({ locale: "en" });
    const asOf = screen.getByTestId("hero-as-of");
    expect(asOf.props.children).toContain("Updated");
  });

  it('locale=\'hi\' as-of contains "अपडेट"', () => {
    renderHero({ locale: "hi" });
    const asOf = screen.getByTestId("hero-as-of");
    expect(asOf.props.children).toContain("अपडेट");
  });
});

// ─── Interactions ───────────────────────────────────────────────

describe("TrustScoreHero (interactions)", () => {
  it("long-press fires onLongPressToggleNumeric", () => {
    const onLongPress = jest.fn();
    renderHero({ onLongPressToggleNumeric: onLongPress });

    fireEvent(screen.getByTestId("trust-score-hero"), "onLongPress");
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("tap help fires onTapHelp", () => {
    const onTapHelp = jest.fn();
    renderHero({ onTapHelp });

    fireEvent.press(screen.getByTestId("hero-help-tap"));
    expect(onTapHelp).toHaveBeenCalledTimes(1);
  });
});

// ─── Accessibility ──────────────────────────────────────────────

describe("TrustScoreHero (a11y)", () => {
  it("accessibility label includes score when numeric on", () => {
    renderHero({ score: 720, showNumeric: true, locale: "en" });

    const hero = screen.getByTestId("trust-score-hero");
    expect(hero.props.accessibilityLabel).toBe(
      "TRUST score 720, Good band",
    );
  });

  it("accessibility label omits score when numeric off", () => {
    renderHero({ score: 720, showNumeric: false, locale: "en" });

    const hero = screen.getByTestId("trust-score-hero");
    expect(hero.props.accessibilityLabel).toBe("Good band");
  });

  it('hero has role="summary"', () => {
    renderHero();

    // Modern cross-platform `role` prop (W3C ARIA) supersedes the
    // legacy React Native `accessibilityRole`. Check the prop the
    // component actually sets.
    const hero = screen.getByTestId("trust-score-hero");
    expect(hero.props.role).toBe("summary");
  });

  it("Hindi text uses lineHeight ≥ 1.55 × fontSize", () => {
    renderHero({ locale: "hi" });

    const line1 = screen.getByTestId("hero-line1");
    // Hindi line: fontSize=14, expected lineHeight ≥ 14 * 1.55 = 21.7
    const styles = line1.props.style;
    const flat = Array.isArray(styles) ? styles.flat(10) : [styles];

    let fontSize = 14;
    let lineHeight = 0;
    for (const s of flat) {
      if (s && typeof s === "object") {
        if ("fontSize" in s) fontSize = s.fontSize as number;
        if ("lineHeight" in s) lineHeight = s.lineHeight as number;
      }
    }

    expect(lineHeight).toBeGreaterThanOrEqual(fontSize * 1.55);
  });
});

// ─── Numeric off (band chip only) ──────────────────────────────

describe("TrustScoreHero (numeric off)", () => {
  it("only band chip visible, no score number", () => {
    renderHero({ showNumeric: false });

    expect(screen.queryByTestId("hero-score-numeric")).toBeNull();
    expect(screen.getByTestId("hero-band-chip")).toBeTruthy();
    expect(screen.getByTestId("hero-band-label")).toBeTruthy();
  });
});
