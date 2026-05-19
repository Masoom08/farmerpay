/**
 * MissionConfirm — Step 3 of mission flow (F1 — Spec §4).
 *
 * Displays a summary of what will happen + confirm/cancel buttons.
 * No point-lift shown here (spec §4: point-lift on Intro + Result only).
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { brand, neutral } from "../../../theme";

// ─── Types ──────────────────────────────────────────────────────

export interface MissionConfirmProps {
  /** Confirmation title */
  title: { en: string; hi: string };
  /** Summary of what will happen */
  summary: { en: string; hi: string };
  /** Confirm button label */
  confirmLabel: { en: string; hi: string };
  /** Cancel/go-back label */
  cancelLabel: { en: string; hi: string };
  onConfirm: () => void;
  onCancel: () => void;
  locale?: "en" | "hi";
  /** Optional: items to show in summary list */
  items?: { label: string; value: string }[];
}

// ─── Component ──────────────────────────────────────────────────

export function MissionConfirm({
  title,
  summary,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  locale = "en",
  items,
}: MissionConfirmProps) {
  const isHi = locale === "hi";

  return (
    <View testID="mission-confirm" style={styles.container}>
      {/* ─── Title ──────────────────────────────────── */}
      <Text
        testID="mission-confirm-title"
        style={[styles.title, isHi && styles.titleHi]}
        accessibilityRole="header"
      >
        {isHi ? title.hi : title.en}
      </Text>

      {/* ─── Summary ───────────────────────────────── */}
      <Text
        testID="mission-confirm-summary"
        style={[styles.summary, isHi && styles.summaryHi]}
      >
        {isHi ? summary.hi : summary.en}
      </Text>

      {/* ─── Summary items (optional) ──────────────── */}
      {items && items.length > 0 && (
        <View testID="mission-confirm-items" style={styles.itemsList}>
          {items.map((item, idx) => (
            <View key={idx} testID={`confirm-item-${idx}`} style={styles.itemRow}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ─── NO point-lift shown here (spec §4) ─────── */}

      {/* ─── Buttons ───────────────────────────────── */}
      <View style={styles.buttons}>
        <Pressable
          testID="mission-confirm-btn"
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel={isHi ? confirmLabel.hi : confirmLabel.en}
          style={({ pressed }) => [
            styles.confirmBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.confirmText}>
            {isHi ? confirmLabel.hi : confirmLabel.en}
          </Text>
        </Pressable>

        <Pressable
          testID="mission-cancel-btn"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={isHi ? cancelLabel.hi : cancelLabel.en}
          style={styles.cancelBtn}
        >
          <Text style={styles.cancelText}>
            {isHi ? cancelLabel.hi : cancelLabel.en}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: neutral[900],
    textAlign: "center",
    lineHeight: 28,
  },
  titleHi: {
    lineHeight: 32, // 20 * 1.6
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
    color: neutral[500],
    textAlign: "center",
  },
  summaryHi: {
    lineHeight: 22.4, // 14 * 1.6
  },
  itemsList: {
    backgroundColor: neutral[50],
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemLabel: {
    fontSize: 13,
    color: neutral[500],
  },
  itemValue: {
    fontSize: 13,
    fontWeight: "600",
    color: neutral[900],
  },
  buttons: {
    gap: 12,
    marginTop: 8,
  },
  confirmBtn: {
    backgroundColor: brand.primary[500],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.85,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelBtn: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    color: neutral[500],
  },
});

export default MissionConfirm;
