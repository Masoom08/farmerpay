/**
 * TRUST Activities Screen — onboarding for income mix.
 *
 * Lets the farmer:
 *  1. Pick which activities they engage in (CROP / DAIRY / FISHERY / HORTI /
 *     LABOUR / OFF_FARM / AGRI_BIZ)
 *  2. Mark one as primary
 *  3. Optionally allocate % share for the current year
 *  4. Save → PUT /trust/activities (resets cache, recomputes score)
 *
 * Backed by:
 *  GET /trust/activities    (load existing subscriptions + latest mix)
 *  PUT /trust/activities    (save)
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPut } from "../lib/api";

const ACTIVITY_TYPES = [
  { key: "CROP", label: "Crop Farming", emoji: "🌾" },
  { key: "DAIRY", label: "Dairy", emoji: "🐄" },
  { key: "FISHERY", label: "Fishery", emoji: "🐟" },
  { key: "HORTI", label: "Horticulture", emoji: "🍅" },
  { key: "LABOUR", label: "Daily Labour", emoji: "👷" },
  { key: "OFF_FARM", label: "Off-Farm Job", emoji: "💼" },
  { key: "AGRI_BIZ", label: "Agri Business", emoji: "🏪" },
];

const GREEN_DARK = "#1b5e20";
const GREEN_MID = "#2e7d32";
const GREEN_PALE = "#e8f5e9";

interface ActivityState {
  selected: boolean;
  isPrimary: boolean;
  sharePercent: string;
  estimatedAnnualIncomeInr: string;
}

const blank = (): ActivityState => ({
  selected: false,
  isPrimary: false,
  sharePercent: "",
  estimatedAnnualIncomeInr: "",
});

export default function TrustActivitiesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Record<string, ActivityState>>(() => {
    const init: Record<string, ActivityState> = {};
    ACTIVITY_TYPES.forEach((a) => (init[a.key] = blank()));
    return init;
  });

  const load = useCallback(async () => {
    try {
      const r = await apiGet("/trust/activities");
      if (r?.success && r?.data) {
        const next: Record<string, ActivityState> = {};
        ACTIVITY_TYPES.forEach((a) => (next[a.key] = blank()));
        const active: any[] = r.data.activities || [];
        active.forEach((a) => {
          if (next[a.activityType]) {
            next[a.activityType].selected = true;
            next[a.activityType].isPrimary = !!a.isPrimary;
          }
        });
        const mixItems: any[] = r.data.mix?.items || [];
        mixItems.forEach((m) => {
          if (next[m.activityType]) {
            next[m.activityType].sharePercent = String(m.sharePercent || "");
            next[m.activityType].estimatedAnnualIncomeInr = String(
              m.estimatedAnnualIncomeInr || "",
            );
          }
        });
        setItems(next);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load activities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (key: string) => {
    setItems((prev) => {
      const next = { ...prev };
      next[key] = { ...next[key], selected: !next[key].selected };
      if (!next[key].selected) {
        next[key].isPrimary = false;
        next[key].sharePercent = "";
        next[key].estimatedAnnualIncomeInr = "";
      }
      return next;
    });
  };

  const setPrimary = (key: string) => {
    setItems((prev) => {
      const next: Record<string, ActivityState> = {};
      Object.entries(prev).forEach(([k, v]) => {
        next[k] = { ...v, isPrimary: k === key && v.selected };
      });
      return next;
    });
  };

  const setField = (key: string, field: keyof ActivityState, value: string) => {
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const totalShare = Object.values(items)
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + (parseFloat(i.sharePercent) || 0), 0);

  const save = async () => {
    const selected = Object.entries(items).filter(([, v]) => v.selected);
    if (selected.length === 0) {
      Alert.alert("Pick at least one", "Please select at least one activity.");
      return;
    }
    if (totalShare > 105) {
      Alert.alert("Too much", `Income shares total ${totalShare}%. Must be ≤ 100%.`);
      return;
    }

    const activities = selected.map(([type, v]) => ({
      type,
      isPrimary: v.isPrimary,
    }));

    const mixItems = selected
      .filter(([, v]) => parseFloat(v.sharePercent) > 0 || parseFloat(v.estimatedAnnualIncomeInr) > 0)
      .map(([type, v]) => ({
        type,
        sharePercent: parseFloat(v.sharePercent) || 0,
        estimatedAnnualIncomeInr: parseFloat(v.estimatedAnnualIncomeInr) || 0,
        confidence: "MEDIUM" as const,
      }));

    setSaving(true);
    try {
      const body: any = { activities };
      if (mixItems.length > 0) {
        body.mix = { referenceYear: new Date().getFullYear(), items: mixItems };
      }
      const r = await apiPut("/trust/activities", body);
      if (r?.success) {
        Alert.alert("Saved", "Your income mix has been updated.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", r?.message || "Failed to save");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN_MID} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>Your Livelihood Mix</Text>
      <Text style={styles.sub}>
        Tell us where your household income comes from. This helps us match the right
        loans, insurance and advisories.
      </Text>

      {ACTIVITY_TYPES.map((a) => {
        const it = items[a.key];
        return (
          <View key={a.key} style={[styles.card, it.selected && styles.cardSelected]}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggle(a.key)}
              activeOpacity={0.85}
            >
              <Text style={styles.emoji}>{a.emoji}</Text>
              <Text style={styles.cardLabel}>{a.label}</Text>
              <Text style={[styles.checkbox, it.selected && styles.checkboxOn]}>
                {it.selected ? "☑" : "☐"}
              </Text>
            </TouchableOpacity>

            {it.selected && (
              <View style={styles.cardBody}>
                <TouchableOpacity
                  style={[styles.primaryBtn, it.isPrimary && styles.primaryBtnOn]}
                  onPress={() => setPrimary(a.key)}
                >
                  <Text
                    style={[
                      styles.primaryBtnText,
                      it.isPrimary && styles.primaryBtnTextOn,
                    ]}
                  >
                    {it.isPrimary ? "★ Primary income" : "Set as primary"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Share of income (%)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="e.g. 40"
                      value={it.sharePercent}
                      onChangeText={(t) => setField(a.key, "sharePercent", t)}
                    />
                  </View>
                  <View style={{ flex: 1.3 }}>
                    <Text style={styles.fieldLabel}>Annual income (₹)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="optional"
                      value={it.estimatedAnnualIncomeInr}
                      onChangeText={(t) =>
                        setField(a.key, "estimatedAnnualIncomeInr", t)
                      }
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.totalsCard}>
        <Text style={styles.totalsLabel}>Total share allocated</Text>
        <Text
          style={[
            styles.totalsValue,
            totalShare > 100 && { color: "#c62828" },
          ]}
        >
          {totalShare.toFixed(0)}%
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        disabled={saving}
        onPress={save}
      >
        <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Mix"}</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  back: { marginBottom: 12 },
  backText: { color: GREEN_MID, fontWeight: "700", fontSize: 15 },
  h1: { fontSize: 22, fontWeight: "900", color: GREEN_DARK },
  sub: { fontSize: 13, color: "#666", marginBottom: 16, marginTop: 4, lineHeight: 18 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#eee",
    overflow: "hidden",
  },
  cardSelected: { borderColor: GREEN_MID, backgroundColor: GREEN_PALE },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  emoji: { fontSize: 22 },
  cardLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: "#333" },
  checkbox: { fontSize: 22, color: "#bbb" },
  checkboxOn: { color: GREEN_MID },

  cardBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  primaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    alignSelf: "flex-start",
  },
  primaryBtnOn: { backgroundColor: GREEN_DARK, borderColor: GREEN_DARK },
  primaryBtnText: { fontSize: 12, fontWeight: "700", color: "#666" },
  primaryBtnTextOn: { color: "#fff" },

  row: { flexDirection: "row", gap: 10 },
  fieldLabel: { fontSize: 11, color: "#666", marginBottom: 4, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    fontSize: 14,
  },

  totalsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 14,
  },
  totalsLabel: { fontSize: 13, color: "#666", fontWeight: "600" },
  totalsValue: { fontSize: 16, fontWeight: "900", color: GREEN_DARK },

  saveBtn: {
    backgroundColor: GREEN_MID,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
