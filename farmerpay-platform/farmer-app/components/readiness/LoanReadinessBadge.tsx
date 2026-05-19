/**
 * LoanReadinessBadge — Single-state home-screen badge.
 *
 * Renders a traffic-light loan-readiness indicator with icon, color, and
 * localized label. No color-only signaling — every state has an icon + label.
 *
 * Design source: DESIGN-SYSTEM-SCORE-DISPLAY.md § Pattern 1
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getReadinessLabel,
  getReadinessA11yHint,
  type ReadinessState,
  type LangCode,
} from "../../lib/readinessStrings";

// ─── State → visual config ────────────────────────────────────────
// Colors from DESIGN-SYSTEM-SCORE-DISPLAY.md § decision/semantic tokens.
// "notReady" deliberately uses neutral grey — never red.

interface StateConfig {
  icon: keyof typeof Ionicons.glyphMap;
  fg: string;
  bg: string;
}

const STATE_CONFIG: Record<ReadinessState, StateConfig> = {
  ready: {
    icon: "checkmark-circle",
    fg: "#15803D",   // semantic.success.600
    bg: "#e8f5e9",
  },
  almost: {
    icon: "time",
    fg: "#B45309",   // semantic.warning.500
    bg: "#fff8e1",
  },
  notReady: {
    icon: "information-circle",
    fg: "#6B7280",   // semantic.neutral.500 — NOT red
    bg: "#f5f5f5",
  },
  needsData: {
    icon: "cloud-upload",
    fg: "#1D4ED8",   // semantic.info.500
    bg: "#e3f2fd",
  },
};

// ─── Props ─────────────────────────────────────────────────────────

export interface LoanReadinessBadgeProps {
  /** Current readiness state from the backend. */
  state: ReadinessState;
  /** Callback when the badge is tapped (navigates to drill-down). */
  onPress?: () => void;
  /** Language code for labels. Defaults to "en". */
  lang?: LangCode;
  /** Optional style overrides for the outer container. */
  style?: ViewStyle;
}

// ─── Component ─────────────────────────────────────────────────────

export default function LoanReadinessBadge({
  state,
  onPress,
  lang = "en",
  style,
}: LoanReadinessBadgeProps) {
  const config = STATE_CONFIG[state];
  const label = getReadinessLabel(state, lang);
  const a11yHint = getReadinessA11yHint(state, lang);

  const content = (
    <View
      style={[styles.card, { backgroundColor: config.bg }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={a11yHint}
    >
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: config.fg + "1A" }]}>
          <Ionicons name={config.icon} size={24} color={config.fg} />
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.heading}>Loan Readiness</Text>
          <Text style={[styles.label, { color: config.fg }]}>{label}</Text>
        </View>
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={config.fg}
            style={styles.chevron}
          />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        // Minimum touch target 48×48 dp
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={a11yHint}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    // elevation.1
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    // Minimum height ensures 48dp touch target
    minHeight: 56,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  textGroup: {
    flex: 1,
  },
  heading: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  chevron: {
    marginLeft: 4,
  },
});
