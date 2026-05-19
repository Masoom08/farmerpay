/**
 * MyScore i18n strings — keyed by language code.
 *
 * Usage:
 *   import { ts } from "../lib/myScoreStrings";
 *   const title = ts("title", "hi"); // "मेरा स्कोर"
 */

export type LangCode = "en" | "hi";

type StringKey =
  | "title"
  | "subtitle"
  | "loading"
  | "error"
  | "retry"
  | "noData"
  | "noDataDesc"
  | "score"
  | "decision"
  | "pillars"
  | "lastUpdated"
  | "langSwitch";

const strings: Record<LangCode, Record<StringKey, string>> = {
  en: {
    title: "My Score",
    subtitle: "Your TRUST score overview",
    loading: "Loading score…",
    error: "Something went wrong",
    retry: "Try Again",
    noData: "No Score Yet",
    noDataDesc: "Complete your profile to see your TRUST score.",
    score: "Score",
    decision: "Decision",
    pillars: "Pillar Scores",
    lastUpdated: "Last updated",
    langSwitch: "हिंदी",
  },
  hi: {
    title: "मेरा स्कोर",
    subtitle: "आपका TRUST स्कोर अवलोकन",
    loading: "स्कोर लोड हो रहा है…",
    error: "कुछ गलत हो गया",
    retry: "पुनः प्रयास करें",
    noData: "अभी कोई स्कोर नहीं",
    noDataDesc: "अपना TRUST स्कोर देखने के लिए प्रोफ़ाइल पूरी करें।",
    score: "स्कोर",
    decision: "निर्णय",
    pillars: "स्तंभ स्कोर",
    lastUpdated: "अंतिम अपडेट",
    langSwitch: "English",
  },
};

const DEFAULT_LANG: LangCode = "en";

/**
 * Translate a MyScore screen string key.
 */
export function ts(key: StringKey, lang: LangCode = DEFAULT_LANG): string {
  return strings[lang]?.[key] ?? strings[DEFAULT_LANG][key] ?? key;
}

/**
 * Determine default locale from device locale string.
 * Falls back to 'hi' for IN region or unrecognised locales.
 */
export function resolveDefaultLocale(deviceLocale: string | null): LangCode {
  if (!deviceLocale) return "hi";

  const lower = deviceLocale.toLowerCase();

  // Exact match or prefix match for English
  if (lower === "en" || lower.startsWith("en-")) {
    // But if region is IN, prefer Hindi
    if (lower.includes("-in") || lower.includes("_in")) {
      return "hi";
    }
    return "en";
  }

  // Hindi match
  if (lower === "hi" || lower.startsWith("hi-")) return "hi";

  // Indian region with any language → default Hindi
  if (lower.includes("-in") || lower.includes("_in")) return "hi";

  // Fallback to Hindi for unrecognised
  return "hi";
}
