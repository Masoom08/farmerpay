/**
 * Setup Confirm — Persona phase single-tap lock-in
 *
 * For non-agri income streams (LABOUR_WAGE, SHOP_BUSINESS, REMITTANCE, OTHER)
 * no detail capture is needed. The farmer just confirms "yes this is my
 * income" and we flip setup_complete = true via PATCH.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiGet, apiPatch } from "../lib/api";

const META: Record<string, { emoji: string; title: string; body: string; color: string }> = {
  LABOUR_WAGE: {
    emoji: "👷",
    title: "Daily wage labour",
    body: "You earn daily wages from farm work, construction, or other labour jobs.",
    color: "#00695c",
  },
  SHOP_BUSINESS: {
    emoji: "🏪",
    title: "Shop or small business",
    body: "You run a kirana shop, tea stall, tailoring, or other small business.",
    color: "#4527a0",
  },
  REMITTANCE: {
    emoji: "💸",
    title: "Family remittance",
    body: "A family member sends money home from another city or country.",
    color: "#00838f",
  },
  OTHER: {
    emoji: "💼",
    title: "Other income",
    body: "Any other regular income source you'd like to track.",
    color: "#455a64",
  },
};

export default function SetupConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; mode?: string }>();
  const code = (params.code || "OTHER").toUpperCase();
  const meta = META[code] || META.OTHER;
  const isEditMode = params.mode === "edit";

  const [saving, setSaving] = useState(false);

  const onConfirm = async () => {
    setSaving(true);
    try {
      const list = await apiGet("/farmer/activity-subscriptions");
      const sub = (list?.data?.items || []).find((s: any) => s.activityCode === code);
      if (!sub) {
        Alert.alert("Subscription not found", "Please add this activity first.");
        setSaving(false);
        return;
      }
      const r = await apiPatch(`/farmer/activity-subscriptions/${sub.subscriptionId}`, {
        isSetupComplete: true,
      });
      if (r?.success) {
        Alert.alert("Data Saved", "Activity saved successfully.", [
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
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
        <Text style={[styles.title, { color: meta.color }]}>{meta.title}</Text>
        <Text style={styles.body}>{meta.body}</Text>
        <Text style={styles.hint}>
          No forms to fill. Just confirm this is one of your income streams and we'll
          track it alongside your other activities.
        </Text>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: meta.color }, saving && styles.confirmBtnDisabled]}
          onPress={onConfirm}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>✓ Yes, I confirm</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", justifyContent: "center", padding: 20 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  body: { fontSize: 14, color: "#555", textAlign: "center", lineHeight: 20, marginBottom: 14 },
  hint: { fontSize: 12, color: "#888", textAlign: "center", lineHeight: 18, marginBottom: 24, paddingHorizontal: 10 },
  confirmBtn: {
    width: "100%", borderRadius: 12, paddingVertical: 16, alignItems: "center",
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
