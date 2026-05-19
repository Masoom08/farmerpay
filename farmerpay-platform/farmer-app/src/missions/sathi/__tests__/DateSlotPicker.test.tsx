/**
 * DateSlotPicker — Unit Tests (F5 — Spec §4.4)
 *
 * Tests:
 *   RENDERING
 *   1.  Renders picker container
 *   2.  Title shown (en)
 *   3.  Title shown (hi)
 *   4.  Shows exactly 7 date cells
 *   5.  First date cell is the start date
 *   6.  Date range limited to next 7 days only
 *   7.  Morning/afternoon slot toggles present
 *   8.  Note input present
 *   9.  Confirm button present
 *  10.  Back button present
 *
 *   SELECTION
 *  11.  Tapping date cell selects it
 *  12.  Tapping slot toggle selects it
 *  13.  Confirm fires onConfirm with (date, slot, note)
 *  14.  Note text is passed through
 *
 *   SLOT-FULL
 *  15.  Full slot renders "Full" badge
 *  16.  Full slot is disabled (not pressable)
 *  17.  Confirm disabled when selected slot is full
 *  18.  Slot-full inline warning shown
 *
 *   ERRORS
 *  19.  SATHI_NOT_ASSIGNED renders correct title
 *  20.  SATHI_NOT_ASSIGNED renders correct body
 *  21.  SLOT_FULL error renders correct title
 *  22.  VISIT_CANCELLED renders correct title
 *  23.  Error back button fires onBack
 *
 *   A11Y
 *  24.  Date cells have accessibilityState.selected
 *  25.  Slot toggles have accessibilityState
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import {
  DateSlotPicker,
  type DateSlotPickerProps,
} from "../DateSlotPicker";

// ─── Helpers ───────────────────────────────────────────────────

const FIXED_START = new Date(2026, 3, 14); // Apr 14, 2026 (Tue)

const DEFAULT_PROPS: DateSlotPickerProps = {
  locale: "en",
  startDate: FIXED_START,
  onConfirm: jest.fn(),
  onBack: jest.fn(),
};

const renderPicker = (overrides: Partial<DateSlotPickerProps> = {}) =>
  render(<DateSlotPicker {...DEFAULT_PROPS} {...overrides} />);

// ─── Rendering ─────────────────────────────────────────────────

describe("DateSlotPicker (rendering)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders picker container", () => {
    renderPicker();
    expect(screen.getByTestId("date-slot-picker")).toBeTruthy();
  });

  it("title shown (en)", () => {
    renderPicker({ locale: "en" });
    expect(screen.getByText("Pick a date and time")).toBeTruthy();
  });

  it("title shown (hi)", () => {
    renderPicker({ locale: "hi" });
    expect(screen.getByText("तारीख और समय चुनें")).toBeTruthy();
  });

  it("shows exactly 7 date cells", () => {
    renderPicker();
    for (let i = 0; i < 7; i++) {
      expect(screen.getByTestId(`date-cell-${i}`)).toBeTruthy();
    }
    expect(screen.queryByTestId("date-cell-7")).toBeNull();
  });

  it("first date cell is the start date", () => {
    renderPicker({ startDate: FIXED_START });
    // Apr 14 → date number is 14
    expect(screen.getByTestId("date-num-0").props.children).toBe(14);
  });

  it("date range limited to next 7 days only", () => {
    renderPicker({ startDate: FIXED_START });
    // Last cell: Apr 14 + 6 = Apr 20
    expect(screen.getByTestId("date-num-6").props.children).toBe(20);
  });

  it("morning/afternoon slot toggles present", () => {
    renderPicker();
    expect(screen.getByTestId("slot-morning")).toBeTruthy();
    expect(screen.getByTestId("slot-afternoon")).toBeTruthy();
  });

  it("note input present", () => {
    renderPicker();
    expect(screen.getByTestId("booking-note")).toBeTruthy();
  });

  it("confirm button present", () => {
    renderPicker();
    expect(screen.getByTestId("booking-confirm-btn")).toBeTruthy();
  });

  it("back button present", () => {
    renderPicker();
    expect(screen.getByTestId("picker-back-btn")).toBeTruthy();
  });
});

// ─── Selection ─────────────────────────────────────────────────

describe("DateSlotPicker (selection)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("tapping date cell selects it", () => {
    renderPicker();

    fireEvent.press(screen.getByTestId("date-cell-2"));

    const cell = screen.getByTestId("date-cell-2");
    expect(cell.props.accessibilityState.selected).toBe(true);
  });

  it("tapping slot toggle selects it", () => {
    renderPicker();

    fireEvent.press(screen.getByTestId("slot-afternoon"));

    const slot = screen.getByTestId("slot-afternoon");
    expect(slot.props.accessibilityState.selected).toBe(true);
  });

  it("confirm fires onConfirm with (date, slot, note)", () => {
    const onConfirm = jest.fn();
    renderPicker({ onConfirm });

    // Select second date
    fireEvent.press(screen.getByTestId("date-cell-1"));
    // Select afternoon
    fireEvent.press(screen.getByTestId("slot-afternoon"));
    // Type note
    fireEvent.changeText(screen.getByTestId("booking-note"), "Field 3");
    // Confirm
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [date, slot, note] = onConfirm.mock.calls[0];
    expect(date.getDate()).toBe(15); // Apr 15
    expect(slot).toBe("afternoon");
    expect(note).toBe("Field 3");
  });

  it("note text is passed through", () => {
    const onConfirm = jest.fn();
    renderPicker({ onConfirm });

    fireEvent.changeText(screen.getByTestId("booking-note"), "Near river");
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    expect(onConfirm.mock.calls[0][2]).toBe("Near river");
  });
});

// ─── Slot-full ─────────────────────────────────────────────────

describe("DateSlotPicker (slot-full)", () => {
  beforeEach(() => jest.clearAllMocks());

  const fullSlots = new Set(["2026-04-14:morning"]);

  it('full slot renders "Full" badge', () => {
    renderPicker({ fullSlots });
    expect(screen.getByTestId("slot-full-morning")).toBeTruthy();
  });

  it("full slot is disabled", () => {
    renderPicker({ fullSlots });
    const slot = screen.getByTestId("slot-morning");
    expect(slot.props.accessibilityState.disabled).toBe(true);
  });

  it("confirm disabled when selected slot is full", () => {
    // Morning is full and is default selected
    renderPicker({ fullSlots });

    const btn = screen.getByTestId("booking-confirm-btn");
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it("slot-full inline warning shown", () => {
    renderPicker({ fullSlots });
    expect(screen.getByTestId("slot-full-warning")).toBeTruthy();
  });
});

// ─── Errors ────────────────────────────────────────────────────

describe("DateSlotPicker (errors)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("SATHI_NOT_ASSIGNED renders correct title", () => {
    renderPicker({ error: "SATHI_NOT_ASSIGNED", locale: "en" });
    expect(screen.getByText("No Sathi assigned yet")).toBeTruthy();
  });

  it("SATHI_NOT_ASSIGNED renders correct body", () => {
    renderPicker({ error: "SATHI_NOT_ASSIGNED", locale: "en" });
    expect(screen.getByText(/not been assigned to your area/)).toBeTruthy();
  });

  it("SLOT_FULL error renders correct title", () => {
    renderPicker({ error: "SLOT_FULL", locale: "en" });
    expect(screen.getByText("This slot is full")).toBeTruthy();
  });

  it("VISIT_CANCELLED renders correct title", () => {
    renderPicker({ error: "VISIT_CANCELLED", locale: "en" });
    expect(screen.getByText("Visit cancelled")).toBeTruthy();
  });

  it("error back button fires onBack", () => {
    const onBack = jest.fn();
    renderPicker({ error: "SATHI_NOT_ASSIGNED", onBack });

    fireEvent.press(screen.getByTestId("sathi-error-back-btn"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// ─── A11y ──────────────────────────────────────────────────────

describe("DateSlotPicker (a11y)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("date cells have accessibilityState.selected", () => {
    renderPicker();

    // First cell is selected by default
    const cell0 = screen.getByTestId("date-cell-0");
    expect(cell0.props.accessibilityState.selected).toBe(true);

    // Other cells not selected
    const cell1 = screen.getByTestId("date-cell-1");
    expect(cell1.props.accessibilityState.selected).toBe(false);
  });

  it("slot toggles have accessibilityState", () => {
    renderPicker();

    const morning = screen.getByTestId("slot-morning");
    expect(morning.props.accessibilityState.selected).toBe(true);

    const afternoon = screen.getByTestId("slot-afternoon");
    expect(afternoon.props.accessibilityState.selected).toBe(false);
  });
});
