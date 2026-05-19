/**
 * Setup Dairy — Persona phase aggregate herd entry
 *
 * First-time setup for the DAIRY activity. The farmer enters aggregate
 * counts (cows / buffaloes / mixed + average daily milk), hits Save & lock,
 * and the backend creates N placeholder rows in dairy_animals AND flips
 * the farmer's DAIRY activity subscription setup_complete = true.
 *
 * Also reused in EDIT mode from the persona home (?mode=edit), pre-fills
 * counts from the current active herd.
 */

import React, { useCallback, useEffect, useState } from "react";
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
import { apiGet, apiPost } from "../lib/api";

type Counts = { cows: number; buffaloes: number; mixed: number; avgDailyMilkLiters: number };

const Counter = ({
  label,
  emoji,
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) => (
  <View style={styles.row}>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <View style={styles.counter}>
      <TouchableOpacity
        style={[styles.counterBtn, value <= min && styles.counterBtnDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        activeOpacity={0.7}
      >
        <Text style={styles.counterBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.counterValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.counterBtn, value >= max && styles.counterBtnDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        activeOpacity={0.7}
      >
        <Text style={styles.counterBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function SetupDairy() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState<Counts>({
    cows: 0,
    buffaloes: 0,
    mixed: 0,
    avgDailyMilkLiters: 10,
  });

  const total = counts.cows + counts.buffaloes + counts.mixed;

  // Prefill from existing herd on edit mode
  const load = useCallback(async () => {
    try {
      // Best-effort: pull existing dairy animals count for edit-mode prefill.
      // On first-time setup, this will just return empty and we start at 0.
      const r = await apiGet("/roots/dairy/v2/herd/summary").catch(() => null);
      const data = r?.data || {};
      if (data.counts) {
        setCounts({
          cows: data.counts.cows || 0,
          buffaloes: data.counts.buffaloes || 0,
          mixed: data.counts.mixed || 0,
          avgDailyMilkLiters: data.avgDailyMilkLiters || 10,
        });
      }
    } catch {
      /* first-time setup — defaults are fine */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    if (total === 0) {
      Alert.alert("Add at least one animal", "Tap + to add cows or buffaloes before saving.");
      return;
    }
    setSaving(true);
    try {
      const r = await apiPost("/roots/dairy/v2/herd/aggregate", counts);
      if (r?.success) {
        Alert.alert("Data Saved", "Dairy details saved successfully.", [
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🐄</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isEditMode ? "Edit your herd" : "Tell us about your herd"}</Text>
          <Text style={styles.subtitle}>
            {isEditMode
              ? "Adjust the counts to match your current herd."
              : "Just enter how many animals you have. You can name them later."}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Counter
          label="Cows"
          emoji="🐄"
          value={counts.cows}
          onChange={(v) => setCounts({ ...counts, cows: v })}
        />
        <View style={styles.divider} />
        <Counter
          label="Buffaloes"
          emoji="🐃"
          value={counts.buffaloes}
          onChange={(v) => setCounts({ ...counts, buffaloes: v })}
        />
        <View style={styles.divider} />
        <Counter
          label="Mixed / other"
          emoji="🐂"
          value={counts.mixed}
          onChange={(v) => setCounts({ ...counts, mixed: v })}
        />
      </View>

      <View style={styles.card}>
        <Counter
          label="Avg daily milk (litres)"
          emoji="🥛"
          value={counts.avgDailyMilkLiters}
          onChange={(v) => setCounts({ ...counts, avgDailyMilkLiters: v })}
          min={0}
          max={500}
        />
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
          <Text style={styles.saveBtnText}>
            {isEditMode ? "💾 Save changes" : "🔒 Save & lock"}
          </Text>
        )}
      </TouchableOpacity>

      {!isEditMode && (
        <Text style={styles.hint}>
          You can add, rename, or remove individual animals later from the Dairy card.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  emoji: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: "800", color: "#1b5e20" },
  subtitle: { fontSize: 13, color: "#666", marginTop: 2, lineHeight: 18 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rowEmoji: { fontSize: 22 },
  rowLabel: { fontSize: 15, fontWeight: "700", color: "#333", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f0f0f0" },

  counter: { flexDirection: "row", alignItems: "center", gap: 14 },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnDisabled: { backgroundColor: "#f0f0f0" },
  counterBtnText: { fontSize: 20, fontWeight: "800", color: "#2e7d32" },
  counterValue: { fontSize: 18, fontWeight: "800", color: "#222", minWidth: 30, textAlign: "center" },

  summary: {
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: { fontSize: 13, fontWeight: "700", color: "#2e7d32" },
  summaryValue: { fontSize: 22, fontWeight: "800", color: "#1b5e20" },

  saveBtn: {
    backgroundColor: "#2e7d32",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  saveBtnDisabled: { backgroundColor: "#bdbdbd" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  hint: { fontSize: 12, color: "#888", textAlign: "center", lineHeight: 18, paddingHorizontal: 20 },
});
