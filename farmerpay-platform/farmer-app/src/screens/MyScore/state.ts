/**
 * MyScore state machine — resolves screen state from data signals (E7 — Spec §3.5).
 *
 * States:
 *   NO_AA      — AA not linked; hero hidden, prompt to link bank
 *   NO_SCORE   — AA linked but score not computed yet
 *   STALE      — Score exists but lastSync > 30 days ago
 *   OFFLINE    — Device is offline; show cached score + disable CTAs (except "Book Sathi visit")
 *   NUMERIC_OFF — Score exists, numeric display toggled off by user
 *   READY      — Normal display with score
 *
 * The state selector is pure: takes data signals, returns the resolved state.
 * No rejection/shame language in any state copy (§8.3).
 */

import type { LangCode } from "../../../lib/myScoreStrings";

// ─── State enum ──────────────────────────────────────────────────

export type MyScoreState =
  | "NO_AA"
  | "NO_SCORE"
  | "STALE"
  | "OFFLINE"
  | "NUMERIC_OFF"
  | "READY";

// ─── Input signals ───────────────────────────────────────────────

export interface ScoreSignals {
  /** Whether AA (Account Aggregator / bank) is linked */
  aaLinked: boolean;
  /** The TRUST score, or null if not yet computed */
  score: number | null;
  /** ISO date of last data sync, or null */
  lastSync: string | null;
  /** Whether the device is online */
  isOnline: boolean;
  /** Whether the user has toggled numeric display off */
  numericOff: boolean;
}

// ─── Stale threshold: 30 days ────────────────────────────────────

export const STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

// ─── State resolver ──────────────────────────────────────────────

/**
 * Resolve the MyScore screen state from data signals.
 * Priority order: OFFLINE > NO_AA > NO_SCORE > STALE > NUMERIC_OFF > READY.
 */
export function resolveState(signals: ScoreSignals, now: number = Date.now()): MyScoreState {
  // Offline takes highest priority — we show cached data in a degraded mode
  if (!signals.isOnline) return "OFFLINE";

  // AA not linked — can't compute a score
  if (!signals.aaLinked) return "NO_AA";

  // AA linked but no score computed yet
  if (signals.score == null) return "NO_SCORE";

  // Score exists — check staleness
  if (signals.lastSync) {
    const syncAge = now - new Date(signals.lastSync).getTime();
    if (syncAge > STALE_THRESHOLD_MS) return "STALE";
  }

  // Numeric display toggled off
  if (signals.numericOff) return "NUMERIC_OFF";

  return "READY";
}

// ─── State display copy ──────────────────────────────────────────

export interface StateCopy {
  title: { en: string; hi: string };
  body: { en: string; hi: string };
  /** Whether the hero score section should be visible */
  showHero: boolean;
  /** Whether gap card CTAs should be enabled */
  ctaEnabled: boolean;
  /** IDs of gap cards exempt from the CTA disable (offline "Book Sathi visit") */
  ctaExemptIds: string[];
  /** Whether a banner/warning should show */
  showBanner: boolean;
  bannerText: { en: string; hi: string };
}

const STATE_COPY: Record<MyScoreState, StateCopy> = {
  NO_AA: {
    title: {
      en: "Link your bank to get started",
      hi: "शुरू करने के लिए बैंक जोड़ें",
    },
    body: {
      en: "Connect your bank account via Account Aggregator to see your TRUST score.",
      hi: "अपना TRUST स्कोर देखने के लिए अकाउंट एग्रीगेटर से बैंक खाता जोड़ें।",
    },
    showHero: false,
    ctaEnabled: true,
    ctaExemptIds: [],
    showBanner: false,
    bannerText: { en: "", hi: "" },
  },
  NO_SCORE: {
    title: {
      en: "Score is being prepared",
      hi: "स्कोर तैयार हो रहा है",
    },
    body: {
      en: "Your bank data is linked. We are computing your TRUST score — this may take a few minutes.",
      hi: "आपका बैंक डेटा जुड़ा है। हम आपका TRUST स्कोर तैयार कर रहे हैं — इसमें कुछ मिनट लग सकते हैं।",
    },
    showHero: false,
    ctaEnabled: false,
    ctaExemptIds: [],
    showBanner: false,
    bannerText: { en: "", hi: "" },
  },
  STALE: {
    title: {
      en: "Your score may be outdated",
      hi: "आपका स्कोर पुराना हो सकता है",
    },
    body: {
      en: "Your data has not been refreshed in over 30 days. Tap refresh to update.",
      hi: "आपका डेटा 30 दिनों से अधिक समय से अपडेट नहीं हुआ है। अपडेट करने के लिए रिफ्रेश करें।",
    },
    showHero: true,
    ctaEnabled: true,
    ctaExemptIds: [],
    showBanner: true,
    bannerText: {
      en: "Data not refreshed in 30+ days",
      hi: "डेटा 30+ दिनों से रिफ्रेश नहीं हुआ",
    },
  },
  OFFLINE: {
    title: {
      en: "You are offline",
      hi: "आप ऑफ़लाइन हैं",
    },
    body: {
      en: "Showing your last known score. Some actions are unavailable until you reconnect.",
      hi: "आपका अंतिम ज्ञात स्कोर दिखा रहे हैं। कुछ कार्य तब तक उपलब्ध नहीं हैं जब तक आप फिर से कनेक्ट नहीं होते।",
    },
    showHero: true,
    ctaEnabled: false,
    ctaExemptIds: ["sathi"], // "Book Sathi visit" can be queued offline
    showBanner: true,
    bannerText: {
      en: "Offline — limited actions available",
      hi: "ऑफ़लाइन — सीमित कार्य उपलब्ध",
    },
  },
  NUMERIC_OFF: {
    title: {
      en: "My Score",
      hi: "मेरा स्कोर",
    },
    body: {
      en: "Your TRUST score overview",
      hi: "आपका TRUST स्कोर अवलोकन",
    },
    showHero: true,
    ctaEnabled: true,
    ctaExemptIds: [],
    showBanner: false,
    bannerText: { en: "", hi: "" },
  },
  READY: {
    title: {
      en: "My Score",
      hi: "मेरा स्कोर",
    },
    body: {
      en: "Your TRUST score overview",
      hi: "आपका TRUST स्कोर अवलोकन",
    },
    showHero: true,
    ctaEnabled: true,
    ctaExemptIds: [],
    showBanner: false,
    bannerText: { en: "", hi: "" },
  },
};

/**
 * Get display copy for a given state.
 */
export function getStateCopy(state: MyScoreState): StateCopy {
  return STATE_COPY[state];
}

/**
 * Check if a specific gap CTA is enabled for the current state.
 */
export function isCtaEnabled(
  state: MyScoreState,
  gapId: string,
): boolean {
  const copy = STATE_COPY[state];
  if (copy.ctaEnabled) return true;
  // Even when CTAs are globally disabled, some are exempt (e.g. sathi offline)
  return copy.ctaExemptIds.includes(gapId);
}
