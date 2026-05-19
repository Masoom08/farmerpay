/**
 * Setup Poultry — Persona phase v1 stub
 *
 * Aggregate flock form skeleton. v1 ships without the full poultry PoP
 * wiring — the farmer enters total flock size + broiler / layer / native
 * counts, we flip setup_complete on the POULTRY subscription, and land
 * back at resume-setup. Detailed per-unit screens come in a future phase.
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
        onPress={() => onChange(Math.max(0, value - 5))}
        disabled={value <= 0}
      >
        <Text style={styles.counterBtnText}>−5</Text>
      </TouchableOpacity>
      <Text style={styles.counterValue}>{value}</Text>
      <TouchableOpacity
        style={styles.counterBtn}
        onPress={() => onChange(Math.min(9999, value + 5))}
      >
        <Text style={styles.counterBtnText}>+5</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function SetupPoultry() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";

  const [saving, setSaving] = useState(false);
  const [broilers, setBroilers] = useState(0);
  const [layers, setLayers] = useState(0);
  const [native, setNative] = useState(0);

  const total = broilers + layers + native;

  const onSave = async () => {
    if (total === 0) {
      Alert.alert("Add at least one bird", "Enter a flock count before saving.");
      return;
    }
    setSaving(true);
    try {
      // v1: no dedicated poultry aggregate endpoint yet — just flip the
      // setup_complete flag on the POULTRY subscription via the generic
      // PATCH endpoint. Counts are stored in notes as a quick workaround.
      const list = await apiGet("/farmer/activity-subscriptions");
      const poultry = (list?.data?.items || []).find((s: any) => s.activityCode === "POULTRY");
      if (!poultry) {
        Alert.alert("Subscription not found", "Add POULTRY as an activity first.");
        setSaving(false);
        return;
      }
      const notes = `broilers=${broilers}, layers=${layers}, native=${native}, total=${total}`;
      const r = await apiPatch(`/farmer/activity-subscriptions/${poultry.subscriptionId}`, {
        isSetupComplete: true,
        notes,
      });
      if (r?.success) {
        Alert.alert("Data Saved", "Poultry details saved successfully.", [
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
        <Text style={styles.emoji}>🐔</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isEditMode ? "Edit your flock" : "Tell us about your flock"}</Text>
          <Text style={styles.subtitle}>
            Detailed poultry tracking is coming soon. For now, enter the rough count per type.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Counter label="Broilers" emoji="🐥" value={broilers} onChange={setBroilers} />
        <View style={styles.divider} />
        <Counter label="Layers" emoji="🐔" value={layers} onChange={setLayers} />
        <View style={styles.divider} />
        <Counter label="Native / desi" emoji="🐓" value={native} onChange={setNative} />
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total birds</Text>
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
  title: { fontSize: 20, fontWeight: "800", color: "#e65100" },
  subtitle: { fontSize: 13, color: "#666", marginTop: 2, lineHeight: 18 },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rowEmoji: { fontSize: 22 },
  rowLabel: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f0f0f0" },
  counter: { flexDirection: "row", alignItems: "center", gap: 10 },
  counterBtn: {
    paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: "#fff3e0",
    alignItems: "center", justifyContent: "center",
  },
  counterBtnDisabled: { backgroundColor: "#f0f0f0" },
  counterBtnText: { fontSize: 14, fontWeight: "800", color: "#e65100" },
  counterValue: { fontSize: 18, fontWeight: "800", color: "#222", minWidth: 40, textAlign: "center" },
  summary: {
    backgroundColor: "#fff3e0", borderRadius: 12, padding: 14, marginBottom: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  summaryLabel: { fontSize: 13, fontWeight: "700", color: "#e65100" },
  summaryValue: { fontSize: 22, fontWeight: "800", color: "#bf360c" },
  saveBtn: { backgroundColor: "#e65100", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  saveBtnDisabled: { backgroundColor: "#bdbdbd" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
