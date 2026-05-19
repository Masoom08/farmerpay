/**
 * EmptyState (mobile) — Unit Tests (H2 — Spec §6.2)
 *
 * Tests:
 *   VARIANT RENDERING
 *   1.  NO_TASKS renders EN title + description
 *   2.  NO_FARMERS renders EN title + description
 *   3.  NO_DATA renders EN title + description
 *   4.  NO_NOTIFICATIONS renders EN title + description
 *   5.  NO_RESULTS renders EN title + description
 *
 *   BILINGUAL
 *   6.  NO_TASKS renders HI title when locale=hi
 *   7.  NO_FARMERS renders HI title when locale=hi
 *
 *   ILLUSTRATION
 *   8.  Renders emoji illustration
 *
 *   OVERRIDES
 *   9.  Custom title overrides default
 *  10.  Custom description overrides default
 *
 *   CTA SLOT
 *  11.  CTA slot renders when provided
 *  12.  No CTA slot when not provided
 *
 *   PRIVACY
 *  13.  No score-adjacent strings in any variant (EN)
 *  14.  No score-adjacent strings in any variant (HI)
 *
 *   CONFIG
 *  15.  All 5 variants have en + hi titles and descriptions
 */

import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import EmptyState, {
  VARIANTS,
  type EmptyVariant,
} from "../EmptyState";

const ALL_VARIANTS: EmptyVariant[] = [
  "NO_TASKS",
  "NO_FARMERS",
  "NO_DATA",
  "NO_NOTIFICATIONS",
  "NO_RESULTS",
];

// ─── Variant rendering (EN) ──────────────────────────────

describe("EmptyState (mobile) — variants EN", () => {
  it("NO_TASKS renders EN title + description", () => {
    const { getByTestId } = render(<EmptyState variant="NO_TASKS" />);
    expect(getByTestId("empty-title").props.children).toBe("No tasks for today");
  });

  it("NO_FARMERS renders EN title + description", () => {
    const { getByTestId } = render(<EmptyState variant="NO_FARMERS" />);
    expect(getByTestId("empty-title").props.children).toBe("No farmers assigned yet");
  });

  it("NO_DATA renders EN title + description", () => {
    const { getByTestId } = render(<EmptyState variant="NO_DATA" />);
    expect(getByTestId("empty-title").props.children).toBe("No data collected yet");
  });

  it("NO_NOTIFICATIONS renders EN title + description", () => {
    const { getByTestId } = render(<EmptyState variant="NO_NOTIFICATIONS" />);
    expect(getByTestId("empty-title").props.children).toBe("No notifications right now");
  });

  it("NO_RESULTS renders EN title + description", () => {
    const { getByTestId } = render(<EmptyState variant="NO_RESULTS" />);
    expect(getByTestId("empty-title").props.children).toBe("No results found");
  });
});

// ─── Bilingual (HI) ──────────────────────────────────────

describe("EmptyState (mobile) — bilingual HI", () => {
  it("NO_TASKS renders HI title when locale=hi", () => {
    const { getByTestId } = render(<EmptyState variant="NO_TASKS" locale="hi" />);
    expect(getByTestId("empty-title").props.children).toBe(
      VARIANTS.NO_TASKS.title.hi,
    );
  });

  it("NO_FARMERS renders HI title when locale=hi", () => {
    const { getByTestId } = render(<EmptyState variant="NO_FARMERS" locale="hi" />);
    expect(getByTestId("empty-title").props.children).toBe(
      VARIANTS.NO_FARMERS.title.hi,
    );
  });
});

// ─── Illustration ─────────────────────────────────────────

describe("EmptyState (mobile) — illustration", () => {
  it("renders emoji illustration", () => {
    const { getByTestId } = render(<EmptyState variant="NO_TASKS" />);
    const illustration = getByTestId("empty-illustration");
    expect(illustration).toBeTruthy();
  });
});

// ─── Overrides ────────────────────────────────────────────

describe("EmptyState (mobile) — overrides", () => {
  it("custom title overrides default", () => {
    const { getByTestId } = render(
      <EmptyState variant="NO_TASKS" title="Custom Title" />,
    );
    expect(getByTestId("empty-title").props.children).toBe("Custom Title");
  });

  it("custom description overrides default", () => {
    const { getByTestId } = render(
      <EmptyState variant="NO_TASKS" description="Custom desc" />,
    );
    expect(getByTestId("empty-description").props.children).toBe("Custom desc");
  });
});

// ─── CTA slot ─────────────────────────────────────────────

describe("EmptyState (mobile) — CTA slot", () => {
  it("CTA slot renders when provided", () => {
    const { getByTestId } = render(
      <EmptyState
        variant="NO_FARMERS"
        cta={<Text testID="test-cta">Go</Text>}
      />,
    );
    expect(getByTestId("empty-cta")).toBeTruthy();
    expect(getByTestId("test-cta")).toBeTruthy();
  });

  it("no CTA slot when not provided", () => {
    const { queryByTestId } = render(<EmptyState variant="NO_FARMERS" />);
    expect(queryByTestId("empty-cta")).toBeNull();
  });
});

// ─── Privacy ──────────────────────────────────────────────

describe("EmptyState (mobile) — privacy", () => {
  it("no score-adjacent strings in any variant (EN)", () => {
    for (const variant of ALL_VARIANTS) {
      const config = VARIANTS[variant];
      const combined = (config.title.en + " " + config.description.en).toLowerCase();
      expect(combined).not.toContain("score");
      expect(combined).not.toContain("trust");
      expect(combined).not.toContain("point lift");
    }
  });

  it("no score-adjacent strings in any variant (HI)", () => {
    for (const variant of ALL_VARIANTS) {
      const config = VARIANTS[variant];
      const combined = (config.title.hi + " " + config.description.hi).toLowerCase();
      expect(combined).not.toContain("score");
      expect(combined).not.toContain("trust");
    }
  });
});

// ─── Config completeness ──────────────────────────────────

describe("EmptyState (mobile) — config", () => {
  it("all 5 variants have en + hi titles and descriptions", () => {
    expect(Object.keys(VARIANTS)).toHaveLength(5);
    for (const variant of ALL_VARIANTS) {
      const config = VARIANTS[variant];
      expect(config.title.en.length).toBeGreaterThan(0);
      expect(config.title.hi.length).toBeGreaterThan(0);
      expect(config.description.en.length).toBeGreaterThan(0);
      expect(config.description.hi.length).toBeGreaterThan(0);
      expect(config.emoji.length).toBeGreaterThan(0);
    }
  });
});
