/**
 * MyScoreTopBar — TopBar wired with back button + LocaleSwitcher (E1).
 *
 * Back button only shown when `showBack` is true (deeplink entry).
 * LocaleSwitcher on the right slot.
 */

import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { TopBar } from "../primitives/TopBar";
import { LocaleSwitcher, type LocaleSwitcherProps } from "./LocaleSwitcher";
import type { LangCode } from "../../../lib/myScoreStrings";
import { neutral } from "../../theme";

// ─── Re-exports ─────────────────────────────────────────────────

export { LocaleSwitcher, LOCALE_STORAGE_KEY } from "./LocaleSwitcher";
export type { LocaleSwitcherProps } from "./LocaleSwitcher";

// ─── Props ─────────────────────────────────────────────────────

export interface MyScoreTopBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  currentLocale: LangCode;
  onLocaleChange: (locale: LangCode) => void;
  testID?: string;
}

// ─── Component ──────────────────────────────────────────────────

export function MyScoreTopBar({
  title,
  showBack = false,
  onBack,
  currentLocale,
  onLocaleChange,
  testID = "my-score-topbar",
}: MyScoreTopBarProps) {
  const backButton = showBack ? (
    <Pressable
      testID="topbar-back-btn"
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.backPressed,
      ]}
    >
      <Text style={styles.backText}>←</Text>
    </Pressable>
  ) : null;

  return (
    <TopBar
      testID={testID}
      title={title}
      left={backButton}
      right={
        <LocaleSwitcher
          currentLocale={currentLocale}
          onLocaleChange={onLocaleChange}
          testID="locale-switcher"
        />
      }
      style={styles.bar}
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bar: {
    height: 48,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  backPressed: {
    opacity: 0.6,
  },
  backText: {
    fontSize: 20,
    color: neutral[900],
  },
});
