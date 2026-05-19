/**
 * Persona phase tab layout — 3 tabs instead of 5.
 *
 *   Home    → persona-based activity cards + bottom CTAs
 *   Money   → income / loans / EMI schedule / insurance
 *   More    → profile (TRUST) / soil / SAGE archive / settings
 *
 * The old ROOTS / PULSE / DICE tabs are gone — their content lives inside
 * per-activity detail screens and inline on the home. Legacy screens
 * (farm.tsx, market.tsx, loans.tsx) stay reachable via direct URL during
 * Phase A validation so nothing breaks, they're just off the nav. Phase B
 * sweeps them out.
 */

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2e7d32",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#e8e8e8", height: 60, paddingBottom: 8, paddingTop: 4 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: "#1b5e20" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" as const, fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "🌾 FarmerPay",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: "Money",
          headerTitle: "💰 Money",
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          headerTitle: "⚙️ More",
          tabBarIcon: ({ color, size }) => <Ionicons name="menu" size={size} color={color} />,
        }}
      />

      {/* Legacy screens — kept reachable via direct URL during Phase A
          validation, but hidden from the tab bar. Phase B sweeps them. */}
      <Tabs.Screen name="farm" options={{ href: null }} />
      <Tabs.Screen name="market" options={{ href: null }} />
      <Tabs.Screen name="loans" options={{ href: null }} />
      <Tabs.Screen name="setup-season" options={{ href: null, title: "Start Season" }} />
      <Tabs.Screen name="farm-health" options={{ href: null, title: "Farm Health" }} />
    </Tabs>
  );
}
