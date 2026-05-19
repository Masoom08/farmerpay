/**
 * MissionResult — Step 4 of mission flow (F1 — Spec §4 / §4.5).
 *
 * Shows: before/after score, estimated vs actual lift, done CTA.
 * Point-lift IS shown here (and on Intro).
 *
 * Honesty rule (§4.5): if actualLift differs from estimatedLift,
 * show both values + explanation line.
 * No rejection/shame language (§8.3).
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { brand, neutral } from "../../../theme";

// ─── Types ──────────────────────────────────────────────────────

export interface MissionResultProps {
  beforeScore?: number;
  afterScore?: number;
  estimatedLift?: number;
  actualLift?: number;
  onDone: () => void;
  locale: "en" | "hi";
}

// ─── Component ──────────────────────────────────────────────────

export function MissionResult({
  beforeScore,
  afterScore,
  estimatedLift,
  actualLift,
  onDone,
  locale,
}: MissionResultProps) {
  const isHi = locale === "hi";
  const liftDiffers =
    estimatedLift != null &&
    actualLift != null &&
    estimatedLift !== actualLift;

  const displayLift = actualLift ?? estimatedLift ?? 0;

  return (
    <View testID="mission-result" style={styles.container}>
      {/* ─── Success icon ───────────────────────────── */}
      <Text testID="mission-result-icon" style={styles.icon}>
        ✓
      </Text>

      {/* ─── Title ──────────────────────────────────── */}
      <Text
        testID="mission-result-title"
        style={[styles.title, isHi && styles.titleHi]}
        accessibilityRole="header"
      >
        {isHi ? "मिशन पूरा हुआ!" : "Mission complete!"}
      </Text>

      {/* ─── Score before/after ─────────────────────── */}
      {beforeScore != null && afterScore != null && (
        <View testID="mission-result-scores" style={styles.scoresRow}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>
              {isHi ? "पहले" : "Before"}
            </Text>
            <Text testID="mission-result-before" style={styles.scoreValue}>
              {beforeScore}
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>
              {isHi ? "अब" : "After"}
            </Text>
            <Text testID="mission-result-after" style={styles.scoreValue}>
              {afterScore}
            </Text>
          </View>
        </View>
      )}

      {/* ─── Point lift badge ───────────────────────── */}
      <View testID="mission-result-lift" style={styles.liftBadge}>
        <Text style={styles.liftText}>
          {isHi ? `+${displayLift} अंक` : `+${displayLift} points`}
        </Text>
      </View>

      {/* ─── Honesty rule: estimated vs actual ──────── */}
      {liftDiffers && (
        <View testID="mission-result-honesty" style={styles.honestyBox}>
          <Text testID="mission-result-estimated" style={styles.honestyLine}>
            {isHi
              ? `अनुमानित: +${estimatedLift} अंक`
              : `Estimated: +${estimatedLift} points`}
          </Text>
          <Text testID="mission-result-actual" style={styles.honestyLine}>
            {isHi
              ? `वास्तविक: +${actualLift} अंक`
              : `Actual: +${actualLift} points`}
          </Text>
          <Text
            testID="mission-result-explanation"
            style={[styles.honestyExplanation, isHi && styles.honestyExplanationHi]}
          >
            {isHi
              ? "वास्तविक अंक अन्य कारकों के आधार पर भिन्न हो सकते हैं।"
              : "Actual points may differ based on other factors."}
          </Text>
        </View>
      )}

      {/* ─── Done CTA ───────────────────────────────── */}
      <Pressable
        testID="mission-result-done"
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel={isHi ? "हो गया" : "Done"}
        style={({ pressed }) => [
          styles.doneBtn,
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={styles.doneText}>
          {isHi ? "हो गया" : "Done"}
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
  icon: {
    fontSize: 48,
    color: brand.primary[500],
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
  scoresRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  scoreBox: {
    alignItems: "center",
    gap: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: neutral[500],
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "700",
    color: neutral[900],
  },
  arrow: {
    fontSize: 20,
    color: neutral[500],
  },
  liftBadge: {
    backgroundColor: brand.primary[50],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: brand.primary[500],
  },
  liftText: {
    fontSize: 16,
    fontWeight: "700",
    color: brand.primary[700],
  },
  honestyBox: {
    backgroundColor: neutral[50],
    borderRadius: 8,
    padding: 12,
    gap: 4,
    alignSelf: "stretch",
  },
  honestyLine: {
    fontSize: 13,
    color: neutral[800],
  },
  honestyExplanation: {
    fontSize: 12,
    lineHeight: 18,
    color: neutral[500],
    marginTop: 4,
  },
  honestyExplanationHi: {
    lineHeight: 19.2, // 12 * 1.6
  },
  doneBtn: {
    backgroundColor: brand.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    marginTop: 8,
  },
  btnPressed: {
    opacity: 0.85,
  },
  doneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default MissionResult;
