/**
 * GapCard + rankGaps — Unit Tests (E4)
 *
 * Tests:
 *   RANKING (rankGaps)
 *   1.  Ranks by pointLift/effortMinutes ratio desc
 *   2.  Higher ratio first even if lower absolute pointLift
 *   3.  Zero effort → ratio 0 (sorted last)
 *   4.  Empty array → empty
 *   5.  Single item → unchanged
 *   6.  Equal ratios maintain relative order (stable)
 *
 *   GAPCARD RENDERING
 *   7.  Renders card container
 *   8.  Shows title (en)
 *   9.  Shows title (hi)
 *  10.  Shows meta "+{n} points · ~{m} min"
 *  11.  Shows Hindi meta "+{n} अंक · लगभग {m} मिनट"
 *  12.  CTA button visible with label
 *  13.  CTA fires onCta
 *  14.  Card has accessibilityRole="listitem"
 *  15.  Card accessibility label contains title + meta
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { GapCard, rankGaps, type GapItem, type GapCardProps } from "../index";

// ─── rankGaps tests ─────────────────────────────────────────────

describe("rankGaps", () => {
  it("ranks by pointLift/effortMinutes ratio desc", () => {
    const gaps: GapItem[] = [
      { id: "a", title: { en: "A", hi: "A" }, pointLift: 10, effortMinutes: 10, ctaLabel: { en: "Do", hi: "करें" } }, // ratio 1
      { id: "b", title: { en: "B", hi: "B" }, pointLift: 20, effortMinutes: 5, ctaLabel: { en: "Do", hi: "करें" } },  // ratio 4
      { id: "c", title: { en: "C", hi: "C" }, pointLift: 15, effortMinutes: 10, ctaLabel: { en: "Do", hi: "करें" } }, // ratio 1.5
    ];

    const ranked = rankGaps(gaps);
    expect(ranked.map((g) => g.id)).toEqual(["b", "c", "a"]);
  });

  it("higher ratio first even if lower absolute pointLift", () => {
    const gaps: GapItem[] = [
      { id: "big", title: { en: "Big", hi: "बड़ा" }, pointLift: 50, effortMinutes: 60, ctaLabel: { en: "Do", hi: "करें" } }, // ratio 0.83
      { id: "small", title: { en: "Small", hi: "छोटा" }, pointLift: 10, effortMinutes: 2, ctaLabel: { en: "Do", hi: "करें" } }, // ratio 5
    ];

    const ranked = rankGaps(gaps);
    expect(ranked[0].id).toBe("small");
  });

  it("zero effort → ratio 0 (sorted last)", () => {
    const gaps: GapItem[] = [
      { id: "zero", title: { en: "Zero", hi: "शून्य" }, pointLift: 100, effortMinutes: 0, ctaLabel: { en: "Do", hi: "करें" } },
      { id: "normal", title: { en: "Normal", hi: "सामान्य" }, pointLift: 10, effortMinutes: 5, ctaLabel: { en: "Do", hi: "करें" } },
    ];

    const ranked = rankGaps(gaps);
    expect(ranked[0].id).toBe("normal");
    expect(ranked[1].id).toBe("zero");
  });

  it("empty array → empty", () => {
    expect(rankGaps([])).toEqual([]);
  });

  it("single item → unchanged", () => {
    const gaps: GapItem[] = [
      { id: "only", title: { en: "Only", hi: "केवल" }, pointLift: 10, effortMinutes: 5, ctaLabel: { en: "Do", hi: "करें" } },
    ];
    const ranked = rankGaps(gaps);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe("only");
  });

  it("equal ratios maintain relative order", () => {
    const gaps: GapItem[] = [
      { id: "first", title: { en: "First", hi: "पहला" }, pointLift: 10, effortMinutes: 5, ctaLabel: { en: "Do", hi: "करें" } },
      { id: "second", title: { en: "Second", hi: "दूसरा" }, pointLift: 20, effortMinutes: 10, ctaLabel: { en: "Do", hi: "करें" } },
    ];
    const ranked = rankGaps(gaps);
    // Both ratio = 2; should maintain order
    expect(ranked[0].id).toBe("first");
    expect(ranked[1].id).toBe("second");
  });
});

// ─── GapCard rendering tests ────────────────────────────────────

describe("GapCard", () => {
  const DEFAULT_PROPS: GapCardProps = {
    id: "aa",
    title: { en: "Link your bank account", hi: "अपना बैंक खाता जोड़ें" },
    pointLift: 25,
    effortMinutes: 5,
    ctaLabel: { en: "Do this", hi: "यह करें" },
    locale: "en",
    onCta: jest.fn(),
    onDismiss: jest.fn(),
  };

  const renderCard = (overrides: Partial<GapCardProps> = {}) =>
    render(<GapCard {...DEFAULT_PROPS} {...overrides} />);

  beforeEach(() => jest.clearAllMocks());

  it("renders card container", () => {
    renderCard();
    expect(screen.getByTestId("gap-card-aa")).toBeTruthy();
  });

  it("shows title (en)", () => {
    renderCard({ locale: "en" });
    expect(screen.getByText("Link your bank account")).toBeTruthy();
  });

  it("shows title (hi)", () => {
    renderCard({ locale: "hi" });
    expect(screen.getByText("अपना बैंक खाता जोड़ें")).toBeTruthy();
  });

  it('shows meta "+{n} points · ~{m} min"', () => {
    renderCard({ locale: "en" });
    expect(screen.getByTestId("gap-meta-aa")).toBeTruthy();
    expect(screen.getByText("+25 points · ~5 min")).toBeTruthy();
  });

  it('shows Hindi meta "+{n} अंक · लगभग {m} मिनट"', () => {
    renderCard({ locale: "hi" });
    expect(screen.getByText("+25 अंक · लगभग 5 मिनट")).toBeTruthy();
  });

  it("CTA button visible with label", () => {
    renderCard({ locale: "en" });
    expect(screen.getByTestId("gap-cta-aa")).toBeTruthy();
    expect(screen.getByText("Do this")).toBeTruthy();
  });

  it("CTA fires onCta", () => {
    const onCta = jest.fn();
    renderCard({ onCta });

    fireEvent.press(screen.getByTestId("gap-cta-aa"));
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it('card has role="listitem"', () => {
    renderCard();
    // Uses modern cross-platform `role` prop; legacy `accessibilityRole`
    // isn't set here. Component was missing any role attribute before —
    // now explicitly marks itself as a listitem for screen readers.
    const card = screen.getByTestId("gap-card-aa");
    expect(card.props.role).toBe("listitem");
  });

  it("card accessibility label contains title + meta", () => {
    renderCard({ locale: "en" });
    const card = screen.getByTestId("gap-card-aa");
    expect(card.props.accessibilityLabel).toContain("Link your bank account");
    expect(card.props.accessibilityLabel).toContain("+25 points");
  });
});
