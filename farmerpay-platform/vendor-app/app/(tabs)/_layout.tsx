import { Tabs } from "expo-router";
import { Text } from "react-native";

const icon = (emoji: string) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export default function VendorTabLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: "#d97706" },
      headerTintColor: "#fff",
      tabBarActiveTintColor: "#d97706",
      tabBarInactiveTintColor: "#999",
      tabBarStyle: { paddingBottom: 4, height: 56 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("🏪"), headerTitle: "FarmerPay Vendor" }} />
      <Tabs.Screen name="record-sale" options={{ title: "Sell", tabBarIcon: icon("🛒"), headerTitle: "Record Sale" }} />
      <Tabs.Screen name="farmers" options={{ title: "Farmers", tabBarIcon: icon("👥"), headerTitle: "My Farmers" }} />
      <Tabs.Screen name="catalog" options={{ title: "Catalog", tabBarIcon: icon("📦"), headerTitle: "Catalog & Inventory" }} />
      <Tabs.Screen name="credit" options={{ title: "Credit", tabBarIcon: icon("💳"), headerTitle: "Credit Ledger" }} />
    </Tabs>
  );
}
