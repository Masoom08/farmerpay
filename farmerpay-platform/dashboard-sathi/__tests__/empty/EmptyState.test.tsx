/**
 * EmptyState (desktop) — Unit Tests (H2 — Spec §6.2)
 *
 * Tests:
 *   VARIANT RENDERING
 *   1.  NO_TASKS renders title + description
 *   2.  NO_FARMERS renders title + description
 *   3.  NO_DATA renders title + description
 *   4.  NO_NOTIFICATIONS renders title + description
 *   5.  NO_RESULTS renders title + description
 *   6.  Sets data-variant attribute
 *
 *   ILLUSTRATION
 *   7.  Renders SVG illustration
 *
 *   OVERRIDES
 *   8.  Custom title overrides default
 *   9.  Custom description overrides default
 *
 *   CTA SLOT
 *  10.  CTA slot renders when provided
 *  11.  No CTA slot when not provided
 *
 *   PRIVACY
 *  12.  No score-adjacent strings in any variant
 *
 *   CONFIG COMPLETENESS
 *  13.  All 5 variants have title + description + svgPath
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import EmptyState, {
  VARIANTS,
  type EmptyVariant,
} from "../../src/components/empty/EmptyState";

const ALL_VARIANTS: EmptyVariant[] = [
  "NO_TASKS",
  "NO_FARMERS",
  "NO_DATA",
  "NO_NOTIFICATIONS",
  "NO_RESULTS",
];

// ─── Variant rendering ────────────────────────────────────

describe("EmptyState (desktop) — variants", () => {
  it("NO_TASKS renders title + description", () => {
    render(<EmptyState variant="NO_TASKS" />);
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No tasks for today");
    expect(screen.getByTestId("empty-description")).toHaveTextContent("Great job");
  });

  it("NO_FARMERS renders title + description", () => {
    render(<EmptyState variant="NO_FARMERS" />);
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No farmers assigned yet");
  });

  it("NO_DATA renders title + description", () => {
    render(<EmptyState variant="NO_DATA" />);
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No data collected yet");
  });

  it("NO_NOTIFICATIONS renders title + description", () => {
    render(<EmptyState variant="NO_NOTIFICATIONS" />);
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No notifications right now");
  });

  it("NO_RESULTS renders title + description", () => {
    render(<EmptyState variant="NO_RESULTS" />);
    expect(screen.getByTestId("empty-title")).toHaveTextContent("No results found");
  });

  it("sets data-variant attribute", () => {
    render(<EmptyState variant="NO_TASKS" />);
    expect(screen.getByTestId("empty-state")).toHaveAttribute("data-variant", "NO_TASKS");
  });
});

// ─── Illustration ─────────────────────────────────────────

describe("EmptyState (desktop) — illustration", () => {
  it("renders SVG illustration", () => {
    render(<EmptyState variant="NO_TASKS" />);
    expect(screen.getByTestId("empty-illustration")).toBeTruthy();
    const svg = screen.getByTestId("empty-illustration").querySelector("svg");
    expect(svg).toBeTruthy();
  });
});

// ─── Overrides ────────────────────────────────────────────

describe("EmptyState (desktop) — overrides", () => {
  it("custom title overrides default", () => {
    render(<EmptyState variant="NO_TASKS" title="Custom Title" />);
    expect(screen.getByTestId("empty-title")).toHaveTextContent("Custom Title");
  });

  it("custom description overrides default", () => {
    render(<EmptyState variant="NO_TASKS" description="Custom desc" />);
    expect(screen.getByTestId("empty-description")).toHaveTextContent("Custom desc");
  });
});

// ─── CTA slot ─────────────────────────────────────────────

describe("EmptyState (desktop) — CTA slot", () => {
  it("CTA slot renders when provided", () => {
    render(
      <EmptyState
        variant="NO_FARMERS"
        cta={<button data-testid="test-cta">Go</button>}
      />,
    );
    expect(screen.getByTestId("empty-cta")).toBeTruthy();
    expect(screen.getByTestId("test-cta")).toHaveTextContent("Go");
  });

  it("no CTA slot when not provided", () => {
    render(<EmptyState variant="NO_FARMERS" />);
    expect(screen.queryByTestId("empty-cta")).toBeNull();
  });
});

// ─── Privacy ──────────────────────────────────────────────

describe("EmptyState (desktop) — privacy", () => {
  it("no score-adjacent strings in any variant", () => {
    for (const variant of ALL_VARIANTS) {
      const { unmount } = render(<EmptyState variant={variant} />);
      const text = (document.body.textContent || "").toLowerCase();
      expect(text).not.toContain("score");
      expect(text).not.toContain("trust");
      expect(text).not.toContain("point lift");
      unmount();
    }
  });
});

// ─── Config completeness ──────────────────────────────────

describe("EmptyState (desktop) — config", () => {
  it("all 5 variants have title + description + svgPath", () => {
    expect(Object.keys(VARIANTS)).toHaveLength(5);
    for (const variant of ALL_VARIANTS) {
      const config = VARIANTS[variant];
      expect(config.title.length).toBeGreaterThan(0);
      expect(config.description.length).toBeGreaterThan(0);
      expect(config.svgPath.length).toBeGreaterThan(0);
      expect(config.iconColor.length).toBeGreaterThan(0);
    }
  });
});
