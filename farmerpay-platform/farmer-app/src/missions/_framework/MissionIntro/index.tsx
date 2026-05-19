/**
 * MissionIntro — Step 1 of mission flow (F1 — Spec §4).
 *
 * Shows: illustration, title, body, point-lift badge, estimated time, primary CTA, "Later" link.
 * Point-lift IS shown here (and on Result). NOT shown on Action/Confirm.
 * No rejection/shame language (§8.3).
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { brand, neutral } from "../../../theme";

// ─── Types ──────────────────────────────────────────────────────

export interface MissionIntroProps {
  title: { en: string; hi: string };
  body: { en: string; hi: string };
  illustration: React.ComponentType;
  pointLift: number;
  estimatedMinutes: number;
  primaryCta: { en: string; hi: string };
  onPrimary: () => void;
  onLater: () => void;
  locale?: "en" | "hi";
  /** Whether there's resumable progress — shows resume prompt */
  hasResumableProgress?: boolean;
  onResume?: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export function MissionIntro({
  title,
  body,
  illustration: Illustration,
  pointLift,
  estimatedMinutes,
  primaryCta,
  onPrimary,
  onLater,
  locale = "en",
  hasResumableProgress = false,
  onResume,
}: MissionIntroProps) {
  const isHi = locale === "hi";

  return (
    <View testID="mission-intro" style={styles.container}>
      {/* ─── Illustration ───────────────────────────── */}
      <View testID="mission-intro-illustration" style={styles.illustrationWrap}>
        <Illustration />
      </View>

      {/* ─── Title ──────────────────────────────────── */}
      <Text
        testID="mission-intro-title"
        style={[styles.title, isHi && styles.titleHi]}
        accessibilityRole="header"
      >
        {isHi ? title.hi : title.en}
      </Text>

      {/* ─── Body ───────────────────────────────────── */}
      <Text
        testID="mission-intro-body"
        style={[styles.body, isHi && styles.bodyHi]}
      >
        {isHi ? body.hi : body.en}
      </Text>

      {/* ─── Point-lift + time badge ────────────────── */}
      <View testID="mission-intro-meta" style={styles.metaRow}>
        <View testID="mission-intro-points" style={styles.badge}>
          <Text style={styles.badgeText}>
            {isHi ? `+${pointLift} अंक` : `+${pointLift} points`}
          </Text>
        </View>
        <Text testID="mission-intro-time" style={styles.timeText}>
          {isHi
            ? `लगभग ${estimatedMinutes} मिनट`
            : `~${estimatedMinutes} min`}
        </Text>
      </View>

      {/* ─── Resume prompt ──────────────────────────── */}
      {hasResumableProgress && (
        <Pressable
          testID="mission-resume-prompt"
          onPress={onResume}
          accessibilityRole="button"
          accessibilityLabel={
            isHi ? "जहाँ छोड़ा था वहाँ से जारी रखें" : "Continue where you left off"
          }
          style={({ pressed }) => [
            styles.resumeBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.resumeText}>
            {isHi ? "जहाँ छोड़ा था वहाँ से जारी रखें" : "Continue where you left off"}
          </Text>
        </Pressable>
      )}

      {/* ─── Primary CTA ───────────────────────────── */}
      <Pressable
        testID="mission-intro-primary"
        onPress={onPrimary}
        accessibilityRole="button"
        accessibilityLabel={isHi ? primaryCta.hi : primaryCta.en}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={styles.primaryText}>
          {isHi ? primaryCta.hi : primaryCta.en}
        </Text>
      </Pressable>

      {/* ─── Later link ─────────────────────────────── */}
      <Pressable
        testID="mission-intro-later"
        onPress={onLater}
        accessibilityRole="button"
        accessibilityLabel={isHi ? "बाद में" : "Later"}
        style={styles.laterBtn}
      >
        <Text style={styles.laterText}>
          {isHi ? "बाद में" : "Later"}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  illustrationWrap: {
    width: 200,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: neutral[900],
    textAlign: "center",
    lineHeight: 30,
  },
  titleHi: {
    lineHeight: 35.2, // 22 * 1.6
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: neutral[500],
    textAlign: "center",
  },
  bodyHi: {
    lineHeight: 22.4, // 14 * 1.6
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badge: {
    backgroundColor: brand.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: brand.primary[500],
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: brand.primary[700],
  },
  timeText: {
    fontSize: 13,
    color: neutral[500],
  },
  resumeBtn: {
    backgroundColor: "#FFFBEB", // amber-50
    borderWidth: 1,
    borderColor: "#F59E0B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  resumeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E", // amber-800
  },
  primaryBtn: {
    backgroundColor: brand.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  btnPressed: {
    opacity: 0.85,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  laterBtn: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  laterText: {
    fontSize: 14,
    color: neutral[500],
  },
});

export default MissionIntro;
