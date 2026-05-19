/**
 * HelpSheet — Plain-language TRUST score explainer with voice option (E6).
 *
 * Spec §3.6: Tapping hero opens this sheet with a clear explanation of what
 *            the score means and how to improve it.
 * Spec §3.7: 🔊 speak button via expo-speech; toggles play/stop.
 *            Button ≥ 48dp. User must tap — NEVER auto-play.
 *
 * Bilingual: en / hi. Devanagari lineHeight ≥ 1.55× fontSize.
 */

import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { neutral, brand } from "../../../theme";
import { useTts, type TtsLocale } from "../../../hooks/useTts";

// ─── Types ──────────────────────────────────────────────────────

export type { TtsLocale } from "../../../hooks/useTts";

export interface HelpSheetProps {
  /** Current score to contextualise the explanation */
  score: number;
  locale?: TtsLocale;
  /** Called when user taps the close button */
  onClose: () => void;
}

// ─── Strings ────────────────────────────────────────────────────

interface HelpStrings {
  title: string;
  body: string;
  howToImprove: string;
  tips: string[];
  speakLabel: string;
  stopLabel: string;
  closeLabel: string;
}

function getStrings(locale: TtsLocale, score: number): HelpStrings {
  if (locale === "hi") {
    return {
      title: "TRUST स्कोर क्या है?",
      body:
        `आपका TRUST स्कोर ${score} है। यह 0 से 1000 के बीच का एक नंबर है जो दिखाता है कि आपकी वित्तीय प्रोफ़ाइल कितनी मज़बूत है। ` +
        "यह स्कोर आपके बैंक डेटा, क्रेडिट इतिहास, भूमि रिकॉर्ड, फसल बीमा और कृषि अभ्यास से बनता है।",
      howToImprove: "स्कोर कैसे बढ़ाएं",
      tips: [
        "अपना बैंक अकाउंट जोड़ें",
        "फसल बीमा लिंक करें",
        "भूमि रिकॉर्ड अपडेट करें",
        "नियमित लेनदेन करें",
      ],
      speakLabel: "सुनें",
      stopLabel: "रुकें",
      closeLabel: "बंद करें",
    };
  }

  return {
    title: "What is a TRUST score?",
    body:
      `Your TRUST score is ${score}. It is a number between 0 and 1000 that shows how strong your financial profile is. ` +
      "This score is built from your bank data, credit history, land records, crop insurance, and farming practices.",
    howToImprove: "How to improve your score",
    tips: [
      "Link your bank account",
      "Connect crop insurance",
      "Update land records",
      "Make regular transactions",
    ],
    speakLabel: "Listen",
    stopLabel: "Stop",
    closeLabel: "Close",
  };
}

// ─── Component ──────────────────────────────────────────────────

export function HelpSheet({ score, locale = "en", onClose }: HelpSheetProps) {
  const isHi = locale === "hi";
  const strings = useMemo(() => getStrings(locale, score), [locale, score]);
  const { isSpeaking, toggle } = useTts({ locale });

  /** Full speech text: title + body + tips */
  const speechText = useMemo(() => {
    const tipsJoined = strings.tips.join(". ");
    return `${strings.title}. ${strings.body} ${strings.howToImprove}: ${tipsJoined}`;
  }, [strings]);

  const handleSpeak = () => {
    toggle(speechText);
  };

  return (
    <View testID="help-sheet" style={styles.sheet}>
      {/* ─── Header ───────────────────────────────── */}
      <View style={styles.header}>
        <Text
          testID="help-sheet-title"
          style={[styles.title, isHi && styles.titleHi]}
        >
          {strings.title}
        </Text>

        <View style={styles.headerActions}>
          {/* Speak/Stop toggle */}
          <Pressable
            testID="help-speak-btn"
            onPress={handleSpeak}
            accessibilityRole="button"
            accessibilityLabel={isSpeaking ? strings.stopLabel : strings.speakLabel}
            accessibilityState={{ busy: isSpeaking }}
            style={({ pressed }) => [
              styles.speakBtn,
              isSpeaking && styles.speakBtnActive,
              pressed && styles.btnPressed,
            ]}
          >
            <Text
              testID="help-speak-icon"
              style={[styles.speakIcon, isSpeaking && styles.speakIconActive]}
            >
              {isSpeaking ? "⏹" : "🔊"}
            </Text>
            <Text
              testID="help-speak-label"
              style={[
                styles.speakText,
                isSpeaking && styles.speakTextActive,
                isHi && styles.speakTextHi,
              ]}
            >
              {isSpeaking ? strings.stopLabel : strings.speakLabel}
            </Text>
          </Pressable>

          {/* Close button */}
          <Pressable
            testID="help-close-btn"
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={strings.closeLabel}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </View>
      </View>

      {/* ─── Body ─────────────────────────────────── */}
      <ScrollView
        testID="help-sheet-scroll"
        style={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        <Text
          testID="help-body"
          style={[styles.body, isHi && styles.bodyHi]}
        >
          {strings.body}
        </Text>

        <Text
          testID="help-improve-heading"
          style={[styles.subheading, isHi && styles.subheadingHi]}
        >
          {strings.howToImprove}
        </Text>

        <View testID="help-tips" style={styles.tipsList}>
          {strings.tips.map((tip, idx) => (
            <View key={idx} testID={`help-tip-${idx}`} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={[styles.tipText, isHi && styles.tipTextHi]}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[200],
    padding: 16,
    gap: 12,
    maxHeight: 400,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: neutral[900],
    flex: 1,
  },
  titleHi: {
    lineHeight: 28.8, // 18 * 1.6 — Devanagari ≥ 1.55
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: brand.primary[50],
    borderWidth: 1,
    borderColor: brand.primary[500],
    minHeight: 48,
    minWidth: 48,
  },
  speakBtnActive: {
    backgroundColor: brand.primary[500],
  },
  speakIcon: {
    fontSize: 16,
  },
  speakIconActive: {
    color: "#FFFFFF",
  },
  speakText: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.primary[700],
  },
  speakTextActive: {
    color: "#FFFFFF",
  },
  speakTextHi: {
    lineHeight: 20.8, // 13 * 1.6
  },
  btnPressed: {
    opacity: 0.8,
  },
  closeBtn: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: 18,
    color: neutral[500],
  },
  scrollBody: {
    flex: 1,
  },
  body: {
    fontSize: 14,
    lineHeight: 21, // 14 * 1.5
    color: neutral[800],
  },
  bodyHi: {
    lineHeight: 22.4, // 14 * 1.6 — Devanagari ≥ 1.55
  },
  subheading: {
    fontSize: 15,
    fontWeight: "600",
    color: neutral[900],
    marginTop: 16,
    marginBottom: 8,
  },
  subheadingHi: {
    lineHeight: 24, // 15 * 1.6
  },
  tipsList: {
    gap: 6,
  },
  tipRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  tipBullet: {
    fontSize: 14,
    color: brand.primary[500],
    lineHeight: 21,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 21,
    color: neutral[800],
    flex: 1,
  },
  tipTextHi: {
    lineHeight: 22.4,
  },
});

export default HelpSheet;
