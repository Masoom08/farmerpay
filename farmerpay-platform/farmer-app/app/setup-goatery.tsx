/**
 * Setup Goatery — Persona phase v1 stub
 *
 * Aggregate herd form for goats + sheep. Same stub pattern as
 * setup-poultry — flips setup_complete on the GOATERY subscription
 * via PATCH and stores counts in the notes field for v1.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiGet, apiPatch } from "../lib/api";

const Counter = ({
  label,
  emoji,
  value,
  onChange,
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <View style={styles.row}>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <View style={styles.counter}>
      <TouchableOpacity
        style={[styles.counterBtn, value <= 0 && styles.counterBtnDisabled]}
        onPress={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
      >
        <Text style={styles.counterBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.counterValue}>{value}</Text>
      <TouchableOpacity style={styles.counterBtn} onPress={() => onChange(value + 1)}>
        <Text style={styles.counterBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function SetupGoatery() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";

  const [saving, setSaving] = useState(false);
  const [stallFed, setStallFed] = useState(0);
  const [grazing, setGrazing] = useState(0);
  const [sheep, setSheep] = useState(0);

  const total = stallFed + grazing + sheep;

  const onSave = async () => {
    if (total === 0) {
      Alert.alert("Add at least one animal", "Enter a herd count before saving.");
      return;
    }
    setSaving(true);
    try {
      const list = await apiGet("/farmer/activity-subscriptions");
      const goatery = (list?.data?.items || []).find((s: any) => s.activityCode === "GOATERY");
      if (!goatery) {
        Alert.alert("Subscription not found", "Add GOATERY as an activity first.");
        setSaving(false);
        return;
      }
      const notes = `stall_fed=${stallFed}, grazing=${grazing}, sheep=${sheep}, total=${total}`;
      const r = await apiPatch(`/farmer/activity-subscriptions/${goatery.subscriptionId}`, {
        isSetupComplete: true,
        notes,
      });
      if (r?.success) {
        Alert.alert("Data Saved", "Goatery details saved successfully.", [
          { text: "Continue Setup", onPress: () => {
            if (isEditMode) router.replace("/(tabs)");
            else router.replace("/resume-setup" as any);
          }},
          { text: "Back to Home", style: "cancel", onPress: () => router.replace("/(tabs)") },
        ]);
      } else {
        Alert.alert("Save failed", r?.message || "Please try again.");
      }
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🐐</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isEditMode ? "Edit your herd" : "Tell us about your herd"}</Text>
          <Text style={styles.subtitle}>
            Detailed goat + sheep tracking is coming soon. For now, enter the rough count.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Counter label="Stall-fed goats" emoji="🐐" value={stallFed} onChange={setStallFed} />
        <View style={styles.divider} />
        <Counter label="Grazing goats" emoji="🐐" value={grazing} onChange={setGrazing} />
        <View style={styles.divider} />
        <Counter label="Sheep" emoji="🐑" value={sheep} onChange={setSheep} />
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total animals</Text>
        <Text style={styles.summaryValue}>{total}</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, (saving || total === 0) && styles.saveBtnDisabled]}
        onPress={onSave}
        disabled={saving || total === 0}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>{isEditMode ? "💾 Save changes" : "🔒 Save & lock"}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  emoji: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: "800", color: "#6a1b9a" },
  subtitle: { fontSize: 13, color: "#666", marginTop: 2, lineHeight: 18 },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rowEmoji: { fontSize: 22 },
  rowLabel: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f0f0f0" },
  counter: { flexDirection: "row", alignItems: "center", gap: 14 },
  counterBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3e5f5",
    alignItems: "center", justifyContent: "center",
  },
  counterBtnDisabled: { backgroundColor: "#f0f0f0" },
  counterBtnText: { fontSize: 20, fontWeight: "800", color: "#6a1b9a" },
  counterValue: { fontSize: 18, fontWeight: "800", color: "#222", minWidth: 30, textAlign: "center" },
  summary: {
    backgroundColor: "#f3e5f5", borderRadius: 12, padding: 14, marginBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  summaryLabel: { fontSize: 13, fontWeight: "700", color: "#6a1b9a" },
  summaryValue: { fontSize: 22, fontWeight: "800", color: "#4a148c" },
  saveBtn: { backgroundColor: "#6a1b9a", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  saveBtnDisabled: { backgroundColor: "#bdbdbd" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
