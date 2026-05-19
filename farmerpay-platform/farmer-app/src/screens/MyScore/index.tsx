/**
 * MyScore Screen (E1 + E7) — Route + TopBar + locale switcher + state matrix.
 *
 * Spec: Part E — Farmer: My Score.
 * SafeAreaView + ScrollView with TopBar (48dp), locale switcher on right.
 * Default locale = device locale; falls back to 'hi' for IN region.
 *
 * E7 — State matrix (Spec §3.5):
 *   NO_AA, NO_SCORE, STALE, OFFLINE, NUMERIC_OFF, READY
 *   Each state renders specific copy + hero visibility + CTA enablement.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  NativeModules,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MyScoreTopBar, LOCALE_STORAGE_KEY } from "../../components/TopBar";
import { ts, resolveDefaultLocale, type LangCode } from "../../../lib/myScoreStrings";
import { neutral, brand } from "../../theme";
import {
  resolveState,
  getStateCopy,
  isCtaEnabled,
  type ScoreSignals,
  type MyScoreState,
} from "./state";

// ─── Props ─────────────────────────────────────────────────────

export interface MyScoreScreenProps {
  /** Show back button (true when deeplinked) */
  showBack?: boolean;
  onBack?: () => void;
  /** Data signals for state resolution (E7) */
  aaLinked?: boolean;
  score?: number | null;
  lastSync?: string | null;
  isOnline?: boolean;
  numericOff?: boolean;
  /** Callback when user taps a gap CTA */
  onGapCta?: (gapId: string) => void;
  /** Callback when user taps "Link bank" in NO_AA state */
  onLinkBank?: () => void;
}

// ─── Device locale helper ──────────────────────────────────────

function getDeviceLocale(): string | null {
  try {
    if (Platform.OS === "ios") {
      return (
        NativeModules.SettingsManager?.settings?.AppleLocale ??
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ??
        null
      );
    }
    // Android
    return NativeModules.I18nManager?.localeIdentifier ?? null;
  } catch {
    return null;
  }
}

// ─── Component ──────────────────────────────────────────────────

export function MyScoreScreen({
  showBack = false,
  onBack,
  aaLinked = true,
  score = null,
  lastSync = null,
  isOnline = true,
  numericOff = false,
  onGapCta,
  onLinkBank,
}: MyScoreScreenProps) {
  const [locale, setLocale] = useState<LangCode>("hi"); // safe default
  const [localeReady, setLocaleReady] = useState(false);

  // ─── Resolve state (E7) ───────────────────────────────────
  const signals: ScoreSignals = useMemo(
    () => ({ aaLinked, score, lastSync, isOnline, numericOff }),
    [aaLinked, score, lastSync, isOnline, numericOff],
  );
  const screenState = resolveState(signals);
  const stateCopy = getStateCopy(screenState);
  const isHi = locale === "hi";

  // ─── Resolve initial locale ────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadLocale() {
      try {
        // 1. Check persisted preference
        const saved = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
        if (!cancelled && saved && (saved === "en" || saved === "hi")) {
          setLocale(saved as LangCode);
          setLocaleReady(true);
          return;
        }
      } catch {
        // Fallthrough to device locale
      }

      // 2. Detect device locale
      if (!cancelled) {
        const deviceLocale = getDeviceLocale();
        const resolved = resolveDefaultLocale(deviceLocale);
        setLocale(resolved);
        setLocaleReady(true);
      }
    }

    loadLocale();
    return () => { cancelled = true; };
  }, []);

  // ─── Locale change handler ─────────────────────────────────
  const handleLocaleChange = useCallback((newLocale: LangCode) => {
    setLocale(newLocale);
    // AsyncStorage write is handled by LocaleSwitcher
  }, []);

  return (
    <SafeAreaView testID="my-score-screen" style={styles.safe} edges={["top"]}>
      {/* ─── TopBar 48dp ─────────────────────────── */}
      <MyScoreTopBar
        title={ts("title", locale)}
        showBack={showBack}
        onBack={onBack}
        currentLocale={locale}
        onLocaleChange={handleLocaleChange}
      />

      {/* ─── ScrollView content ──────────────────── */}
      <ScrollView
        testID="my-score-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* State indicator (hidden, for test targeting) */}
        <View testID={`state-${screenState}`} />

        {/* Banner (STALE / OFFLINE) */}
        {stateCopy.showBanner && (
          <View
            testID="state-banner"
            accessibilityRole="alert"
            style={[
              styles.banner,
              screenState === "OFFLINE" && styles.bannerOffline,
              screenState === "STALE" && styles.bannerStale,
            ]}
          >
            <Text testID="state-banner-text" style={styles.bannerText}>
              {isHi ? stateCopy.bannerText.hi : stateCopy.bannerText.en}
            </Text>
          </View>
        )}

        {/* State title + body (NO_AA, NO_SCORE override subtitle) */}
        {(screenState === "NO_AA" || screenState === "NO_SCORE") ? (
          <View testID="state-prompt" style={styles.statePrompt}>
            <Text testID="state-title" style={[styles.stateTitle, isHi && styles.stateTitleHi]}>
              {isHi ? stateCopy.title.hi : stateCopy.title.en}
            </Text>
            <Text testID="state-body" style={[styles.stateBody, isHi && styles.stateBodyHi]}>
              {isHi ? stateCopy.body.hi : stateCopy.body.en}
            </Text>

            {/* Link bank CTA for NO_AA */}
            {screenState === "NO_AA" && (
              <Pressable
                testID="link-bank-cta"
                onPress={onLinkBank}
                accessibilityRole="button"
                accessibilityLabel={isHi ? "बैंक जोड़ें" : "Link bank"}
                style={({ pressed }) => [
                  styles.linkBankBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.linkBankText}>
                  {isHi ? "बैंक जोड़ें" : "Link bank"}
                </Text>
              </Pressable>
            )}

            {/* Loading indicator for NO_SCORE */}
            {screenState === "NO_SCORE" && (
              <Text testID="score-computing" style={styles.computing}>
                {isHi ? "कृपया प्रतीक्षा करें…" : "Please wait…"}
              </Text>
            )}
          </View>
        ) : (
          <>
            {/* Subtitle for READY / STALE / OFFLINE / NUMERIC_OFF */}
            <Text testID="my-score-subtitle" style={styles.subtitle}>
              {ts("subtitle", locale)}
            </Text>

            {/* Hero placeholder (shown when state.showHero=true) */}
            {stateCopy.showHero && (
              <View testID="my-score-hero-slot" style={styles.heroSlot}>
                {/* Score display — numeric hidden in NUMERIC_OFF state */}
                <Text testID="my-score-locale-display" style={styles.bodyText}>
                  {locale === "hi" ? "भाषा: हिंदी" : "Language: English"}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Gap CTA area — with state-aware enablement */}
        <View testID="my-score-body" style={styles.body}>
          {/* Gap cards rendered by parent — this is the integration slot.
              CTA enablement is checked via isCtaEnabled(screenState, gapId). */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Re-exports for test access ─────────────────────────────────

export { resolveState, getStateCopy, isCtaEnabled } from "./state";
export type { ScoreSignals, MyScoreState } from "./state";

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  subtitle: {
    fontSize: 14,
    color: neutral[500],
  },
  body: {
    flex: 1,
  },
  bodyText: {
    fontSize: 14,
    color: neutral[800],
  },
  // ─── Banner ─────────────────────────────────────────────
  banner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: neutral[100],
  },
  bannerOffline: {
    backgroundColor: neutral[200],
  },
  bannerStale: {
    backgroundColor: "#FFFBEB", // amber-50
  },
  bannerText: {
    fontSize: 13,
    fontWeight: "500",
    color: neutral[800],
  },
  // ─── State prompt (NO_AA / NO_SCORE) ────────────────────
  statePrompt: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: neutral[900],
    textAlign: "center",
  },
  stateTitleHi: {
    lineHeight: 28.8, // 18 * 1.6
  },
  stateBody: {
    fontSize: 14,
    lineHeight: 21,
    color: neutral[500],
    textAlign: "center",
    paddingHorizontal: 16,
  },
  stateBodyHi: {
    lineHeight: 22.4, // 14 * 1.6
  },
  linkBankBtn: {
    backgroundColor: brand.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.85,
  },
  linkBankText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  computing: {
    fontSize: 13,
    color: neutral[500],
    fontStyle: "italic",
  },
  // ─── Hero slot ──────────────────────────────────────────
  heroSlot: {
    minHeight: 100,
  },
});

export default MyScoreScreen;
