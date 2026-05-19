/**
 * Setup Fishery — Persona phase aggregate units entry
 *
 * First-time setup for the FISHERY activity. The farmer enters aggregate
 * counts (ponds / vessels) and a primary species + water source, hits
 * Save & lock, and the backend creates N placeholder rows in fishery_ponds
 * and fishery_vessels AND flips the farmer's FISHERY subscription
 * setup_complete = true.
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
import { apiPost } from "../lib/api";

const SPECIES = [
  { code: "rohu", label: "Rohu", emoji: "🐟" },
  { code: "catla", label: "Catla", emoji: "🐠" },
  { code: "mrigal", label: "Mrigal", emoji: "🐟" },
  { code: "tilapia", label: "Tilapia", emoji: "🐠" },
  { code: "pangasius", label: "Pangasius", emoji: "🐟" },
  { code: "mixed", label: "Mixed species", emoji: "🐡" },
];

const WATER_SOURCES = [
  { code: "well", label: "Well" },
  { code: "canal", label: "Canal" },
  { code: "river", label: "River" },
  { code: "rainwater", label: "Rainwater" },
  { code: "groundwater", label: "Groundwater" },
];

const Counter = ({
  label,
  emoji,
  value,
  onChange,
  max = 50,
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
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

export default function SetupFishery() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";

  const [saving, setSaving] = useState(false);
  const [ponds, setPonds] = useState(0);
  const [vessels, setVessels] = useState(0);
  const [species, setSpecies] = useState<string | null>(null);
  const [waterSource, setWaterSource] = useState<string | null>(null);

  const total = ponds + vessels;

  const onSave = async () => {
    if (total === 0) {
      Alert.alert("Add at least one unit", "Tap + to add ponds or vessels before saving.");
      return;
    }
    setSaving(true);
    try {
      const r = await apiPost("/roots/fishery/v2/units/aggregate", {
        ponds,
        vessels,
        species,
        waterSource,
      });
      if (r?.success) {
        Alert.alert("Data Saved", "Fishery details saved successfully.", [
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
        <Text style={styles.emoji}>🐟</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isEditMode ? "Edit your fishery" : "Tell us about your fishery"}</Text>
          <Text style={styles.subtitle}>
            {isEditMode
              ? "Adjust your pond and vessel counts."
              : "Just enter how many ponds and vessels you have. You can name them later."}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Counter label="Ponds" emoji="🏞️" value={ponds} onChange={setPonds} />
        <View style={styles.divider} />
        <Counter label="Vessels / boats" emoji="⛵" value={vessels} onChange={setVessels} />
      </View>

      <Text style={styles.sectionLabel}>Primary species</Text>
      <View style={styles.chipGrid}>
        {SPECIES.map((s) => (
          <TouchableOpacity
            key={s.code}
            style={[styles.chip, species === s.code && styles.chipSelected]}
            onPress={() => setSpecies(s.code)}
            activeOpacity={0.85}
          >
            <Text style={styles.chipEmoji}>{s.emoji}</Text>
            <Text style={[styles.chipText, species === s.code && styles.chipTextSelected]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {ponds > 0 && (
        <>
          <Text style={styles.sectionLabel}>Water source</Text>
          <View style={styles.chipGrid}>
            {WATER_SOURCES.map((w) => (
              <TouchableOpacity
                key={w.code}
                style={[styles.chip, waterSource === w.code && styles.chipSelected]}
                onPress={() => setWaterSource(w.code)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, waterSource === w.code && styles.chipTextSelected]}>
                  {w.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total units</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 48 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  emoji: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: "800", color: "#0d47a1" },
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
    backgroundColor: "#e3f2fd",
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnDisabled: { backgroundColor: "#f0f0f0" },
  counterBtnText: { fontSize: 20, fontWeight: "800", color: "#1565c0" },
  counterValue: { fontSize: 18, fontWeight: "800", color: "#222", minWidth: 30, textAlign: "center" },

  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#555", marginBottom: 8, marginLeft: 4 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipSelected: { backgroundColor: "#e3f2fd", borderColor: "#1565c0" },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: "600", color: "#555" },
  chipTextSelected: { color: "#0d47a1", fontWeight: "800" },

  summary: {
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: { fontSize: 13, fontWeight: "700", color: "#1565c0" },
  summaryValue: { fontSize: 22, fontWeight: "800", color: "#0d47a1" },

  saveBtn: {
    backgroundColor: "#1565c0",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  saveBtnDisabled: { backgroundColor: "#bdbdbd" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
