/**
 * Onboarding — Pick your horticulture types (SAGE Phase 2A — HORTI sub-flow)
 *
 * Shown after `onboarding-soil-health.tsx` for farmers whose activity
 * list includes HORTI. 3 sub-type cards (Fruits, Vegetables, Flowers)
 * rendered from the existing ACTIVITY_SUBTYPE_CATALOG.HORTI catalog.
 *
 * For Phase 2A only **vegetables** is wired (Tomato is the canonical
 * vegetable crop). Fruits and Flowers render as disabled cards with a
 * "Coming soon" tag — they're visible so the farmer sees the system can
 * handle them, but un-tappable until Mango / Marigold get their PoP
 * seeders in Phase 2B.
 *
 * Routing chain handling:
 *   - If query param `cropCodes` is present (passed from onboarding-crops
 *     when the farmer picked BOTH CROP and HORTI), the picked HORTI codes
 *     are concatenated with cropCodes and the combined list is passed
 *     to `/onboarding-variety` as a single loop.
 *   - If no `cropCodes`, the HORTI codes alone become the variety loop.
 *
 * Auto-forward: if no HORTI activity in subscriptions, replace to /(tabs).
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiGet, apiPost } from "../lib/api";
import { ACTIVITY_SUBTYPE_CATALOG } from "../lib/activitySubtypeCatalog";
import { HORTI_SUBTYPES_WIRED } from "../lib/subtypeCropMapping";

type HortiCode = "fruits" | "vegetables" | "flowers";

const HORTI_SUBTYPES = ACTIVITY_SUBTYPE_CATALOG.HORTI.subtypes;

export default function OnboardingHortiScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cropCodes?: string }>();
  const carriedCropCodes = (params.cropCodes || "") as string;

  const [loading, setLoading] = useState(true);
  const [hasHorti, setHasHorti] = useState(false);
  const [picked, setPicked] = useState<HortiCode[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet("/farmer/activity-subscriptions");
        const rows: any[] = Array.isArray(r?.data)
          ? r.data
          : Array.isArray(r?.data?.items)
            ? r.data.items
            : [];
        const codes = rows
          .filter((s: any) => (s.status || "ACTIVE") === "ACTIVE")
          .map((s: any) => s.activityCode || s.activity_code);
        if (!codes.includes("HORTI")) {
          router.replace("/(tabs)" as any);
          return;
        }
        setHasHorti(true);
      } catch {
        setHasHorti(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const toggle = (code: HortiCode) => {
    if (!HORTI_SUBTYPES_WIRED[code]) return; // disabled
    setPicked((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const submit = async () => {
    if (picked.length === 0) {
      Alert.alert(
        "Pick at least one",
        "Select all the horticulture types you grow."
      );
      return;
    }
    setSubmitting(true);
    try {
      // Persist the HORTI sub-type preference
      const r = await apiPost("/farmer/activity-subtypes", {
        activityCode: "HORTI",
        subtypeCodes: picked,
      });
      if (!r?.success) throw new Error(r?.message || "Failed to save");
      // Concatenate carried CROP codes (if any) with HORTI codes and
      // route to the unified variety picker.
      const allCodes = [
        ...(carriedCropCodes ? carriedCropCodes.split(",") : []),
        ...picked,
      ];
      router.replace(
        `/onboarding-variety?codes=${allCodes.join(",")}` as any
      );
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    // If there are carried crop codes, still run the variety picker for them
    if (carriedCropCodes) {
      router.replace(
        `/onboarding-variety?codes=${carriedCropCodes}` as any
      );
    } else {
      router.replace("/(tabs)" as any);
    }
  };

  if (loading || !hasHorti) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2e7d32" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>🍎</Text>
        <Text style={styles.headerTitle}>Which horticulture do you grow?</Text>
        <Text style={styles.headerHi}>आप कौन सी बागवानी करते हैं?</Text>
      </View>

      <Text style={styles.stepSub}>
        Tap all that apply. We'll ask about variety for each one next.
      </Text>

      {HORTI_SUBTYPES.map((s) => {
        const active = picked.includes(s.code as HortiCode);
        const wired = HORTI_SUBTYPES_WIRED[s.code];
        return (
          <TouchableOpacity
            key={s.code}
            style={[
              styles.card,
              active && styles.cardActive,
              !wired && styles.cardDisabled,
            ]}
            onPress={() => toggle(s.code as HortiCode)}
            activeOpacity={wired ? 0.85 : 1}
          >
            <Text style={[styles.cardIcon, !wired && styles.iconDimmed]}>
              {s.icon}
            </Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.cardLabel,
                  active && styles.cardLabelActive,
                  !wired && styles.cardLabelDisabled,
                ]}
              >
                {s.labelEn}
              </Text>
              <Text style={styles.cardHi}>{s.labelHi}</Text>
              {!wired && (
                <Text style={styles.comingSoon}>Coming soon</Text>
              )}
            </View>
            {wired && (
              <View
                style={[styles.checkbox, active && styles.checkboxActive]}
              >
                {active && <Text style={styles.checkmark}>✓</Text>}
              </View>
            )}
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
  headerTitle: { color: "#fff", fontSize: 19, fontWeight: "800", textAlign: "center" },
  headerHi: { color: "#a5d6a7", fontSize: 13, marginTop: 4 },

  stepSub: { fontSize: 12, color: "#888", marginBottom: 14 },

  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 2, borderColor: "transparent", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  cardActive: { borderColor: "#2e7d32", backgroundColor: "#f1f8e9" },
  cardDisabled: { backgroundColor: "#fafafa", opacity: 0.65 },
  cardIcon: { fontSize: 30 },
  iconDimmed: { opacity: 0.5 },
  cardLabel: { fontSize: 16, fontWeight: "800", color: "#333" },
  cardLabelActive: { color: "#1b5e20" },
  cardLabelDisabled: { color: "#999" },
  cardHi: { fontSize: 12, color: "#888", marginTop: 2 },
  comingSoon: { fontSize: 10, color: "#e65100", fontWeight: "800", marginTop: 4, letterSpacing: 0.5 },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: "#cfd8dc", justifyContent: "center", alignItems: "center" },
  checkboxActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  checkmark: { color: "#fff", fontSize: 15, fontWeight: "800" },

  primaryBtn: { backgroundColor: "#1b5e20", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  skipLink: { textAlign: "center", color: "#888", fontSize: 13, marginTop: 14, textDecorationLine: "underline" },
});
