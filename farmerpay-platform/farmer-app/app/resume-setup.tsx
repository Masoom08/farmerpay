/**
 * Resume Setup — Persona phase routing wrapper
 *
 * Fetches the farmer's active subscriptions, finds the next one with
 * setup_complete = false, and routes to the appropriate setup screen.
 * After save, each setup screen routes back here to pick up the next
 * incomplete activity. When all are complete → /(tabs).
 *
 * Route table:
 *   CROP    → /roots-crop-card  (first cycle creation flips setup_complete)
 *   HORTI   → /roots-crop-card?mode=horti
 *   DAIRY   → /setup-dairy
 *   FISHERY → /setup-fishery
 *   POULTRY → /setup-poultry
 *   GOATERY → /setup-goatery
 *   LABOUR_WAGE / SHOP_BUSINESS / REMITTANCE / OTHER → /setup-confirm?code=...
 */

import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { apiGet } from "../lib/api";

type Subscription = {
  subscriptionId: string;
  activityCode: string;
  status: "ACTIVE" | "PAUSED" | "DROPPED";
  setupComplete?: boolean;
};

// Priority order — the wizard walks activities in this sequence
const ACTIVITY_ORDER = [
  "CROP",
  "HORTI",
  "DAIRY",
  "FISHERY",
  "POULTRY",
  "GOATERY",
  "LABOUR_WAGE",
  "SHOP_BUSINESS",
  "REMITTANCE",
  "OTHER",
];

const routeForActivity = (code: string): string => {
  switch (code) {
    case "CROP":
      return "/roots-crop-card";
    case "HORTI":
      return "/roots-crop-card?mode=horti";
    case "DAIRY":
      return "/setup-dairy";
    case "FISHERY":
      return "/setup-fishery";
    case "POULTRY":
      return "/setup-poultry";
    case "GOATERY":
      return "/setup-goatery";
    default:
      return `/setup-confirm?code=${code}`;
  }
};

export default function ResumeSetup() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet("/farmer/activity-subscriptions");
        const items: Subscription[] = r?.data?.items || [];
        const active = items.filter((s) => s.status === "ACTIVE");

        if (active.length === 0) {
          router.replace("/onboarding-activities" as any);
          return;
        }

        // Walk activities in canonical order, pick the first un-setup one
        const next = ACTIVITY_ORDER
          .map((code) => active.find((s) => s.activityCode === code))
          .find((s) => s && !s.setupComplete);

        if (!next) {
          // All active subscriptions are set up — straight to persona home
          router.replace("/(tabs)");
          return;
        }

        router.replace(routeForActivity(next.activityCode) as any);
      } catch {
        router.replace("/(tabs)");
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2e7d32" />
      <Text style={styles.label}>Loading your next step…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5", gap: 12 },
  label: { fontSize: 13, color: "#666" },
});
