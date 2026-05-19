/**
 * LocaleSwitcher — toggles between hi ↔ en (E1).
 *
 * Persists choice to AsyncStorage key `farmerpay:locale`.
 * Fires onLocaleChange so the parent screen re-renders immediately.
 */

import React, { useCallback } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LangCode } from "../../../lib/myScoreStrings";
import { brand, neutral } from "../../theme";

// ─── Constants ─────────────────────────────────────────────────

export const LOCALE_STORAGE_KEY = "farmerpay:locale";

// ─── Props ─────────────────────────────────────────────────────

export interface LocaleSwitcherProps {
  currentLocale: LangCode;
  onLocaleChange: (locale: LangCode) => void;
  testID?: string;
}

// ─── Component ──────────────────────────────────────────────────

export function LocaleSwitcher({
  currentLocale,
  onLocaleChange,
  testID = "locale-switcher",
}: LocaleSwitcherProps) {
  const nextLocale: LangCode = currentLocale === "en" ? "hi" : "en";
  const label = currentLocale === "en" ? "हिंदी" : "English";

  const handlePress = useCallback(async () => {
    try {
      await AsyncStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Silently fail — locale will revert on next load
    }
    onLocaleChange(nextLocale);
  }, [nextLocale, onLocaleChange]);

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Switch language to ${nextLocale === "hi" ? "Hindi" : "English"}`}
      accessibilityHint="Toggles display language between Hindi and English"
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      <Text testID={`${testID}-label`} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: brand.primary[500],
    backgroundColor: "transparent",
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: brand.primary[50],
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: brand.primary[700],
  },
});
