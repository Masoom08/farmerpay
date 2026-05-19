/**
 * SourceChipRow — Unit Tests (E5)
 *
 * Tests:
 *   RENDERING
 *   1.  Renders row container
 *   2.  Horizontal scroll present
 *   3.  Renders 5 chips for 5 sources
 *   4.  Chip labels match source type (en)
 *   5.  Chip labels match source type (hi)
 *   6.  Connected chip shows ✓ icon
 *   7.  Pending chip shows ◌ icon
 *   8.  Missing chip shows ✕ icon
 *   9.  Connected chip has green styling
 *  10.  Missing chip has grey styling
 *
 *   TAP CONNECTED → DETAIL
 *  11.  Tap connected chip opens detail panel
 *  12.  Detail shows last-sync date
 *  13.  Detail shows "Refresh now" button
 *  14.  Tap "Refresh now" fires onRefresh with source
 *  15.  Detail has close button
 *  16.  Close button hides detail
 *  17.  Tap connected again toggles detail off
 *
 *   TAP MISSING → MISSION
 *  18.  Tap missing chip fires onSourceTap with correct source
 *  19.  Tap pending chip fires onSourceTap with correct source
 *  20.  Tap missing does NOT open detail
 *
 *   A11Y
 *  21.  Chips have accessibilityRole="button"
 *  22.  Connected chip a11y label says "connected"
 *  23.  Missing chip a11y label says "not connected"
 *  24.  Detail refresh has a11y label
 *
 *   LOCALE
 *  25.  Hindi labels shown for hi locale
 *  26.  Hindi detail sync text
 *  27.  Hindi refresh button text
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import {
  SourceChipRow,
  type SourceChipRowProps,
  type Source,
} from "../index";
import { brand, neutral } from "../../../../theme";

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_SOURCES: Source[] = [
  { type: "AA", status: "CONNECTED", lastSync: "2026-04-10T10:00:00Z" },
  { type: "CIBIL", status: "CONNECTED", lastSync: "2026-03-20T08:00:00Z" },
  { type: "ROOTS", status: "PENDING" },
  { type: "PMFBY", status: "MISSING" },
  { type: "POP", status: "MISSING" },
];

const DEFAULT_PROPS: SourceChipRowProps = {
  sources: MOCK_SOURCES,
  locale: "en",
  onSourceTap: jest.fn(),
  onRefresh: jest.fn(),
};

const renderRow = (overrides: Partial<SourceChipRowProps> = {}) =>
  render(<SourceChipRow {...DEFAULT_PROPS} {...overrides} />);

// ─── Rendering ──────────────────────────────────────────────────

describe("SourceChipRow (rendering)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders row container", () => {
    renderRow();
    expect(screen.getByTestId("source-chip-row")).toBeTruthy();
  });

  it("horizontal scroll present", () => {
    renderRow();
    expect(screen.getByTestId("source-chip-scroll")).toBeTruthy();
  });

  it("renders 5 chips for 5 sources", () => {
    renderRow();
    expect(screen.getByTestId("chip-AA")).toBeTruthy();
    expect(screen.getByTestId("chip-CIBIL")).toBeTruthy();
    expect(screen.getByTestId("chip-ROOTS")).toBeTruthy();
    expect(screen.getByTestId("chip-PMFBY")).toBeTruthy();
    expect(screen.getByTestId("chip-POP")).toBeTruthy();
  });

  it("chip labels match source type (en)", () => {
    renderRow({ locale: "en" });
    expect(screen.getByText("Bank")).toBeTruthy();
    expect(screen.getByText("Credit")).toBeTruthy();
    expect(screen.getByText("Land")).toBeTruthy();
    expect(screen.getByText("Crop Insurance")).toBeTruthy();
    expect(screen.getByText("Farm Practice")).toBeTruthy();
  });

  it("chip labels match source type (hi)", () => {
    renderRow({ locale: "hi" });
    expect(screen.getByText("बैंक")).toBeTruthy();
    expect(screen.getByText("क्रेडिट")).toBeTruthy();
    expect(screen.getByText("भूमि")).toBeTruthy();
    expect(screen.getByText("फसल बीमा")).toBeTruthy();
    expect(screen.getByText("कृषि अभ्यास")).toBeTruthy();
  });

  it("connected chip shows ✓ icon", () => {
    renderRow();
    expect(screen.getByTestId("chip-icon-AA")).toBeTruthy();
    const icon = screen.getByTestId("chip-icon-AA");
    expect(icon.props.children).toBe("✓");
  });

  it("pending chip shows ◌ icon", () => {
    renderRow();
    const icon = screen.getByTestId("chip-icon-ROOTS");
    expect(icon.props.children).toBe("◌");
  });

  it("missing chip shows ✕ icon", () => {
    renderRow();
    const icon = screen.getByTestId("chip-icon-PMFBY");
    expect(icon.props.children).toBe("✕");
  });

  it("connected chip has green styling", () => {
    renderRow();
    const chip = screen.getByTestId("chip-AA");
    const styles = chip.props.style;
    const flat = (Array.isArray(styles) ? styles : [styles]).flat(10);
    const bg = flat.find((s: any) => s?.backgroundColor === brand.primary[50]);
    expect(bg).toBeTruthy();
  });

  it("missing chip has grey styling", () => {
    renderRow();
    const chip = screen.getByTestId("chip-PMFBY");
    const styles = chip.props.style;
    const flat = (Array.isArray(styles) ? styles : [styles]).flat(10);
    const bg = flat.find((s: any) => s?.backgroundColor === neutral[100]);
    expect(bg).toBeTruthy();
  });
});

// ─── Tap connected → detail ─────────────────────────────────────

describe("SourceChipRow (tap connected)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("tap connected chip opens detail panel", () => {
    renderRow();

    // Initially no detail
    expect(screen.queryByTestId("detail-AA")).toBeNull();

    fireEvent.press(screen.getByTestId("chip-AA"));

    expect(screen.getByTestId("detail-AA")).toBeTruthy();
  });

  it("detail shows last-sync date", () => {
    renderRow();
    fireEvent.press(screen.getByTestId("chip-AA"));

    const sync = screen.getByTestId("detail-sync-AA");
    expect(sync.props.children).toContain("Last sync");
  });

  it('detail shows "Refresh now" button', () => {
    renderRow();
    fireEvent.press(screen.getByTestId("chip-AA"));

    expect(screen.getByTestId("detail-refresh-AA")).toBeTruthy();
    expect(screen.getByText("Refresh now")).toBeTruthy();
  });

  it('"Refresh now" fires onRefresh with source', () => {
    const onRefresh = jest.fn();
    renderRow({ onRefresh });

    fireEvent.press(screen.getByTestId("chip-AA"));
    fireEvent.press(screen.getByTestId("detail-refresh-AA"));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith(
      expect.objectContaining({ type: "AA", status: "CONNECTED" }),
    );
  });

  it("detail has close button", () => {
    renderRow();
    fireEvent.press(screen.getByTestId("chip-AA"));

    expect(screen.getByTestId("detail-close-AA")).toBeTruthy();
  });

  it("close button hides detail", () => {
    renderRow();
    fireEvent.press(screen.getByTestId("chip-AA"));
    expect(screen.getByTestId("detail-AA")).toBeTruthy();

    fireEvent.press(screen.getByTestId("detail-close-AA"));
    expect(screen.queryByTestId("detail-AA")).toBeNull();
  });

  it("tap connected again toggles detail off", () => {
    renderRow();

    fireEvent.press(screen.getByTestId("chip-AA"));
    expect(screen.getByTestId("detail-AA")).toBeTruthy();

    fireEvent.press(screen.getByTestId("chip-AA"));
    expect(screen.queryByTestId("detail-AA")).toBeNull();
  });
});

// ─── Tap missing → mission ──────────────────────────────────────

describe("SourceChipRow (tap missing)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("tap missing chip fires onSourceTap with correct source", () => {
    const onSourceTap = jest.fn();
    renderRow({ onSourceTap });

    fireEvent.press(screen.getByTestId("chip-PMFBY"));

    expect(onSourceTap).toHaveBeenCalledTimes(1);
    expect(onSourceTap).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PMFBY", status: "MISSING" }),
    );
  });

  it("tap pending chip fires onSourceTap with correct source", () => {
    const onSourceTap = jest.fn();
    renderRow({ onSourceTap });

    fireEvent.press(screen.getByTestId("chip-ROOTS"));

    expect(onSourceTap).toHaveBeenCalledTimes(1);
    expect(onSourceTap).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ROOTS", status: "PENDING" }),
    );
  });

  it("tap missing does NOT open detail", () => {
    renderRow();

    fireEvent.press(screen.getByTestId("chip-PMFBY"));

    expect(screen.queryByTestId("detail-PMFBY")).toBeNull();
  });
});

// ─── A11y ───────────────────────────────────────────────────────

describe("SourceChipRow (a11y)", () => {
  it('chips have accessibilityRole="button"', () => {
    renderRow();
    expect(screen.getByTestId("chip-AA").props.accessibilityRole).toBe("button");
    expect(screen.getByTestId("chip-PMFBY").props.accessibilityRole).toBe("button");
  });

  it('connected chip a11y label says "connected"', () => {
    renderRow({ locale: "en" });
    const chip = screen.getByTestId("chip-AA");
    expect(chip.props.accessibilityLabel).toContain("connected");
  });

  it('missing chip a11y label says "not connected"', () => {
    renderRow({ locale: "en" });
    const chip = screen.getByTestId("chip-PMFBY");
    expect(chip.props.accessibilityLabel).toContain("not connected");
  });

  it("detail refresh has a11y label", () => {
    renderRow();
    fireEvent.press(screen.getByTestId("chip-AA"));

    const btn = screen.getByTestId("detail-refresh-AA");
    expect(btn.props.accessibilityLabel).toBe("Refresh now");
  });
});

// ─── Locale ─────────────────────────────────────────────────────

describe("SourceChipRow (locale)", () => {
  it("Hindi labels shown for hi locale", () => {
    renderRow({ locale: "hi" });
    expect(screen.getByText("बैंक")).toBeTruthy();
    expect(screen.getByText("भूमि")).toBeTruthy();
  });

  it("Hindi detail sync text", () => {
    renderRow({ locale: "hi" });
    fireEvent.press(screen.getByTestId("chip-AA"));

    const sync = screen.getByTestId("detail-sync-AA");
    expect(sync.props.children).toContain("अंतिम सिंक");
  });

  it("Hindi refresh button text", () => {
    renderRow({ locale: "hi" });
    fireEvent.press(screen.getByTestId("chip-AA"));

    expect(screen.getByText("अभी रिफ्रेश करें")).toBeTruthy();
  });
});
