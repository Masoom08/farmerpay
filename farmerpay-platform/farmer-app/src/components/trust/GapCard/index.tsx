/**
 * GapCard — Single actionable gap card (E4 — Spec §3.1 / §3.2 / §3.4).
 *
 * Shows: title, "+{n} points · ~{m} min", CTA button.
 * Swipe-left to dismiss (7-day cooldown handled by parent).
 * No animation on scroll (§3.7 reduced motion).
 */

import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  PanResponder,
  Animated,
  StyleSheet,
} from "react-native";
import { brand, neutral } from "../../../theme";

// ─── Types ─────────────────────────────────────────────────────

export interface GapCardProps {
  id: string;
  title: { en: string; hi: string };
  pointLift: number;
  effortMinutes: number;
  ctaLabel: { en: string; hi: string };
  locale?: "en" | "hi";
  onCta: () => void;
  onDismiss: () => void;
}

// ─── Ranking helper (exported for GapList) ─────────────────────

export interface GapItem {
  id: string;
  title: { en: string; hi: string };
  pointLift: number;
  effortMinutes: number;
  ctaLabel: { en: string; hi: string };
}

/**
 * Rank gaps by pointLift / effortMinutes ratio, descending.
 * Spec §3.2: ratio is the rule, NOT pointLift alone.
 */
export function rankGaps(gaps: GapItem[]): GapItem[] {
  return [...gaps].sort((a, b) => {
    const ratioA = a.effortMinutes > 0 ? a.pointLift / a.effortMinutes : 0;
    const ratioB = b.effortMinutes > 0 ? b.pointLift / b.effortMinutes : 0;
    return ratioB - ratioA;
  });
}

// ─── Swipe threshold ───────────────────────────────────────────

const SWIPE_THRESHOLD = -80; // px left

// ─── Component ──────────────────────────────────────────────────

export function GapCard({
  id,
  title,
  pointLift,
  effortMinutes,
  ctaLabel,
  locale = "en",
  onCta,
  onDismiss,
}: GapCardProps) {
  const isHi = locale === "hi";
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(gs.dx);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < SWIPE_THRESHOLD) {
          // Dismiss
          Animated.timing(translateX, {
            toValue: -400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onDismiss();
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const metaText = isHi
    ? `+${pointLift} अंक · लगभग ${effortMinutes} मिनट`
    : `+${pointLift} points · ~${effortMinutes} min`;

  const ctaText = isHi ? ctaLabel.hi : ctaLabel.en;
  const titleText = isHi ? title.hi : title.en;

  return (
    <Animated.View
      testID={`gap-card-${id}`}
      role="listitem"
      style={[styles.card, { transform: [{ translateX }] }]}
      accessibilityLabel={`${titleText}, ${metaText}`}
      {...panResponder.panHandlers}
    >
      {/* ─── Title ────────────────────────────────── */}
      <Text
        testID={`gap-title-${id}`}
        style={[styles.title, isHi && styles.titleHi]}
        numberOfLines={2}
      >
        {titleText}
      </Text>

      {/* ─── Meta: points + effort ────────────────── */}
      <Text
        testID={`gap-meta-${id}`}
        style={styles.meta}
      >
        {metaText}
      </Text>

      {/* ─── CTA button ──────────────────────────── */}
      <Pressable
        testID={`gap-cta-${id}`}
        onPress={onCta}
        accessibilityRole="button"
        accessibilityLabel={ctaText}
        style={({ pressed }) => [
          styles.ctaBtn,
          pressed && styles.ctaPressed,
        ]}
      >
        <Text style={styles.ctaText}>{ctaText}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: neutral[200],
    // Subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: neutral[900],
    lineHeight: 22,
  },
  titleHi: {
    lineHeight: 24, // 15 * 1.6 = 24 (Devanagari ≥ 1.55)
  },
  meta: {
    fontSize: 13,
    fontWeight: "500",
    color: brand.primary[700],
    lineHeight: 18,
  },
  ctaBtn: {
    alignSelf: "flex-start",
    backgroundColor: brand.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default GapCard;
