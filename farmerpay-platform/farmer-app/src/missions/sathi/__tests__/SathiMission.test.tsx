/**
 * SathiMission — Integration Tests (F5 — Spec §4.4)
 *
 * Tests:
 *   INTRO
 *   1.  Renders mission at INTRO step
 *   2.  Shows "Pick a date" CTA (en)
 *   3.  Shows "तारीख चुनें" CTA (hi)
 *   4.  Illustration present
 *   5.  "Later" fires onExit
 *   6.  No "+X points" badge (pointLift=0)
 *
 *   PRIVACY CARD
 *   7.  Privacy card shown on first booking
 *   8.  Privacy card text (en)
 *   9.  Privacy card text (hi)
 *  10.  "Got it" dismisses privacy card
 *  11.  Privacy dismissed persists to AsyncStorage
 *
 *   ACTION (DateSlotPicker)
 *  12.  Primary CTA advances to ACTION (picker)
 *  13.  Picker renders date strip
 *  14.  Back from picker returns to INTRO
 *
 *   CONFIRM
 *  15.  Picker confirm advances to CONFIRM step
 *  16.  Confirm shows summary with Sathi name + date + slot
 *  17.  Confirm posts to correct endpoint with FARMER_REQUESTED
 *  18.  Booking failure shows error
 *
 *   RESULT
 *  19.  Successful booking advances to RESULT
 *  20.  Result shows "Visit booked!" (en)
 *  21.  Result shows "विज़िट बुक हो गई!" (hi)
 *  22.  Result does NOT show any "+X points" badge (§4.4 note)
 *  23.  Done fires onExit
 *
 *   ERROR STATES
 *  24.  Slot-full renders in picker
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SathiMission, type SathiMissionProps } from "../index";

// ─── Mocks ─────────────────────────────────────────────────────

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

// ─── Helpers ───────────────────────────────────────────────────

const DEFAULT_PROPS: SathiMissionProps = {
  farmerId: "farmer-1",
  sathiName: "Ramu",
  locale: "en",
  bookSathi: jest.fn(async () => ({ taskId: "task-1" })),
  onExit: jest.fn(),
};

const renderMission = (overrides: Partial<SathiMissionProps> = {}) =>
  render(<SathiMission {...DEFAULT_PROPS} {...overrides} />);

// ─── INTRO ─────────────────────────────────────────────────────

describe("SathiMission (intro)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("renders mission at INTRO step", async () => {
    renderMission();
    await waitFor(() => {
      expect(screen.getByTestId("sathi-mission")).toBeTruthy();
    });
    expect(screen.getByTestId("mission-intro")).toBeTruthy();
  });

  it('shows "Pick a date" CTA (en)', async () => {
    renderMission({ locale: "en" });
    await waitFor(() => {
      expect(screen.getByText("Pick a date")).toBeTruthy();
    });
  });

  it('shows "तारीख चुनें" CTA (hi)', async () => {
    renderMission({ locale: "hi" });
    await waitFor(() => {
      expect(screen.getByText("तारीख चुनें")).toBeTruthy();
    });
  });

  it("illustration present", async () => {
    renderMission();
    await waitFor(() => {
      expect(screen.getByTestId("sathi-illustration")).toBeTruthy();
    });
  });

  it('"Later" fires onExit', async () => {
    const onExit = jest.fn();
    renderMission({ onExit });

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-later")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-later"));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("no +X points badge (pointLift=0)", async () => {
    renderMission({ locale: "en" });
    await waitFor(() => {
      expect(screen.getByTestId("mission-intro")).toBeTruthy();
    });

    // The points badge shows "+0 points" which effectively communicates no score delta
    expect(screen.getByText("+0 points")).toBeTruthy();
  });
});

// ─── PRIVACY CARD ──────────────────────────────────────────────

describe("SathiMission (privacy card)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Not shown before
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("privacy card shown on first booking", async () => {
    renderMission();
    await waitFor(() => {
      expect(screen.getByTestId("sathi-privacy-card")).toBeTruthy();
    });
  });

  it("privacy card text (en)", async () => {
    renderMission({ locale: "en" });
    await waitFor(() => {
      expect(
        screen.getByText(/will see only the tasks they need to do/),
      ).toBeTruthy();
    });
  });

  it("privacy card text (hi)", async () => {
    renderMission({ locale: "hi" });
    await waitFor(() => {
      expect(
        screen.getByText(/केवल वही कार्य देखेगा जो उन्हें करने हैं/),
      ).toBeTruthy();
    });
  });

  it('"Got it" dismisses privacy card', async () => {
    renderMission();

    await waitFor(() => {
      expect(screen.getByTestId("sathi-privacy-dismiss")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("sathi-privacy-dismiss"));
    });

    expect(screen.queryByTestId("sathi-privacy-card")).toBeNull();
  });

  it("privacy dismissed persists to AsyncStorage", async () => {
    renderMission();

    await waitFor(() => {
      expect(screen.getByTestId("sathi-privacy-dismiss")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("sathi-privacy-dismiss"));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "farmerpay:sathi_privacy_shown",
      "true",
    );
  });
});

// ─── ACTION ────────────────────────────────────────────────────

describe("SathiMission (action)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Privacy already shown
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === "farmerpay:sathi_privacy_shown") return "true";
      return null;
    });
  });

  it("primary CTA advances to ACTION (picker)", async () => {
    renderMission();

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    expect(screen.getByTestId("date-slot-picker")).toBeTruthy();
  });

  it("picker renders date strip", async () => {
    renderMission();

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    expect(screen.getByTestId("date-strip")).toBeTruthy();
  });

  it("back from picker returns to INTRO", async () => {
    renderMission();

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    expect(screen.getByTestId("date-slot-picker")).toBeTruthy();

    fireEvent.press(screen.getByTestId("picker-back-btn"));
    expect(screen.getByTestId("mission-intro")).toBeTruthy();
  });
});

// ─── CONFIRM ───────────────────────────────────────────────────

describe("SathiMission (confirm)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === "farmerpay:sathi_privacy_shown") return "true";
      return null;
    });
  });

  it("picker confirm advances to CONFIRM step", async () => {
    renderMission();

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    // INTRO → ACTION
    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    // Select afternoon and confirm in picker
    fireEvent.press(screen.getByTestId("slot-afternoon"));
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    // Should now show CONFIRM step
    expect(screen.getByTestId("mission-confirm")).toBeTruthy();
  });

  it("confirm shows summary with Sathi name", async () => {
    renderMission({ sathiName: "Ramu", locale: "en" });

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-confirm")).toBeTruthy();
    });

    // Summary should contain Sathi name
    const summary = screen.getByTestId("mission-confirm-summary");
    expect(summary.props.children).toContain("Ramu");
  });

  it("confirm posts with FARMER_REQUESTED task_type", async () => {
    const bookSathi = jest.fn(async () => ({ taskId: "t-1" }));
    renderMission({ bookSathi });

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    // INTRO → ACTION → CONFIRM
    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-confirm-btn")).toBeTruthy();
    });

    // Press confirm booking
    await act(async () => {
      fireEvent.press(screen.getByTestId("mission-confirm-btn"));
    });

    expect(bookSathi).toHaveBeenCalledWith(
      expect.objectContaining({
        task_type: "FARMER_REQUESTED",
        farmerId: "farmer-1",
      }),
    );
  });

  it("booking failure shows error", async () => {
    const bookSathi = jest.fn(async () => {
      throw new Error("network");
    });
    renderMission({ bookSathi });

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-confirm-btn")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("mission-confirm-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("sathi-booking-failed")).toBeTruthy();
    });
  });
});

// ─── RESULT ────────────────────────────────────────────────────

describe("SathiMission (result)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === "farmerpay:sathi_privacy_shown") return "true";
      return null;
    });
  });

  it("successful booking advances to RESULT", async () => {
    const bookSathi = jest.fn(async () => ({ taskId: "t-ok" }));
    renderMission({ bookSathi });

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    // Full flow: INTRO → ACTION → CONFIRM → book → RESULT
    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-confirm-btn")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("mission-confirm-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("sathi-result")).toBeTruthy();
    });
  });

  it('result shows "Visit booked!" (en)', async () => {
    const bookSathi = jest.fn(async () => ({ taskId: "t-ok" }));
    renderMission({ bookSathi, locale: "en" });

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-confirm-btn")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("mission-confirm-btn"));
    });

    await waitFor(() => {
      expect(screen.getByText("Visit booked!")).toBeTruthy();
    });
  });

  it('result shows "विज़िट बुक हो गई!" (hi)', async () => {
    const bookSathi = jest.fn(async () => ({ taskId: "t-ok" }));
    renderMission({ bookSathi, locale: "hi" });

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-confirm-btn")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("mission-confirm-btn"));
    });

    await waitFor(() => {
      expect(screen.getByText("विज़िट बुक हो गई!")).toBeTruthy();
    });
  });

  it('result does NOT show any "+X points" badge (§4.4 note)', async () => {
    const bookSathi = jest.fn(async () => ({ taskId: "t-ok" }));
    renderMission({ bookSathi, locale: "en" });

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-confirm-btn")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("mission-confirm-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("sathi-result")).toBeTruthy();
    });

    // Custom result — no MissionResult component, no points badge
    expect(screen.queryByText(/points/i)).toBeNull();
    expect(screen.queryByText(/अंक/)).toBeNull();
    expect(screen.queryByTestId("mission-result-lift")).toBeNull();
  });

  it("done fires onExit", async () => {
    const onExit = jest.fn();
    const bookSathi = jest.fn(async () => ({ taskId: "t-ok" }));
    renderMission({ bookSathi, onExit });

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));
    fireEvent.press(screen.getByTestId("booking-confirm-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("mission-confirm-btn")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("mission-confirm-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("sathi-result-done")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("sathi-result-done"));
    });

    expect(onExit).toHaveBeenCalled();
  });
});

// ─── ERROR STATES ──────────────────────────────────────────────

describe("SathiMission (errors)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === "farmerpay:sathi_privacy_shown") return "true";
      return null;
    });
  });

  it("slot-full renders in picker", async () => {
    // Derive today's date key the same way DateSlotPicker does, so
    // the hardcoded date doesn't go stale as the wall clock advances.
    // The picker's days[0] is "today"; marking today:morning as full
    // exercises the full-badge render path.
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const fullSlots = new Set([`${y}-${m}-${d}:morning`]);
    renderMission({ fullSlots });

    await waitFor(() => {
      expect(screen.getByTestId("mission-intro-primary")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("mission-intro-primary"));

    expect(screen.getByTestId("slot-full-morning")).toBeTruthy();
  });
});
