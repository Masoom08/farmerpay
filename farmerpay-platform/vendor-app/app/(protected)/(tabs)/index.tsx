/**
 * Vendor Home — Dashboard overview with KPIs.
 */
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { apiGet } from "../../../lib/api";
import { getUser } from "../../../src/lib/storage";
import { formatRupees } from "../../../src/utils/currency";
import client from "../../../src/api/client";
import { API } from "../../../src/api/endpoints";
import { useRatings } from "../../../src/hooks/useRatings";
import { useLogout } from "../../../src/hooks/useLogout";

export default function VendorHome() {
  const router = useRouter();
  const { handleLogout: logoutUser } = useLogout();
  const [user, setUserState] = useState<any>(null);
  const [perf, setPerf] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const {ratings, loadRatings } = useRatings();

  const load = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([
        getUser(),
        client.get("/vyapar/performance")
        .catch(() => ({ data:{success: false} })),
      ]);
      setUserState(u);
      if (p.data?.success) {
        setPerf(p.data.data);
      }
      await loadRatings();
    } catch {}
    setRefreshing(false);
  }, [loadRatings]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleLogout = () => {
  Alert.alert("Logout", "Are you sure?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Logout",
      style: "destructive",
      onPress: async () => {
        await logoutUser();
        router.replace("/login");
      },
    },
  ]);
};

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={["#d97706"]} />}
    >
      {/* Welcome */}
      <View style={styles.welcome}>
        <Text style={styles.welcomeEmoji}>🏪</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeName}>Namaste, {user?.name || "Vendor"}!</Text>
          <Text style={styles.welcomeRole}>FarmerPay Vendor Portal</Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#fef3c7" }]} onPress={() => router.push("/(tabs)/record-sale" as any)}>
          <Text style={styles.quickEmoji}>🛒</Text>
          <Text style={styles.quickLabel}>Record Sale</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#ecfdf5" }]} onPress={() => router.push("/(tabs)/farmers" as any)}>
          <Text style={styles.quickEmoji}>👥</Text>
          <Text style={styles.quickLabel}>My Farmers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#eff6ff" }]} onPress={() => router.push("/(tabs)/catalog" as any)}>
          <Text style={styles.quickEmoji}>📦</Text>
          <Text style={styles.quickLabel}>Catalog</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#fef2f2" }]} onPress={() => router.push("/(tabs)/credit" as any)}>
          <Text style={styles.quickEmoji}>💳</Text>
          <Text style={styles.quickLabel}>Credit</Text>
        </TouchableOpacity>
      </View>

      {/* Add Farmer + Give Credit */}
      <View style={styles.quickRow}>
        <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#f0fdf4", borderWidth: 1.5, borderColor: "#6ee7b7", borderStyle: "dashed" }]} onPress={() => router.push("/add-farmer" as any)}>
          <Text style={styles.quickEmoji}>👤➕</Text>
          <Text style={[styles.quickLabel, { color: "#059669" }]}>Add Farmer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#fffbeb", borderWidth: 1.5, borderColor: "#fde68a", borderStyle: "dashed" }]} onPress={() => router.push("/give-credit" as any)}>
          <Text style={styles.quickEmoji}>💳➕</Text>
          <Text style={[styles.quickLabel, { color: "#92400e" }]}>Give Credit</Text>
        </TouchableOpacity>
      </View>

      {/* Performance KPIs */}
      <Text style={styles.sectionLabel}>THIS MONTH</Text>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{perf?.total_transactions ?? 0}</Text>
          <Text style={styles.kpiLabel}>Transactions</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{formatRupees(perf?.total_revenue ?? 0)}</Text>
          <Text style={styles.kpiLabel}>Revenue</Text>
        </View>
      </View>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{perf?.unique_farmers_served ?? 0}</Text>
          <Text style={styles.kpiLabel}>Farmers Served</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            ⭐ {
              ratings?.averageRating
                ? ratings.averageRating.toFixed(1)
                : "N/A"
            }
          </Text>

          <Text style={styles.kpiLabel}>
            {ratings?.totalRatings || 0} Ratings
          </Text>

        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fffbeb" },
  content: { padding: 16, paddingBottom: 40 },
  welcome: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#d97706", borderRadius: 16, padding: 16, marginBottom: 16 },
  welcomeEmoji: { fontSize: 36 },
  welcomeName: { fontSize: 18, fontWeight: "800", color: "#fff" },
  welcomeRole: { fontSize: 12, color: "#fef3c7", marginTop: 2 },

  quickRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center" },
  quickEmoji: { fontSize: 24 },
  quickLabel: { fontSize: 11, fontWeight: "700", color: "#333", marginTop: 4 },

  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginBottom: 8 },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  kpiCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center" },
  kpiValue: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  kpiLabel: { fontSize: 11, color: "#888", marginTop: 4 },

  logoutBtn: { marginTop: 24, backgroundColor: "#f3f4f6", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  logoutText: { color: "#666", fontWeight: "600" },
  reviewCard: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 14,
  marginBottom: 8,
},

reviewName: {
  fontWeight: "700",
  color: "#1a1a1a",
},

reviewStars: {
  fontSize: 12,
},

reviewText: {
  color: "#666",
  fontSize: 12,
  marginTop: 6,
},
});
