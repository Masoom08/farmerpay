/**
 * ScoreLadder — Vertical 4-rung ladder with "You are here" marker (E3).
 *
 * Spec §3.1: 4 rungs rendered bottom-to-top (starting → excellent).
 * Spec §3.6: Tapping a rung ABOVE current fires onTapAboveCurrent(bandIdx)
 *            to reveal "what it takes to reach here" gap list.
 * Spec §3.7: No scroll animation (reduced motion / low-end devices).
 *
 * Rungs below or at the current band are non-interactive (already reached).
 */

import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { brand, neutral, bandColors } from "../../../theme";
import { scoreToBand, type Band } from "../TrustScoreHero/bandLogic";

// ─── Types ─────────────────────────────────────────────────────

export interface LadderBand {
  min: number;
  label: { en: string; hi: string };
}

export interface ScoreLadderProps {
  score: number;
  bands: LadderBand[];
  locale?: "en" | "hi";
  onTapAboveCurrent: (bandIdx: number) => void;
}

// ─── Rung fill colours ─────────────────────────────────────────

const RUNG_FILLS: Record<number, string> = {};

function getRungFill(bandIdx: number, totalBands: number): string {
  // Map index to band key (0=lowest, 3=highest for 4 bands)
  if (bandIdx === totalBands - 1) return bandColors.excellent;
  if (bandIdx === totalBands - 2) return bandColors.good;
  if (bandIdx === totalBands - 3) return bandColors.building;
  return bandColors.starting;
}

// ─── Component ──────────────────────────────────────────────────

export function ScoreLadder({
  score,
  bands,
  locale = "en",
  onTapAboveCurrent,
}: ScoreLadderProps) {
  const isHi = locale === "hi";

  // Determine which rung the current score falls on
  // bands are ordered ascending by min (starting → excellent)
  const currentRungIdx = bands.reduce((acc, b, i) => {
    if (score >= b.min) return i;
    return acc;
  }, 0);

  // Render rungs top-to-bottom (highest first visually)
  const rungsTopDown = [...bands].reverse();

  return (
    <View
      testID="score-ladder"
      role="list"
      accessibilityLabel={isHi ? "स्कोर सीढ़ी" : "Score ladder"}
      style={styles.container}
    >
      {rungsTopDown.map((band, visualIdx) => {
        // Convert visual index back to band index (ascending order)
        const bandIdx = bands.length - 1 - visualIdx;
        const isCurrent = bandIdx === currentRungIdx;
        const isAbove = bandIdx > currentRungIdx;
        const isReached = bandIdx <= currentRungIdx;
        const fill = getRungFill(bandIdx, bands.length);
        const label = isHi ? band.label.hi : band.label.en;
        const isLast = visualIdx === rungsTopDown.length - 1;

        return (
          <RungItem
            key={bandIdx}
            testID={`rung-${bandIdx}`}
            bandIdx={bandIdx}
            label={label}
            fill={fill}
            isCurrent={isCurrent}
            isAbove={isAbove}
            isReached={isReached}
            isLast={isLast}
            locale={locale}
            onTap={isAbove ? onTapAboveCurrent : undefined}
          />
        );
      })}
    </View>
  );
}

// ─── Rung sub-component ────────────────────────────────────────

interface RungItemProps {
  testID: string;
  bandIdx: number;
  label: string;
  fill: string;
  isCurrent: boolean;
  isAbove: boolean;
  isReached: boolean;
  isLast: boolean;
  locale: "en" | "hi";
  onTap?: (bandIdx: number) => void;
}

function RungItem({
  testID,
  bandIdx,
  label,
  fill,
  isCurrent,
  isAbove,
  isReached,
  isLast,
  locale,
  onTap,
}: RungItemProps) {
  const isHi = locale === "hi";

  const handlePress = useCallback(() => {
    onTap?.(bandIdx);
  }, [onTap, bandIdx]);

  const a11yLabel = isCurrent
    ? isHi
      ? `${label} — आप यहाँ हैं`
      : `${label} — You are here`
    : isAbove
      ? isHi
        ? `${label} — यहाँ पहुँचने के लिए टैप करें`
        : `${label} — Tap to see what it takes`
      : label;

  const content = (
    <View style={styles.rungRow}>
      {/* ─── Connector line + dot ─────────────── */}
      <View style={styles.connectorCol}>
        <View
          testID={`dot-${bandIdx}`}
          style={[
            styles.dot,
            { backgroundColor: isReached ? fill : neutral[200] },
            isCurrent && styles.dotCurrent,
          ]}
        />
        {!isLast && (
          <View
            style={[
              styles.connectorLine,
              { backgroundColor: isReached ? fill : neutral[200] },
            ]}
          />
        )}
      </View>

      {/* ─── Rung bar ─────────────────────────── */}
      <View
        testID={`rung-bar-${bandIdx}`}
        style={[
          styles.rungBar,
          {
            backgroundColor: isReached ? fill : neutral[100],
            borderColor: isCurrent ? neutral[900] : "transparent",
            borderWidth: isCurrent ? 2 : 0,
          },
        ]}
      >
        <Text
          testID={`rung-label-${bandIdx}`}
          style={[
            styles.rungLabel,
            {
              color: isReached ? neutral[900] : neutral[500],
              fontWeight: isCurrent ? "700" : "500",
            },
          ]}
        >
          {label}
        </Text>

        {isCurrent && (
          <View testID="you-are-here" style={styles.markerBadge}>
            <Text style={styles.markerText}>
              {isHi ? "आप यहाँ हैं" : "You are here"}
            </Text>
          </View>
        )}

        {isAbove && (
          <Text
            testID={`rung-cta-${bandIdx}`}
            style={styles.ctaText}
          >
            {isHi ? "टैप करें →" : "Tap →"}
          </Text>
        )}
      </View>
    </View>
  );

  if (isAbove && onTap) {
    return (
      <Pressable
        testID={testID}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      role="listitem"
      accessibilityLabel={a11yLabel}
    >
      {content}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  rungRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 56,
  },
  connectorCol: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 20,
  },
  dotCurrent: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 18,
    borderWidth: 2,
    borderColor: neutral[900],
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginTop: 2,
  },
  rungBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    marginVertical: 2,
    gap: 8,
  },
  rungLabel: {
    fontSize: 14,
    flex: 1,
  },
  markerBadge: {
    backgroundColor: neutral[900],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  markerText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "600",
    color: brand.primary[700],
  },
  pressed: {
    opacity: 0.8,
  },
});

export default ScoreLadder;
