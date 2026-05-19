/**
 * Onboarding — Pick your crops (SAGE Phase 2A)
 *
 * Shown after `onboarding-soil-health.tsx` for farmers whose activity
 * list includes CROP. 5 sub-crop cards (rice, wheat, sugarcane, oilseeds,
 * pulses) rendered from the already-existing ACTIVITY_SUBTYPE_CATALOG.
 *
 * Flow:
 *   - On mount, fetch activity subscriptions.
 *   - If CROP is NOT present → router.replace('/(tabs)/farm') silently.
 *     (This handles HORTI-only farmers who transited through SHC.)
 *   - If CROP present → render the 5 cards.
 *   - Multi-select. Continue POSTs /farmer/activity-subtypes, then
 *     navigates to /onboarding-variety?codes=<comma-list>.
 *
 * No sowing-date, no insurance, no policy no — those live later.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost } from "../lib/api";
import { ACTIVITY_SUBTYPE_CATALOG } from "../lib/activitySubtypeCatalog";

type SubtypeCode = "rice" | "wheat" | "sugarcane" | "oilseeds" | "pulses";

const CROP_SUBTYPES = ACTIVITY_SUBTYPE_CATALOG.CROP.subtypes;

export default function OnboardingCropsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasCrop, setHasCrop] = useState(false);
  const [hasHorti, setHasHorti] = useState(false);
  const [picked, setPicked] = useState<SubtypeCode[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Resolve activity list on mount.
  //   - If CROP present     → render the 5 sub-crop cards
  //   - else if HORTI present → forward to /onboarding-horti
  //   - else                 → forward to /(tabs)
  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet("/farmer/activity-subscriptions");
        const rows: any[] = Array.isArray(r?.data)
          ? r.data
          : Array.isArray(r?.data?.items)
            ? r.data.items
            : Array.isArray(r?.data?.subscriptions)
              ? r.data.subscriptions
              : [];
        const codes = rows
          .filter((s: any) => (s.status || "ACTIVE") === "ACTIVE")
          .map((s: any) => s.activityCode || s.activity_code);
        const cropPresent = codes.includes("CROP");
        const hortiPresent = codes.includes("HORTI");
        if (!cropPresent) {
          router.replace((hortiPresent ? "/onboarding-horti" : "/(tabs)") as any);
          return;
        }
        setHasCrop(true);
        setHasHorti(hortiPresent);
      } catch {
        // On fetch failure, assume the farmer could be a crop farmer and
        // let them see the screen rather than silently skipping.
        setHasCrop(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const toggle = (code: SubtypeCode) => {
    setPicked((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const submit = async () => {
    if (picked.length === 0) {
      Alert.alert(
        "Pick at least one",
        "Select all the crops you grow this season."
      );
      return;
    }
    setSubmitting(true);
    try {
      const r = await apiPost("/farmer/activity-subtypes", {
        activityCode: "CROP",
        subtypeCodes: picked,
      });
      if (!r?.success) throw new Error(r?.message || "Failed to save");
      // If HORTI is also active, hand off to /onboarding-horti and let it
      // collect HORTI sub-types before running a unified variety loop.
      // Otherwise go straight to the variety picker for the CROP codes.
      if (hasHorti) {
        router.replace(
          `/onboarding-horti?cropCodes=${picked.join(",")}` as any
        );
      } else {
        router.replace(
          `/onboarding-variety?codes=${picked.join(",")}` as any
        );
      }
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => router.replace("/(tabs)" as any);

  if (loading || !hasCrop) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2e7d32" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>🌾</Text>
        <Text style={styles.headerTitle}>Which crops do you grow?</Text>
        <Text style={styles.headerHi}>आप कौन सी फसलें उगाते हैं?</Text>
      </View>

      <Text style={styles.stepSub}>
        Tap all that apply. We'll ask about variety for each one next.
      </Text>

      {CROP_SUBTYPES.map((s) => {
        const active = picked.includes(s.code as SubtypeCode);
        return (
          <TouchableOpacity
            key={s.code}
            style={[styles.card, active && styles.cardActive]}
            onPress={() => toggle(s.code as SubtypeCode)}
            activeOpacity={0.85}
          >
            <Text style={styles.cardIcon}>{s.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>
                {s.labelEn}
              </Text>
              <Text style={styles.cardHi}>{s.labelHi}</Text>
            </View>
            <View style={[styles.checkbox, active && styles.checkboxActive]}>
              {active && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
        onPress={submit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>
            Continue →   ({picked.length} selected)
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={skip} disabled={submitting}>
        <Text style={styles.skipLink}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },

  headerCard: { backgroundColor: "#1b5e20", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 14 },
  headerEmoji: { fontSize: 36, marginBottom: 4 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerHi: { color: "#a5d6a7", fontSize: 13, marginTop: 4 },

  stepSub: { fontSize: 12, color: "#888", marginBottom: 14 },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 2, borderColor: "transparent", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  cardActive: { borderColor: "#2e7d32", backgroundColor: "#f1f8e9" },
  cardIcon: { fontSize: 30 },
  cardLabel: { fontSize: 16, fontWeight: "800", color: "#333" },
  cardLabelActive: { color: "#1b5e20" },
  cardHi: { fontSize: 12, color: "#888", marginTop: 2 },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: "#cfd8dc", justifyContent: "center", alignItems: "center" },
  checkboxActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  checkmark: { color: "#fff", fontSize: 15, fontWeight: "800" },

  primaryBtn: { backgroundColor: "#1b5e20", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  skipLink: { textAlign: "center", color: "#888", fontSize: 13, marginTop: 14, textDecorationLine: "underline" },
});
