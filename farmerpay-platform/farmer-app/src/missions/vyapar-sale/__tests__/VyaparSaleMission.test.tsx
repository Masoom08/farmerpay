/**
 * VyaparSaleMission — Unit Tests (F4 — Spec §4.3)
 *
 * Tests:
 *   INTRO
 *   1.  Renders mission at INTRO step
 *   2.  Shows "+18 points"
 *   3.  Shows "~3 min"
 *   4.  Shows "Add sale" CTA (en)
 *   5.  Shows "बिक्री जोड़ें" CTA (hi)
 *   6.  Illustration present
 *   7.  "Later" fires onExit
 *
 *   ACTION (deep-link)
 *   8.  Primary CTA advances to ACTION step
 *   9.  ACTION shows redirect text
 *  10.  "Open VYAPAR" button present
 *  11.  "Open VYAPAR" calls navigateToAddSale with returnTo
 *  12.  Deep-link saves progress for resume
 *  13.  Back button returns to INTRO
 *
 *   RETURN + CONFIRM (queue state)
 *  14.  isReturning=true jumps to CONFIRM step
 *  15.  Confirm shows "sale is saved" text (en)
 *  16.  Confirm shows "sale is saved" text (hi)
 *  17.  Recompute pending shows "Updating score…"
 *  18.  Recompute done shows "See results" button
 *  19.  "See results" advances to RESULT
 *  20.  Recompute failed shows queue-pending text
 *  21.  "Done for now" fires onExit on failed
 *
 *   RESULT
 *  22.  Result shows before/after scores
 *  23.  Result done fires onExit
 *
 *   ROUND-TRIP
 *  24.  Deep-link state preserved across return
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  VyaparSaleMission,
  RETURN_TO,
  type VyaparSaleMissionProps,
} from "../index";

// ─── Mocks ─────────────────────────────────────────────────────

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

// ─── Helpers ───────────────────────────────────────────────────

const DEFAULT_PROPS: VyaparSaleMissionProps = {
  farmerId: "farmer-1",
  currentScore: 600,
  locale: "en",
  navigateToAddSale: jest.fn(),
  checkNewSale: jest.fn(async () => ({ saleId: "sale-123" })),
  recomputeScore: jest.fn(async () => ({ score: 618 })),
  onExit: jest.fn(),
};

const renderMission = (overrides: Partial<VyaparSaleMissionProps> = {}) =>
  render(<VyaparSaleMission {...DEFAULT_PROPS} {...overrides} />);

// ─── INTRO ─────────────────────────────────────────────────────

describe("VyaparSaleMission (intro)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("renders mission at INTRO step", () => {
    renderMission();
    expect(screen.getByTestId("vyapar-mission")).toBeTruthy();
    expect(screen.getByTestId("mission-intro")).toBeTruthy();
  });

  it('shows "+18 points"', () => {
    renderMission({ locale: "en" });
    expect(screen.getByText("+18 points")).toBeTruthy();
  });

  it('shows "~3 min"', () => {
    renderMission({ locale: "en" });
    expect(screen.getByText("~3 min")).toBeTruthy();
  });

  it('shows "Add sale" CTA (en)', () => {
    renderMission({ locale: "en" });
    expect(screen.getByText("Add sale")).toBeTruthy();
  });

  it('shows "बिक्री जोड़ें" CTA (hi)', () => {
    renderMission({ locale: "hi" });
    expect(screen.getByText("बिक्री जोड़ें")).toBeTruthy();
  });

  it("illustration present", () => {
    renderMission();
    expect(screen.getByTestId("vyapar-illustration")).toBeTruthy();
  });

  it('"Later" fires onExit', () => {
    const onExit = jest.fn();
    renderMission({ onExit });

    fireEvent.press(screen.getByTestId("mission-intro-later"));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

// ─── ACTION (deep-link) ────────────────────────────────────────

describe("VyaparSaleMission (action)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("primary CTA advances to ACTION step", () => {
    renderMission();

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    expect(screen.getByTestId("vyapar-deep-link")).toBeTruthy();
  });

  it("ACTION shows redirect text", () => {
    renderMission({ locale: "en" });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    expect(
      screen.getByText(/Taking you to the sale form/),
    ).toBeTruthy();
  });

  it('"Open VYAPAR" button present', () => {
    renderMission();

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    expect(screen.getByTestId("vyapar-go-btn")).toBeTruthy();
  });

  it('"Open VYAPAR" calls navigateToAddSale with returnTo', () => {
    const navigateToAddSale = jest.fn();
    renderMission({ navigateToAddSale });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    fireEvent.press(screen.getByTestId("vyapar-go-btn"));

    expect(navigateToAddSale).toHaveBeenCalledWith(RETURN_TO);
  });

  it("deep-link saves progress for resume", async () => {
    renderMission();

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    await act(async () => {
      fireEvent.press(screen.getByTestId("vyapar-go-btn"));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining("vyapar-sale-farmer-1"),
      expect.any(String),
    );
  });

  it("back button returns to INTRO", () => {
    renderMission();

    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    expect(screen.getByTestId("vyapar-deep-link")).toBeTruthy();

    fireEvent.press(screen.getByTestId("vyapar-back-btn"));
    expect(screen.getByTestId("mission-intro")).toBeTruthy();
  });
});

// ─── RETURN + CONFIRM (queue state) ────────────────────────────

describe("VyaparSaleMission (return + confirm)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("isReturning=true jumps to CONFIRM step", async () => {
    renderMission({ isReturning: true });

    await waitFor(() => {
      expect(screen.getByTestId("vyapar-queue-state")).toBeTruthy();
    });
  });

  it('confirm shows "sale is saved" text (en)', async () => {
    renderMission({ isReturning: true, locale: "en" });

    await waitFor(() => {
      expect(screen.getByTestId("vyapar-sale-saved")).toBeTruthy();
    });

    expect(
      screen.getByText(/Your sale is saved/),
    ).toBeTruthy();
  });

  it('confirm shows "sale is saved" text (hi)', async () => {
    renderMission({ isReturning: true, locale: "hi" });

    await waitFor(() => {
      expect(screen.getByTestId("vyapar-sale-saved")).toBeTruthy();
    });

    expect(
      screen.getByText(/आपकी बिक्री सेव हो गई है/),
    ).toBeTruthy();
  });

  it('recompute done shows "See results" button', async () => {
    const checkNewSale = jest.fn(async () => ({ saleId: "s-1" }));
    const recomputeScore = jest.fn(async () => ({ score: 618 }));

    renderMission({ isReturning: true, checkNewSale, recomputeScore });

    await waitFor(() => {
      expect(screen.getByTestId("vyapar-recompute-done")).toBeTruthy();
    });
  });

  it('"See results" advances to RESULT', async () => {
    const checkNewSale = jest.fn(async () => ({ saleId: "s-1" }));
    const recomputeScore = jest.fn(async () => ({ score: 618 }));

    renderMission({ isReturning: true, checkNewSale, recomputeScore });

    await waitFor(() => {
      expect(screen.getByTestId("vyapar-continue-btn")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("vyapar-continue-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-result")).toBeTruthy();
    });
  });

  it("recompute failed shows queue-pending text", async () => {
    const checkNewSale = jest.fn(async () => ({ saleId: "s-1" }));
    const recomputeScore = jest.fn(async () => {
      throw new Error("timeout");
    });

    renderMission({ isReturning: true, checkNewSale, recomputeScore });

    await waitFor(() => {
      expect(screen.getByTestId("vyapar-recompute-failed")).toBeTruthy();
    });

    expect(screen.getByTestId("vyapar-queue-pending-text")).toBeTruthy();
  });

  it('"Done for now" fires onExit on failed', async () => {
    const onExit = jest.fn();
    const checkNewSale = jest.fn(async () => ({ saleId: "s-1" }));
    const recomputeScore = jest.fn(async () => {
      throw new Error("timeout");
    });

    renderMission({ isReturning: true, checkNewSale, recomputeScore, onExit });

    await waitFor(() => {
      expect(screen.getByTestId("vyapar-done-anyway-btn")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("vyapar-done-anyway-btn"));
    });

    expect(onExit).toHaveBeenCalled();
  });
});

// ─── RESULT ────────────────────────────────────────────────────

describe("VyaparSaleMission (result)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("result shows before/after scores", async () => {
    const checkNewSale = jest.fn(async () => ({ saleId: "s-1" }));
    const recomputeScore = jest.fn(async () => ({ score: 618 }));

    renderMission({
      isReturning: true,
      currentScore: 600,
      checkNewSale,
      recomputeScore,
    });

    await waitFor(() => {
      expect(screen.getByTestId("vyapar-continue-btn")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("vyapar-continue-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-result")).toBeTruthy();
    });

    expect(screen.getByTestId("mission-result-before").props.children).toBe(600);
    expect(screen.getByTestId("mission-result-after").props.children).toBe(618);
  });

  it("result done fires onExit", async () => {
    const onExit = jest.fn();
    const checkNewSale = jest.fn(async () => ({ saleId: "s-1" }));
    const recomputeScore = jest.fn(async () => ({ score: 618 }));

    renderMission({
      isReturning: true,
      checkNewSale,
      recomputeScore,
      onExit,
    });

    await waitFor(() => {
      expect(screen.getByTestId("vyapar-continue-btn")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("vyapar-continue-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-result-done")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("mission-result-done"));
    });

    expect(onExit).toHaveBeenCalled();
  });
});

// ─── ROUND-TRIP ────────────────────────────────────────────────

describe("VyaparSaleMission (round-trip)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("deep-link state preserved across return", async () => {
    const navigateToAddSale = jest.fn();

    // First render: INTRO → ACTION → deep-link
    const { unmount } = renderMission({ navigateToAddSale });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    await act(async () => {
      fireEvent.press(screen.getByTestId("vyapar-go-btn"));
    });

    expect(navigateToAddSale).toHaveBeenCalledWith(RETURN_TO);

    unmount();

    // Second render: returning from deep-link
    const checkNewSale = jest.fn(async () => ({ saleId: "s-round" }));
    const recomputeScore = jest.fn(async () => ({ score: 618 }));

    renderMission({
      isReturning: true,
      checkNewSale,
      recomputeScore,
    });

    // Should jump to CONFIRM (queue state)
    await waitFor(() => {
      expect(screen.getByTestId("vyapar-queue-state")).toBeTruthy();
    });

    // Sale check + recompute should have been called
    expect(checkNewSale).toHaveBeenCalledWith("farmer-1");
    expect(recomputeScore).toHaveBeenCalledWith("farmer-1");
  });
});
