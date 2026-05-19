/**
 * Land Records — AgriStack auto-fetch + manual fallback.
 *
 * Inserted into the cycle creation flow (reached from roots-crop-card
 * "+ Plant a new crop" before the variety picker, or as a prompt after
 * first cycle creation if no field is linked).
 *
 * Flow:
 *   1. Landing screen with two options: auto-fetch or manual entry
 *   2a. Auto-fetch → POST /agristack/land-lookup → render plot picker
 *        → on pick, POST /roots/farm/register + /roots/farm/:id/fields
 *   2b. Manual entry → state/district/village/survey/area form
 *        → same POSTs
 *   3. Returns to caller (via router.back() or router.replace)
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiPost } from "../lib/api";
import { fetchLandRecords, AgriStackPlot } from "../lib/agristackClient";

type Mode = "landing" | "picker" | "manual";

export default function LandRecords() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("landing");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plots, setPlots] = useState<AgriStackPlot[]>([]);
  const [source, setSource] = useState<string>("");

  // Manual form state
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [surveyNumber, setSurveyNumber] = useState("");
  const [area, setArea] = useState("");

  const onAutoFetch = async () => {
    setFetching(true);
    try {
      const r = await fetchLandRecords();
      if (r.plots.length === 0) {
        Alert.alert(
          "No records found",
          "We couldn't find any land records in your name. Please enter details manually.",
          [{ text: "Enter manually", onPress: () => setMode("manual") }]
        );
      } else {
        setPlots(r.plots);
        setSource(r.source);
        setMode("picker");
      }
    } catch {
      Alert.alert("Lookup failed", "Please enter your land details manually.");
      setMode("manual");
    } finally {
      setFetching(false);
    }
  };

  const saveSelectedPlot = async (plot: AgriStackPlot) => {
    setSaving(true);
    try {
      // Create the farm register first
      const farmRes = await apiPost("/roots/farm/register", {
        farmName: `${plot.village} farm`,
        totalHectares: plot.areaHectares,
        totalCultivableHectares: plot.areaHectares,
      });
      const registerId = farmRes?.data?.registerId;
      if (!registerId) throw new Error("Farm registration failed");
      // Then the field
      await apiPost(`/roots/farm/${registerId}/fields`, {
        fieldName: `Survey ${plot.surveyNumber}`,
        fieldSize: plot.areaHectares,
      });
      Alert.alert("Land saved", "Your land record is now linked to your account.", [
        { text: "Continue", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveManual = async () => {
    if (!surveyNumber || !area) {
      Alert.alert("Missing fields", "Survey number and area are required.");
      return;
    }
    setSaving(true);
    try {
      const areaNum = parseFloat(area);
      const farmRes = await apiPost("/roots/farm/register", {
        farmName: `${village || "My"} farm`,
        totalHectares: areaNum,
        totalCultivableHectares: areaNum,
      });
      const registerId = farmRes?.data?.registerId;
      if (!registerId) throw new Error("Farm registration failed");
      await apiPost(`/roots/farm/${registerId}/fields`, {
        fieldName: `Survey ${surveyNumber}`,
        fieldSize: areaNum,
      });
      Alert.alert("Land saved", "Your land record is now linked to your account.", [
        { text: "Continue", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Landing screen ──────────────────────────────────────────

  if (mode === "landing") {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Where is your field?</Text>
            <Text style={styles.subtitle}>
              We can fetch your land records from AgriStack using your Aadhaar.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, fetching && { opacity: 0.6 }]}
          onPress={onAutoFetch}
          disabled={fetching}
          activeOpacity={0.85}
        >
          {fetching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>📥 Auto-fetch from AgriStack</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.orLabel}>— or —</Text>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setMode("manual")}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>✏️ Enter manually</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Plot picker ─────────────────────────────────────────────

  if (mode === "picker") {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Found {plots.length} plots in your name</Text>
        <Text style={styles.subtitle}>
          Source: {source === "AGRISTACK_LIVE" ? "AgriStack (live)" : "AgriStack (demo mode)"}
        </Text>
        {plots.map((plot, i) => (
          <TouchableOpacity
            key={i}
            style={styles.plotCard}
            onPress={() => saveSelectedPlot(plot)}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.plotTitle}>Survey {plot.surveyNumber}</Text>
            <Text style={styles.plotMeta}>
              {plot.areaHectares} ha · {plot.village}, {plot.district}, {plot.state}
            </Text>
            <Text style={styles.plotOwnership}>{plot.ownershipType}</Text>
          </TouchableOpacity>
        ))}
        {saving && <ActivityIndicator color="#2e7d32" style={{ marginTop: 16 }} />}
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => setMode("manual")}
        >
          <Text style={styles.linkBtnText}>None of these — enter manually</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Manual form ──────────────────────────────────────────────

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Enter your land details</Text>

      <Text style={styles.fieldLabel}>State</Text>
      <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="e.g. Uttar Pradesh" />

      <Text style={styles.fieldLabel}>District</Text>
      <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="e.g. Kanpur" />

      <Text style={styles.fieldLabel}>Village</Text>
      <TextInput style={styles.input} value={village} onChangeText={setVillage} placeholder="e.g. Rampur" />

      <Text style={styles.fieldLabel}>Survey number *</Text>
      <TextInput style={styles.input} value={surveyNumber} onChangeText={setSurveyNumber} placeholder="e.g. 67A" />

      <Text style={styles.fieldLabel}>Area (hectares) *</Text>
      <TextInput
        style={styles.input}
        value={area}
        onChangeText={setArea}
        placeholder="e.g. 1.2"
        keyboardType="decimal-pad"
      />

      <TouchableOpacity
        style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
        onPress={saveManual}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Save land record</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 20 },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  emoji: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: "800", color: "#1b5e20", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#666", lineHeight: 18, marginBottom: 16 },

  primaryBtn: {
    backgroundColor: "#2e7d32", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 14,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  orLabel: { textAlign: "center", color: "#888", fontSize: 12, marginVertical: 8 },
  secondaryBtn: {
    backgroundColor: "#fff", borderRadius: 12, paddingVertical: 16, alignItems: "center",
    borderWidth: 1.5, borderColor: "#2e7d32",
  },
  secondaryBtnText: { color: "#2e7d32", fontSize: 15, fontWeight: "800" },

  plotCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: "#2e7d32",
  },
  plotTitle: { fontSize: 15, fontWeight: "800", color: "#1b5e20" },
  plotMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  plotOwnership: { fontSize: 11, color: "#2e7d32", fontWeight: "700", marginTop: 4 },

  linkBtn: { alignItems: "center", paddingVertical: 16 },
  linkBtnText: { color: "#1565c0", fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#555", marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#fff", borderRadius: 10, padding: 12, fontSize: 14,
    borderWidth: 1, borderColor: "#e0e0e0",
  },
});
