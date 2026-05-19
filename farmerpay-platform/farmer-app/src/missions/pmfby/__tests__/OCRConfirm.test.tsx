/**
 * OCRConfirm — Unit Tests (F3 — Spec §4.2)
 *
 * Tests:
 *   RENDERING
 *   1.  Renders confirm container
 *   2.  Shows title (en)
 *   3.  Shows title (hi)
 *   4.  Renders all 4 fields
 *   5.  Field labels shown
 *   6.  Field values shown
 *
 *   EDITING
 *   7.  Tap field switches to TextInput
 *   8.  TextInput shows current value
 *   9.  Editing a field updates value
 *  10.  Low-confidence field highlighted
 *  11.  Low-confidence field shows "(check)" badge
 *
 *   CONFIRM / CANCEL
 *  12.  Confirm button present
 *  13.  Confirm fires onConfirm with edited fields
 *  14.  Cancel fires onCancel
 *
 *   SAVE STATUS
 *  15.  Saving shows "Saving…" text
 *  16.  Failed shows save error message
 *  17.  Save error mentions photo saved locally
 *
 *   OFFLINE
 *  18.  Offline badge shown when isOffline=true
 *  19.  Offline badge hidden when online
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { OCRConfirm, type OCRConfirmProps, type OcrField } from "../OCRConfirm";

// ─── Test data ─────────────────────────────────────────────────

const MOCK_FIELDS: OcrField[] = [
  { key: "policyNo", label: { en: "Policy No", hi: "पॉलिसी नंबर" }, value: "PMFBY-2026-001", confidence: 0.95 },
  { key: "crop", label: { en: "Crop", hi: "फसल" }, value: "Wheat", confidence: 0.88 },
  { key: "insuredAmount", label: { en: "Insured amount", hi: "बीमित राशि" }, value: "₹50,000", confidence: 0.6 },
  { key: "validTill", label: { en: "Valid till", hi: "वैध तक" }, value: "2026-12-31", confidence: 0.92 },
];

const DEFAULT_PROPS: OCRConfirmProps = {
  fields: MOCK_FIELDS,
  locale: "en",
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

const renderConfirm = (overrides: Partial<OCRConfirmProps> = {}) =>
  render(<OCRConfirm {...DEFAULT_PROPS} {...overrides} />);

// ─── Rendering ─────────────────────────────────────────────────

describe("OCRConfirm (rendering)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders confirm container", () => {
    renderConfirm();
    expect(screen.getByTestId("ocr-confirm")).toBeTruthy();
  });

  it("shows title (en)", () => {
    renderConfirm({ locale: "en" });
    expect(screen.getByText("Review the details")).toBeTruthy();
  });

  it("shows title (hi)", () => {
    renderConfirm({ locale: "hi" });
    expect(screen.getByText("विवरण की जाँच करें")).toBeTruthy();
  });

  it("renders all 4 fields", () => {
    renderConfirm();
    expect(screen.getByTestId("ocr-field-policyNo")).toBeTruthy();
    expect(screen.getByTestId("ocr-field-crop")).toBeTruthy();
    expect(screen.getByTestId("ocr-field-insuredAmount")).toBeTruthy();
    expect(screen.getByTestId("ocr-field-validTill")).toBeTruthy();
  });

  it("field labels shown", () => {
    renderConfirm({ locale: "en" });
    expect(screen.getByText("Policy No")).toBeTruthy();
    expect(screen.getByText("Crop")).toBeTruthy();
  });

  it("field values shown", () => {
    renderConfirm();
    expect(screen.getByText("PMFBY-2026-001")).toBeTruthy();
    expect(screen.getByText("Wheat")).toBeTruthy();
    expect(screen.getByText("₹50,000")).toBeTruthy();
  });
});

// ─── Editing ───────────────────────────────────────────────────

describe("OCRConfirm (editing)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("tap field switches to TextInput", () => {
    renderConfirm();

    // Before tap — no input
    expect(screen.queryByTestId("ocr-input-crop")).toBeNull();

    // Tap the value to edit
    fireEvent.press(screen.getByTestId("ocr-value-crop"));

    // After tap — input appears
    expect(screen.getByTestId("ocr-input-crop")).toBeTruthy();
  });

  it("TextInput shows current value", () => {
    renderConfirm();

    fireEvent.press(screen.getByTestId("ocr-value-crop"));

    const input = screen.getByTestId("ocr-input-crop");
    expect(input.props.value).toBe("Wheat");
  });

  it("editing a field updates value", () => {
    renderConfirm();

    fireEvent.press(screen.getByTestId("ocr-value-crop"));
    fireEvent.changeText(screen.getByTestId("ocr-input-crop"), "Rice");

    // Blur to exit edit mode
    fireEvent(screen.getByTestId("ocr-input-crop"), "blur");

    // Value should now show Rice
    expect(screen.getByText("Rice")).toBeTruthy();
  });

  it("low-confidence field highlighted", () => {
    renderConfirm();

    const field = screen.getByTestId("ocr-field-insuredAmount");
    const styles = field.props.style;
    const flat = (Array.isArray(styles) ? styles : [styles]).flat(10);
    const hasAmberBorder = flat.some((s: any) => s?.borderColor === "#F59E0B");
    expect(hasAmberBorder).toBe(true);
  });

  it('low-confidence field shows "(check)" badge', () => {
    renderConfirm({ locale: "en" });
    expect(screen.getByText(/\(check\)/)).toBeTruthy();
  });
});

// ─── Confirm / Cancel ──────────────────────────────────────────

describe("OCRConfirm (confirm/cancel)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("confirm button present", () => {
    renderConfirm();
    expect(screen.getByTestId("ocr-confirm-btn")).toBeTruthy();
  });

  it("confirm fires onConfirm with fields", () => {
    const onConfirm = jest.fn();
    renderConfirm({ onConfirm });

    fireEvent.press(screen.getByTestId("ocr-confirm-btn"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ key: "policyNo" }),
        expect.objectContaining({ key: "crop" }),
      ]),
    );
  });

  it("cancel fires onCancel", () => {
    const onCancel = jest.fn();
    renderConfirm({ onCancel });

    fireEvent.press(screen.getByTestId("ocr-cancel-btn"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ─── Save status ───────────────────────────────────────────────

describe("OCRConfirm (save status)", () => {
  beforeEach(() => jest.clearAllMocks());

  it('saving shows "Saving…" text', () => {
    renderConfirm({ saveStatus: "SAVING", locale: "en" });
    expect(screen.getByText("Saving…")).toBeTruthy();
  });

  it("failed shows save error message", () => {
    renderConfirm({ saveStatus: "FAILED", locale: "en" });
    expect(screen.getByTestId("ocr-save-error")).toBeTruthy();
  });

  it("save error mentions photo saved locally", () => {
    renderConfirm({ saveStatus: "FAILED", locale: "en" });
    expect(
      screen.getByText(/photo is saved locally/),
    ).toBeTruthy();
  });
});

// ─── Offline ───────────────────────────────────────────────────

describe("OCRConfirm (offline)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("offline badge shown when isOffline=true", () => {
    renderConfirm({ isOffline: true });
    expect(screen.getByTestId("ocr-offline-badge")).toBeTruthy();
  });

  it("offline badge hidden when online", () => {
    renderConfirm({ isOffline: false });
    expect(screen.queryByTestId("ocr-offline-badge")).toBeNull();
  });
});
