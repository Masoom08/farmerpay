/**
 * CameraCapture — Unit Tests (F3 — Spec §4.2)
 *
 * Tests:
 *   RENDERING
 *   1.  Renders camera container
 *   2.  Guide box overlay visible
 *   3.  Instruction text (en)
 *   4.  Instruction text (hi)
 *   5.  Shutter button present
 *   6.  Back nav present
 *
 *   CAPTURE
 *   7.  Shutter fires capture; onCapture called with base64
 *   8.  Back nav fires onBack
 *
 *   ERROR: BLURRY
 *   9.  Blurry error renders correct title (en)
 *  10.  Blurry error renders correct body (en)
 *  11.  Blurry error renders correct title (hi)
 *  12.  Retry clears error
 *
 *   ERROR: NOT_PMFBY
 *  13.  Not-PMFBY error renders correct title
 *  14.  Not-PMFBY error renders correct body
 *
 *   ERROR: CAMERA_ERROR
 *  15.  Camera error renders fallback copy
 *
 *   OFFLINE
 *  16.  Offline badge shown when isOffline=true
 *  17.  Offline badge hidden when online
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import {
  CameraCapture,
  type CameraCaptureProps,
} from "../CameraCapture";

// ─── Helpers ───────────────────────────────────────────────────

const DEFAULT_PROPS: CameraCaptureProps = {
  locale: "en",
  onCapture: jest.fn(),
  onBack: jest.fn(),
};

const renderCamera = (overrides: Partial<CameraCaptureProps> = {}) =>
  render(<CameraCapture {...DEFAULT_PROPS} {...overrides} />);

// ─── Rendering ─────────────────────────────────────────────────

describe("CameraCapture (rendering)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders camera container", () => {
    renderCamera();
    expect(screen.getByTestId("camera-capture")).toBeTruthy();
  });

  it("guide box overlay visible", () => {
    renderCamera();
    expect(screen.getByTestId("camera-guide-box")).toBeTruthy();
  });

  it("instruction text (en)", () => {
    renderCamera({ locale: "en" });
    expect(screen.getByText("Place the certificate inside the box")).toBeTruthy();
  });

  it("instruction text (hi)", () => {
    renderCamera({ locale: "hi" });
    expect(screen.getByText("प्रमाणपत्र को बॉक्स के अंदर रखें")).toBeTruthy();
  });

  it("shutter button present", () => {
    renderCamera();
    expect(screen.getByTestId("camera-shutter-btn")).toBeTruthy();
  });

  it("back nav present", () => {
    renderCamera();
    expect(screen.getByTestId("camera-nav-back")).toBeTruthy();
  });
});

// ─── Capture ───────────────────────────────────────────────────

describe("CameraCapture (capture)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shutter fires capture; onCapture called with base64", async () => {
    const onCapture = jest.fn();
    const mockCamera = {
      takePictureAsync: jest.fn(async () => ({ base64: "abc123base64" })),
    };

    renderCamera({ onCapture, cameraRef: mockCamera });

    fireEvent.press(screen.getByTestId("camera-shutter-btn"));

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledWith("abc123base64");
    });
  });

  it("back nav fires onBack", () => {
    const onBack = jest.fn();
    renderCamera({ onBack });

    fireEvent.press(screen.getByTestId("camera-nav-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

// ─── Error: BLURRY ─────────────────────────────────────────────

describe("CameraCapture (blurry error)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("blurry error renders correct title (en)", () => {
    renderCamera({ simulateError: "BLURRY", locale: "en" });
    expect(screen.getByTestId("camera-error-blurry")).toBeTruthy();
    expect(screen.getByText("Image is blurry")).toBeTruthy();
  });

  it("blurry error renders correct body (en)", () => {
    renderCamera({ simulateError: "BLURRY", locale: "en" });
    expect(
      screen.getByText(/hold steady and try again/),
    ).toBeTruthy();
  });

  it("blurry error renders correct title (hi)", () => {
    renderCamera({ simulateError: "BLURRY", locale: "hi" });
    expect(screen.getByText("तस्वीर धुंधली है")).toBeTruthy();
  });

  it("retry clears error", () => {
    renderCamera({ simulateError: "BLURRY" });

    expect(screen.getByTestId("camera-error-blurry")).toBeTruthy();

    fireEvent.press(screen.getByTestId("camera-retry-btn"));

    // Should return to camera view
    expect(screen.getByTestId("camera-capture")).toBeTruthy();
  });
});

// ─── Error: NOT_PMFBY ──────────────────────────────────────────

describe("CameraCapture (not-PMFBY error)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("not-PMFBY error renders correct title", () => {
    renderCamera({ simulateError: "NOT_PMFBY", locale: "en" });
    expect(screen.getByText("Not a PMFBY certificate")).toBeTruthy();
  });

  it("not-PMFBY error renders correct body", () => {
    renderCamera({ simulateError: "NOT_PMFBY", locale: "en" });
    expect(
      screen.getByText(/doesn't look like a crop insurance certificate/),
    ).toBeTruthy();
  });
});

// ─── Error: CAMERA_ERROR ───────────────────────────────────────

describe("CameraCapture (camera error)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("camera error renders fallback copy", () => {
    renderCamera({ simulateError: "CAMERA_ERROR", locale: "en" });
    expect(screen.getByText("Camera error")).toBeTruthy();
  });
});

// ─── Offline ───────────────────────────────────────────────────

describe("CameraCapture (offline)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("offline badge shown when isOffline=true", () => {
    renderCamera({ isOffline: true });
    expect(screen.getByTestId("camera-offline-badge")).toBeTruthy();
  });

  it("offline badge hidden when online", () => {
    renderCamera({ isOffline: false });
    expect(screen.queryByTestId("camera-offline-badge")).toBeNull();
  });
});
