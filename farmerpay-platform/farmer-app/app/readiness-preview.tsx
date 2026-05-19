/**
 * Readiness Badge Preview — Test screen rendering all 4 states.
 * Navigate to /readiness-preview to verify visual rendering.
 */

import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import LoanReadinessBadge from "../components/readiness/LoanReadinessBadge";
import type { ReadinessState, LangCode } from "../lib/readinessStrings";

const STATES: ReadinessState[] = ["ready", "almost", "notReady", "needsData"];
const LANGS: { code: LangCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "od", label: "Odia" },
];

export default function ReadinessPreview() {
  const [lang, setLang] = useState<LangCode>("en");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>LoanReadinessBadge Preview</Text>
      <Text style={styles.subtitle}>All 4 states shown below</Text>

      {/* Language selector */}
      <View style={styles.langRow}>
        {LANGS.map((l) => (
          <Text
            key={l.code}
            style={[styles.langChip, lang === l.code && styles.langChipActive]}
            onPress={() => setLang(l.code)}
          >
            {l.label}
          </Text>
        ))}
      </View>

      {STATES.map((state) => (
        <View key={state} style={styles.section}>
          <Text style={styles.stateLabel}>state="{state}"</Text>
          <LoanReadinessBadge
            state={state}
            lang={lang}
            onPress={() => console.log(`Tapped: ${state}`)}
          />
        </View>
      ))}

      {/* Non-pressable variant */}
      <View style={styles.section}>
        <Text style={styles.stateLabel}>Non-pressable (no onPress)</Text>
        <LoanReadinessBadge state="ready" lang={lang} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 20, fontWeight: "800", color: "#1a1a2e", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#888", marginBottom: 16 },
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  langChip: {
    fontSize: 12, fontWeight: "600", color: "#666",
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: "#eee", overflow: "hidden",
  },
  langChipActive: { backgroundColor: "#1b5e20", color: "#fff" },
  section: { marginBottom: 16 },
  stateLabel: { fontSize: 11, fontWeight: "600", color: "#aaa", marginBottom: 6, fontFamily: "monospace" },
});
