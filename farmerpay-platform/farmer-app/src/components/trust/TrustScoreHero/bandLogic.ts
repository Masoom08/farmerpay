/**
 * Band logic for TrustScoreHero (E2 — Spec §3.3).
 *
 * Maps 0..1000 TRUST v2 score → band + bilingual copy + fill colour.
 * NEVER shows rejection language or red. Starting band = neutral.200.
 *
 * The score prop is `trust_score_history.total_score_1000` (0..1000 scale).
 * Do NOT consume the legacy `score_band` ENUM (poor/fair/good/excellent).
 */

import { brand, neutral, bandColors } from "../../../theme";

// ─── Types ─────────────────────────────────────────────────────

export type Band = "excellent" | "good" | "building" | "starting";
export type LangCode = "en" | "hi";

export interface BandInfo {
  band: Band;
  fill: string;
  label: { en: string; hi: string };
  line1: { en: string; hi: string };
  line2: { en: string; hi: string };
  a11y: { en: string; hi: string };
}

// ─── Band definitions ──────────────────────────────────────────

const BAND_DEFS: Record<Band, Omit<BandInfo, "band">> = {
  excellent: {
    fill: bandColors.excellent,
    label: { en: "Excellent", hi: "उत्तम" },
    line1: {
      en: "Your TRUST score is outstanding.",
      hi: "आपका TRUST स्कोर उत्कृष्ट है।",
    },
    line2: {
      en: "You are well-positioned for loan approval.",
      hi: "आप ऋण स्वीकृति के लिए अच्छी स्थिति में हैं।",
    },
    a11y: {
      en: "Excellent band",
      hi: "उत्तम श्रेणी",
    },
  },
  good: {
    fill: bandColors.good,
    label: { en: "Good", hi: "अच्छा" },
    line1: {
      en: "Your TRUST score is strong.",
      hi: "आपका TRUST स्कोर मजबूत है।",
    },
    line2: {
      en: "Keep up the good work to maintain eligibility.",
      hi: "पात्रता बनाए रखने के लिए अच्छा काम जारी रखें।",
    },
    a11y: {
      en: "Good band",
      hi: "अच्छा श्रेणी",
    },
  },
  building: {
    fill: bandColors.building,
    label: { en: "Building", hi: "निर्माणाधीन" },
    line1: {
      en: "Your TRUST score is growing.",
      hi: "आपका TRUST स्कोर बढ़ रहा है।",
    },
    line2: {
      en: "Complete your profile and link your bank to improve.",
      hi: "सुधार के लिए प्रोफ़ाइल पूरी करें और बैंक जोड़ें।",
    },
    a11y: {
      en: "Building band",
      hi: "निर्माणाधीन श्रेणी",
    },
  },
  starting: {
    fill: bandColors.starting,
    label: { en: "Starting", hi: "शुरुआत" },
    line1: {
      en: "Your TRUST journey has begun.",
      hi: "आपकी TRUST यात्रा शुरू हो गई है।",
    },
    line2: {
      en: "Add your farm details and link your bank to build trust.",
      hi: "विश्वास बनाने के लिए खेत विवरण जोड़ें और बैंक जोड़ें।",
    },
    a11y: {
      en: "Starting band",
      hi: "शुरुआत श्रेणी",
    },
  },
};

// ─── Score → Band mapping ──────────────────────────────────────

/**
 * Map a 0..1000 TRUST v2 score to its band.
 *
 * - >= 800 → excellent
 * - 600..799 → good
 * - 500..599 → building
 * - < 500 → starting
 */
export function scoreToBand(score: number): Band {
  if (score >= 800) return "excellent";
  if (score >= 600) return "good";
  if (score >= 500) return "building";
  return "starting";
}

/**
 * Full band info for a given score.
 */
export function getBandInfo(score: number): BandInfo {
  const band = scoreToBand(score);
  return { band, ...BAND_DEFS[band] };
}

/**
 * Build the full accessibility label for VoiceOver/TalkBack.
 */
export function buildA11yLabel(
  score: number,
  showNumeric: boolean,
  locale: LangCode,
): string {
  const info = getBandInfo(score);
  if (showNumeric) {
    return locale === "hi"
      ? `TRUST स्कोर ${score}, ${info.a11y.hi}`
      : `TRUST score ${score}, ${info.a11y.en}`;
  }
  return locale === "hi" ? info.a11y.hi : info.a11y.en;
}

/**
 * Format the "Updated {date}" line for spec §3.4.
 */
export function formatAsOf(asOf: string, locale: LangCode): string {
  try {
    const d = new Date(asOf);
    const formatted = d.toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return locale === "hi"
      ? `अपडेट: ${formatted} · मदद के लिए टैप करें`
      : `Updated ${formatted} · Tap for help`;
  } catch {
    return locale === "hi"
      ? "मदद के लिए टैप करें"
      : "Tap for help";
  }
}
