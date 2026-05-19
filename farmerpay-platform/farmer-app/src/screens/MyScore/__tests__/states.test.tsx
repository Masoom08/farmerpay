/**
 * MyScore state matrix — Unit Tests (E7 — Spec §3.5)
 *
 * Tests:
 *   STATE RESOLVER (resolveState)
 *   1.  Online + AA not linked → NO_AA
 *   2.  Online + AA linked + no score → NO_SCORE
 *   3.  Online + AA linked + score + lastSync >30d → STALE
 *   4.  Online + AA linked + score + fresh sync + numericOff → NUMERIC_OFF
 *   5.  Online + AA linked + score + fresh sync → READY
 *   6.  Offline always → OFFLINE regardless of other signals
 *   7.  Offline overrides NO_AA
 *   8.  Offline overrides STALE
 *
 *   STATE COPY (getStateCopy)
 *   9.  NO_AA: showHero=false
 *  10.  NO_SCORE: ctaEnabled=false
 *  11.  STALE: showBanner=true
 *  12.  OFFLINE: showBanner=true, ctaEnabled=false
 *  13.  OFFLINE: "sathi" exempt from CTA disable
 *  14.  READY: showHero=true, ctaEnabled=true, showBanner=false
 *  15.  NUMERIC_OFF: showHero=true
 *
 *   isCtaEnabled
 *  16.  READY state: any gapId → true
 *  17.  OFFLINE state: "sathi" → true (queued)
 *  18.  OFFLINE state: "aa" → false
 *  19.  NO_SCORE state: any gapId → false
 *
 *   SCREEN RENDERING PER STATE
 *  20.  NO_AA renders link-bank CTA
 *  21.  NO_AA does not render hero slot
 *  22.  NO_SCORE renders "Please wait" / computing text
 *  23.  STALE renders banner with stale text
 *  24.  OFFLINE renders banner with offline text
 *  25.  OFFLINE renders banner in Hindi
 *  26.  READY renders subtitle + hero slot
 *  27.  NUMERIC_OFF renders hero slot
 *  28.  NO_AA renders state prompt with title (en)
 *  29.  NO_AA renders state prompt with title (hi)
 *  30.  Link bank CTA fires onLinkBank
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MyScoreScreen, type MyScoreScreenProps } from "../index";
import {
  resolveState,
  getStateCopy,
  isCtaEnabled,
  STALE_THRESHOLD_MS,
  type ScoreSignals,
} from "../state";

// ─── Mocks ─────────────────────────────────────────────────────

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: (props: any) => React.createElement(View, props),
    SafeAreaProvider: (props: any) => React.createElement(View, props),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// ─── Helpers ───────────────────────────────────────────────────

const NOW = Date.now();
const FRESH_SYNC = new Date(NOW - 1000).toISOString(); // 1 second ago
const STALE_SYNC = new Date(NOW - STALE_THRESHOLD_MS - 1000).toISOString(); // 30d+1s ago

const renderScreen = (overrides: Partial<MyScoreScreenProps> = {}) =>
  render(<MyScoreScreen {...overrides} />);

// ─── resolveState tests ────────────────────────────────────────

describe("resolveState", () => {
  it("online + AA not linked → NO_AA", () => {
    const signals: ScoreSignals = {
      aaLinked: false, score: null, lastSync: null, isOnline: true, numericOff: false,
    };
    expect(resolveState(signals, NOW)).toBe("NO_AA");
  });

  it("online + AA linked + no score → NO_SCORE", () => {
    const signals: ScoreSignals = {
      aaLinked: true, score: null, lastSync: null, isOnline: true, numericOff: false,
    };
    expect(resolveState(signals, NOW)).toBe("NO_SCORE");
  });

  it("online + AA linked + score + lastSync >30d → STALE", () => {
    const signals: ScoreSignals = {
      aaLinked: true, score: 650, lastSync: STALE_SYNC, isOnline: true, numericOff: false,
    };
    expect(resolveState(signals, NOW)).toBe("STALE");
  });

  it("online + AA linked + score + fresh sync + numericOff → NUMERIC_OFF", () => {
    const signals: ScoreSignals = {
      aaLinked: true, score: 650, lastSync: FRESH_SYNC, isOnline: true, numericOff: true,
    };
    expect(resolveState(signals, NOW)).toBe("NUMERIC_OFF");
  });

  it("online + AA linked + score + fresh sync → READY", () => {
    const signals: ScoreSignals = {
      aaLinked: true, score: 650, lastSync: FRESH_SYNC, isOnline: true, numericOff: false,
    };
    expect(resolveState(signals, NOW)).toBe("READY");
  });

  it("offline always → OFFLINE regardless of other signals", () => {
    const signals: ScoreSignals = {
      aaLinked: true, score: 650, lastSync: FRESH_SYNC, isOnline: false, numericOff: false,
    };
    expect(resolveState(signals, NOW)).toBe("OFFLINE");
  });

  it("offline overrides NO_AA", () => {
    const signals: ScoreSignals = {
      aaLinked: false, score: null, lastSync: null, isOnline: false, numericOff: false,
    };
    expect(resolveState(signals, NOW)).toBe("OFFLINE");
  });

  it("offline overrides STALE", () => {
    const signals: ScoreSignals = {
      aaLinked: true, score: 650, lastSync: STALE_SYNC, isOnline: false, numericOff: false,
    };
    expect(resolveState(signals, NOW)).toBe("OFFLINE");
  });
});

// ─── getStateCopy tests ────────────────────────────────────────

describe("getStateCopy", () => {
  it("NO_AA: showHero=false", () => {
    expect(getStateCopy("NO_AA").showHero).toBe(false);
  });

  it("NO_SCORE: ctaEnabled=false", () => {
    expect(getStateCopy("NO_SCORE").ctaEnabled).toBe(false);
  });

  it("STALE: showBanner=true", () => {
    expect(getStateCopy("STALE").showBanner).toBe(true);
  });

  it("OFFLINE: showBanner=true, ctaEnabled=false", () => {
    const copy = getStateCopy("OFFLINE");
    expect(copy.showBanner).toBe(true);
    expect(copy.ctaEnabled).toBe(false);
  });

  it('OFFLINE: "sathi" exempt from CTA disable', () => {
    expect(getStateCopy("OFFLINE").ctaExemptIds).toContain("sathi");
  });

  it("READY: showHero=true, ctaEnabled=true, showBanner=false", () => {
    const copy = getStateCopy("READY");
    expect(copy.showHero).toBe(true);
    expect(copy.ctaEnabled).toBe(true);
    expect(copy.showBanner).toBe(false);
  });

  it("NUMERIC_OFF: showHero=true", () => {
    expect(getStateCopy("NUMERIC_OFF").showHero).toBe(true);
  });
});

// ─── isCtaEnabled tests ────────────────────────────────────────

describe("isCtaEnabled", () => {
  it("READY: any gapId → true", () => {
    expect(isCtaEnabled("READY", "aa")).toBe(true);
    expect(isCtaEnabled("READY", "pmfby")).toBe(true);
  });

  it('OFFLINE: "sathi" → true (queued)', () => {
    expect(isCtaEnabled("OFFLINE", "sathi")).toBe(true);
  });

  it('OFFLINE: "aa" → false', () => {
    expect(isCtaEnabled("OFFLINE", "aa")).toBe(false);
  });

  it("NO_SCORE: any gapId → false", () => {
    expect(isCtaEnabled("NO_SCORE", "aa")).toBe(false);
    expect(isCtaEnabled("NO_SCORE", "sathi")).toBe(false);
  });
});

// ─── Screen rendering per state ────────────────────────────────

describe("MyScoreScreen states", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("en");
  });

  it("NO_AA renders link-bank CTA", async () => {
    renderScreen({ aaLinked: false, score: null, isOnline: true });

    await waitFor(() => {
      expect(screen.getByTestId("state-NO_AA")).toBeTruthy();
    });

    expect(screen.getByTestId("link-bank-cta")).toBeTruthy();
  });

  it("NO_AA does not render hero slot", async () => {
    renderScreen({ aaLinked: false, score: null, isOnline: true });

    await waitFor(() => {
      expect(screen.getByTestId("state-NO_AA")).toBeTruthy();
    });

    expect(screen.queryByTestId("my-score-hero-slot")).toBeNull();
  });

  it("NO_SCORE renders computing text", async () => {
    renderScreen({ aaLinked: true, score: null, isOnline: true });

    await waitFor(() => {
      expect(screen.getByTestId("state-NO_SCORE")).toBeTruthy();
    });

    expect(screen.getByTestId("score-computing")).toBeTruthy();
  });

  it("STALE renders banner with stale text", async () => {
    renderScreen({
      aaLinked: true,
      score: 650,
      lastSync: STALE_SYNC,
      isOnline: true,
    });

    await waitFor(() => {
      expect(screen.getByTestId("state-STALE")).toBeTruthy();
    });

    expect(screen.getByTestId("state-banner")).toBeTruthy();
    expect(screen.getByTestId("state-banner-text").props.children).toContain("30");
  });

  it("OFFLINE renders banner with offline text", async () => {
    renderScreen({
      aaLinked: true,
      score: 650,
      lastSync: FRESH_SYNC,
      isOnline: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId("state-OFFLINE")).toBeTruthy();
    });

    expect(screen.getByTestId("state-banner")).toBeTruthy();
    expect(screen.getByTestId("state-banner-text").props.children).toContain("Offline");
  });

  it("OFFLINE renders banner in Hindi", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("hi");

    renderScreen({
      aaLinked: true,
      score: 650,
      lastSync: FRESH_SYNC,
      isOnline: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId("state-OFFLINE")).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByTestId("state-banner-text").props.children).toContain("ऑफ़लाइन");
    });
  });

  it("READY renders subtitle + hero slot", async () => {
    renderScreen({
      aaLinked: true,
      score: 650,
      lastSync: FRESH_SYNC,
      isOnline: true,
    });

    await waitFor(() => {
      expect(screen.getByTestId("state-READY")).toBeTruthy();
    });

    expect(screen.getByTestId("my-score-subtitle")).toBeTruthy();
    expect(screen.getByTestId("my-score-hero-slot")).toBeTruthy();
  });

  it("NUMERIC_OFF renders hero slot", async () => {
    renderScreen({
      aaLinked: true,
      score: 650,
      lastSync: FRESH_SYNC,
      isOnline: true,
      numericOff: true,
    });

    await waitFor(() => {
      expect(screen.getByTestId("state-NUMERIC_OFF")).toBeTruthy();
    });

    expect(screen.getByTestId("my-score-hero-slot")).toBeTruthy();
  });

  it("NO_AA renders state prompt with title (en)", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("en");

    renderScreen({ aaLinked: false, score: null, isOnline: true });

    await waitFor(() => {
      expect(screen.getByTestId("state-title")).toBeTruthy();
    });

    expect(screen.getByTestId("state-title").props.children).toContain(
      "Link your bank to get started",
    );
  });

  it("NO_AA renders state prompt with title (hi)", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("hi");

    renderScreen({ aaLinked: false, score: null, isOnline: true });

    await waitFor(() => {
      expect(screen.getByTestId("state-title")).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByTestId("state-title").props.children).toContain(
        "शुरू करने के लिए बैंक जोड़ें",
      );
    });
  });

  it("link bank CTA fires onLinkBank", async () => {
    const onLinkBank = jest.fn();
    renderScreen({ aaLinked: false, score: null, isOnline: true, onLinkBank });

    await waitFor(() => {
      expect(screen.getByTestId("link-bank-cta")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("link-bank-cta"));
    expect(onLinkBank).toHaveBeenCalledTimes(1);
  });
});
