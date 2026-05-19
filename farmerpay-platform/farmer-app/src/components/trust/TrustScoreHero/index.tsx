/**
 * TrustScoreHero — Farmer persona (E2 — Spec §3.3 / §3.4 / §3.6 / §3.7).
 *
 * Displays the farmer's TRUST score with:
 * - Band-coloured hero fill (NEVER red for starting — neutral.200)
 * - Large numeric score (hidden when showNumeric=false → band chip only)
 * - Bilingual supporting lines (en/hi)
 * - "Updated {date} · Tap for help" footer
 * - Long-press gesture to toggle numeric on/off (§3.6)
 * - AAA contrast, VoiceOver/TalkBack, Devanagari lineHeight ≥ 1.55 (§3.7)
 *
 * NEVER shows rejection/negative language. Hides negative deltas (§8.3 shame avoidance).
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { neutral, brand } from "../../../theme";
import {
  getBandInfo,
  buildA11yLabel,
  formatAsOf,
  type LangCode,
} from "./bandLogic";

// ─── Re-exports ─────────────────────────────────────────────────

export { scoreToBand, getBandInfo, buildA11yLabel, formatAsOf } from "./bandLogic";
export type { Band, BandInfo, LangCode } from "./bandLogic";

// ─── Props ─────────────────────────────────────────────────────

export interface TrustScoreHeroProps {
  score: number;
  asOf: string;
  showNumeric: boolean;
  locale: LangCode;
  onTapHelp: () => void;
  onLongPressToggleNumeric: () => void;
}

// ─── Band chip colour for text ─────────────────────────────────

const BAND_TEXT_COLORS: Record<string, string> = {
  excellent: brand.primary[700],
  good: brand.primary[700],
  building: "#92400E", // amber-800 for AAA contrast on amber fill
  starting: neutral[800],
};

// ─── Component ──────────────────────────────────────────────────

export function TrustScoreHero({
  score,
  asOf,
  showNumeric,
  locale,
  onTapHelp,
  onLongPressToggleNumeric,
}: TrustScoreHeroProps) {
  const info = getBandInfo(score);
  const a11yLabel = buildA11yLabel(score, showNumeric, locale);
  const asOfText = formatAsOf(asOf, locale);
  const isHi = locale === "hi";

  const handleLongPress = useCallback(() => {
    onLongPressToggleNumeric();
  }, [onLongPressToggleNumeric]);

  return (
    <Pressable
      testID="trust-score-hero"
      onLongPress={handleLongPress}
      delayLongPress={500}
      role="summary"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: info.fill },
        pressed && styles.pressed,
      ]}
    >
      {/* ─── Score + band ─────────────────────────── */}
      <View testID="hero-score-section" style={styles.scoreSection}>
        {showNumeric && (
          <Text
            testID="hero-score-numeric"
            style={styles.scoreNumeric}
            accessibilityLabel={
              isHi ? `स्कोर ${score}` : `Score ${score}`
            }
          >
            {score}
          </Text>
        )}

        <View
          testID="hero-band-chip"
          style={[
            styles.bandChip,
            { backgroundColor: showNumeric ? "rgba(255,255,255,0.6)" : info.fill },
            !showNumeric && styles.bandChipStandalone,
          ]}
        >
          <Text
            testID="hero-band-label"
            style={[
              styles.bandText,
              { color: BAND_TEXT_COLORS[info.band] ?? neutral[800] },
              !showNumeric && styles.bandTextLarge,
            ]}
          >
            {isHi ? info.label.hi : info.label.en}
          </Text>
        </View>
      </View>

      {/* ─── Supporting lines ─────────────────────── */}
      <View testID="hero-supporting" style={styles.supporting}>
        <Text
          testID="hero-line1"
          style={[styles.line, isHi && styles.lineHi]}
        >
          {isHi ? info.line1.hi : info.line1.en}
        </Text>
        <Text
          testID="hero-line2"
          style={[styles.line, isHi && styles.lineHi]}
        >
          {isHi ? info.line2.hi : info.line2.en}
        </Text>
      </View>

      {/* ─── Footer: date + help ──────────────────── */}
      <Pressable
        testID="hero-help-tap"
        onPress={onTapHelp}
        accessibilityRole="button"
        accessibilityLabel={
          isHi ? "मदद के लिए टैप करें" : "Tap for help"
        }
        style={styles.footer}
      >
        <Text
          testID="hero-as-of"
          style={[styles.caption, isHi && styles.captionHi]}
        >
          {asOfText}
        </Text>
      </Pressable>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 24,
    gap: 16,
  },
  pressed: {
    opacity: 0.95,
  },
  scoreSection: {
    alignItems: "center",
    gap: 8,
  },
  scoreNumeric: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "700",
    color: neutral[900],
    textAlign: "center",
  },
  bandChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: "center",
  },
  bandChipStandalone: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  bandText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  bandTextLarge: {
    fontSize: 20,
    fontWeight: "700",
  },
  supporting: {
    gap: 4,
    alignItems: "center",
  },
  line: {
    fontSize: 14,
    lineHeight: 21, // 14 * 1.5
    color: neutral[800],
    textAlign: "center",
  },
  lineHi: {
    lineHeight: 22.4, // 14 * 1.6 — Devanagari ≥ 1.55
  },
  footer: {
    alignItems: "center",
    paddingTop: 4,
    minHeight: 48, // touch target
  },
  caption: {
    fontSize: 11,
    lineHeight: 16,
    color: neutral[500],
    textAlign: "center",
  },
  captionHi: {
    lineHeight: 17.6, // 11 * 1.6 — Devanagari ≥ 1.55
  },
});

export default TrustScoreHero;
