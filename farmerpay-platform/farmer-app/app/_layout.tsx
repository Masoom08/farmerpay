/**
 * Root stack layout
 *
 * Gives every non-tab screen a header with:
 *   - A back arrow (native, from Expo Router's Stack)
 *   - A home icon on the right that jumps to the persona home
 *
 * The `(tabs)` group keeps its own header (headerShown: false here so
 * the tab layout's nested header is the one that renders inside the
 * tabs). Login / register / aadhaar-verify screens also render
 * without a header since those are pre-auth flows.
 *
 * This unblocks a UX bug reported during the pilot walkthrough: farmers
 * who finished filling data on a setup screen (e.g. /setup-dairy,
 * /roots-crop-card, /sage) had no way back to the persona home without
 * typing the URL. Now every screen has a back button + a home button.
 */

import React from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Reusable "jump to persona home" button rendered on the header right
// of every non-tab, non-auth screen. Tap → replace the nav stack with
// /(tabs) so the back history doesn't pile up.
const HomeHeaderButton = () => {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.replace("/(tabs)" as any)}
      accessibilityLabel="Go to home"
      accessibilityRole="button"
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      style={{ marginRight: 8, padding: 4 }}
    >
      <Ionicons name="home" size={22} color="#fff" />
    </TouchableOpacity>
  );
};

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          // Matches the tab layout's header color for visual consistency
          headerStyle: { backgroundColor: "#1b5e20" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" as const, fontSize: 17 },
          headerBackTitle: "Back",
          headerRight: () => <HomeHeaderButton />,
        }}
      >
        {/* Pre-auth + tab group — no header from the stack */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Aadhaar step-up flow — own chrome */}
        <Stack.Screen name="aadhaar-verify" options={{ headerShown: false }} />

        {/* Onboarding — back button useful, home button hidden since
            the farmer hasn't reached home yet */}
        <Stack.Screen
          name="onboarding-activities"
          options={{ title: "Choose activities", headerRight: () => null }}
        />
        <Stack.Screen
          name="onboarding-crops"
          options={{ title: "Choose crops", headerRight: () => null }}
        />
        <Stack.Screen
          name="onboarding-horti"
          options={{ title: "Choose horti crops", headerRight: () => null }}
        />
        <Stack.Screen
          name="onboarding-variety"
          options={{ title: "Choose variety", headerRight: () => null }}
        />
        <Stack.Screen
          name="onboarding-soil-health"
          options={{ title: "Soil health card", headerRight: () => null }}
        />
        <Stack.Screen
          name="resume-setup"
          options={{ title: "Resume setup", headerRight: () => null }}
        />

        {/* Setup (save-and-lock) screens — titles matter because the
            farmer is mid-flow and the header confirms which activity
            she's configuring */}
        <Stack.Screen name="setup-dairy" options={{ title: "Set up dairy" }} />
        <Stack.Screen name="setup-fishery" options={{ title: "Set up fishery" }} />
        <Stack.Screen name="setup-poultry" options={{ title: "Set up poultry" }} />
        <Stack.Screen name="setup-goatery" options={{ title: "Set up goatery" }} />
        <Stack.Screen name="setup-confirm" options={{ title: "Confirm activity" }} />

        {/* Activity drill-in screens */}
        <Stack.Screen name="activity-crop" options={{ title: "Crop farming" }} />
        <Stack.Screen name="activity-dairy" options={{ title: "Dairy" }} />
        <Stack.Screen name="activity-fishery" options={{ title: "Fisheries" }} />
        <Stack.Screen name="activity-horti" options={{ title: "Horticulture" }} />
        <Stack.Screen name="activity-poultry" options={{ title: "Poultry" }} />
        <Stack.Screen name="activity-goatery" options={{ title: "Goatery" }} />

        {/* Crop cycle + field management */}
        <Stack.Screen name="roots-crop-card" options={{ title: "Plant a new crop" }} />
        <Stack.Screen name="cycle-detail" options={{ title: "Cycle detail" }} />
        <Stack.Screen name="land-records" options={{ title: "Land records" }} />

        {/* Dairy deep screens */}
        <Stack.Screen name="dairy-animals" options={{ title: "My animals" }} />
        <Stack.Screen name="dairy-logbook" options={{ title: "Dairy logbook" }} />
        <Stack.Screen name="dairy-log-cost" options={{ title: "Log cost" }} />
        <Stack.Screen name="dairy-log-revenue" options={{ title: "Log revenue" }} />
        <Stack.Screen name="dairy-breeding" options={{ title: "Breeding" }} />
        <Stack.Screen name="dairy-treatment" options={{ title: "Treatment" }} />
        <Stack.Screen name="dairy-pnl" options={{ title: "Dairy P&L" }} />
        <Stack.Screen name="dairy-onboarding" options={{ title: "Set up dairy" }} />

        {/* Fishery deep screens */}
        <Stack.Screen name="fishery-ponds" options={{ title: "My ponds" }} />
        <Stack.Screen name="fishery-vessels" options={{ title: "My vessels" }} />
        <Stack.Screen name="fishery-trip" options={{ title: "Trip log" }} />
        <Stack.Screen name="fishery-logbook" options={{ title: "Fishery logbook" }} />
        <Stack.Screen name="fishery-log-cost" options={{ title: "Log cost" }} />
        <Stack.Screen name="fishery-log-revenue" options={{ title: "Log revenue" }} />
        <Stack.Screen name="fishery-pnl" options={{ title: "Fishery P&L" }} />
        <Stack.Screen name="fishery-onboarding" options={{ title: "Set up fishery" }} />

        {/* DICE + SAGE + CHOICE + TRUST */}
        <Stack.Screen name="loan-apply" options={{ title: "Apply for loan" }} />
        <Stack.Screen name="loan-journey" options={{ title: "Apply for loan" }} />
        <Stack.Screen name="repayments" options={{ title: "Repayments" }} />
        <Stack.Screen name="insurance" options={{ title: "Insurance" }} />
        <Stack.Screen name="bookmarks" options={{ title: "My saved products" }} />
        <Stack.Screen name="bank-loan-detail" options={{ title: "Bank loan detail" }} />
        <Stack.Screen name="postharvest-apply" options={{ title: "Harvest loan" }} />
        <Stack.Screen name="warehouse-list" options={{ title: "Warehouses" }} />
        <Stack.Screen name="sell-or-store" options={{ title: "Market & Sell" }} />
        <Stack.Screen name="sage" options={{ title: "Advice for your field" }} />
        <Stack.Screen name="soil-health" options={{ title: "Soil health card" }} />
        <Stack.Screen name="sage-advisories" options={{ title: "Advisories" }} />
        <Stack.Screen name="choice" options={{ title: "My SATHI agent" }} />
        <Stack.Screen name="trust-profile" options={{ title: "My profile" }} />

        {/* AA Financial Intelligence (V2) */}
        <Stack.Screen name="aa-consent" options={{ title: "Connect Bank" }} />
        <Stack.Screen name="aa-health" options={{ title: "Financial Health" }} />
        <Stack.Screen name="aa-insights" options={{ title: "Income & Expenses" }} />
      </Stack>
    </>
  );
}
