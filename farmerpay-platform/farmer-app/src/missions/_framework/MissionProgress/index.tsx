/**
 * MissionProgress — Step 2 (Action) of mission flow (F1 — Spec §4).
 *
 * Renders mission-specific action content via `children`.
 * Shows step indicator (2 of 4) but NOT point-lift (spec §4: point-lift on Intro + Result only).
 * Android back returns to Step 1 without data loss (§4.1).
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { neutral, brand } from "../../../theme";

// ─── Types ──────────────────────────────────────────────────────

export interface MissionProgressProps {
  /** Step title shown at top */
  title: { en: string; hi: string };
  /** Current step (1-based for display: 1=Intro, 2=Action, 3=Confirm, 4=Result) */
  currentStep: number;
  totalSteps: number;
  locale?: "en" | "hi";
  /** Back button handler */
  onBack: () => void;
  /** Mission-specific action UI */
  children: React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────

export function MissionProgress({
  title,
  currentStep,
  totalSteps,
  locale = "en",
  onBack,
  children,
}: MissionProgressProps) {
  const isHi = locale === "hi";

  return (
    <View testID="mission-progress" style={styles.container}>
      {/* ─── Header: back + step indicator ──────────── */}
      <View style={styles.header}>
        <Pressable
          testID="mission-progress-back"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={isHi ? "पीछे जाएं" : "Go back"}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text
          testID="mission-progress-step"
          style={styles.stepIndicator}
        >
          {isHi
            ? `चरण ${currentStep} / ${totalSteps}`
            : `Step ${currentStep} of ${totalSteps}`}
        </Text>
      </View>

      {/* ─── Title ──────────────────────────────────── */}
      <Text
        testID="mission-progress-title"
        style={[styles.title, isHi && styles.titleHi]}
        accessibilityRole="header"
      >
        {isHi ? title.hi : title.en}
      </Text>

      {/* ─── Step progress bar ──────────────────────── */}
      <View testID="mission-progress-bar" style={styles.progressBar}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            testID={`progress-dot-${i}`}
            style={[
              styles.progressDot,
              i < currentStep && styles.progressDotFilled,
            ]}
          />
        ))}
      </View>

      {/* ─── NO point-lift shown here (spec §4) ─────── */}

      {/* ─── Action content ─────────────────────────── */}
      <View testID="mission-progress-content" style={styles.content}>
        {children}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 20,
    color: neutral[800],
  },
  stepIndicator: {
    fontSize: 13,
    color: neutral[500],
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: neutral[900],
    lineHeight: 26,
  },
  titleHi: {
    lineHeight: 28.8, // 18 * 1.6
  },
  progressBar: {
    flexDirection: "row",
    gap: 6,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: neutral[200],
  },
  progressDotFilled: {
    backgroundColor: brand.primary[500],
  },
  content: {
    flex: 1,
  },
});

export default MissionProgress;
