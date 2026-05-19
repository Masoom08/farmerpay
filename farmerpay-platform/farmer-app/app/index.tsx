/**
 * Entry Router — Persona phase state machine
 *
 * Branches after login based on the farmer's activity subscription state:
 *
 *   no token                        → /login
 *   no subscriptions                → /onboarding-activities  (first-ever setup)
 *   any subscription un-setup       → /resume-setup           (resume in-progress setup)
 *   all subscriptions setup_complete → /(tabs)                 (persona home — NO friction)
 *
 * The critical unlock: once a farmer has completed setup for every active
 * activity (which she does ONCE), every future MPIN login takes her straight
 * to the persona home — no onboarding screens, no setup wizards.
 */

import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { getToken, apiGet } from "../lib/api";

type Subscription = {
  subscriptionId: string;
  activityCode: string;
  status: "ACTIVE" | "PAUSED" | "DROPPED";
  setupComplete?: boolean;
};

export default function Entry() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const r = await apiGet("/farmer/activity-subscriptions");
        const items: Subscription[] = r?.data?.items || [];
        const active = items.filter((s) => s.status === "ACTIVE");

        // No active subscriptions at all → first-time onboarding wizard
        if (active.length === 0) {
          router.replace("/onboarding-activities" as any);
          return;
        }

        // Any active subscription with setup_complete=false → resume setup
        const anyUnsetup = active.some((s) => !s.setupComplete);
        if (anyUnsetup) {
          router.replace("/resume-setup" as any);
          return;
        }

        // All active subscriptions are set up → straight to persona home
        router.replace("/(tabs)");
      } catch (e) {
        // Network/auth failure → fall through to tabs; tab screens handle
        // their own auth redirects.
        router.replace("/(tabs)");
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2e7d32" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
});
