/**
 * Vendor Home — Dashboard overview with KPIs.
 */
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,Image } from "react-native";
import { Ionicons, MaterialCommunityIcons, } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { getUser } from "../../../src/lib/storage";
import { formatRupees } from "../../../src/utils/currency";
import client from "../../../src/api/client";
import { API } from "../../../src/api/endpoints";
import { useRatings } from "../../../src/hooks/useRatings";
import { useLogout } from "../../../src/hooks/useLogout";
import { useTransactions,} from "../../../src/hooks/useTransactions";
import { getTransactions, } from "../../../src/api/modules/transaction.api";
import { farmerApi } from "../../../src/api/modules/farmer.api";

const AddFarmerIcon = require(
  "../../../src/assets/addfarmer.png"
);

const GiveCreditIcon = require(
  "../../../src/assets/addcredit.png"
);
const ShopLogo = require(
  "../../../src/assets/image.png"
);

export default function VendorHome() {
  const router = useRouter();
  const { handleLogout: logoutUser } = useLogout();
  const [user, setUserState] = useState<any>(null);
  const [perf, setPerf] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [farmersCount, setFarmersCount] = useState(0);
  const {ratings, loadRatings } = useRatings();
  const {transactionCount,totalRevenue,loadTransactions } = useTransactions();

  const load = useCallback(async () => {
    try {
      const [u, p, farmers,] = await Promise.all([
        getUser(),
        client.get("/vyapar/performance")
        .catch(() => ({ data:{success: false} })),
        farmerApi.getMyFarmers(),
      ]);
      setUserState(u);
      if (p.data?.success) {
        setPerf(p.data.data);
      }
      if (Array.isArray(farmers)) {
      setFarmersCount(farmers.length);
    } else {
      setFarmersCount(0);
    }


      await loadRatings();
      await loadTransactions();
    } catch(e) {
      console.log(e);
    }
    setRefreshing(false);
  }, [loadRatings,
    loadTransactions
  ]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));


  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={["#d97706"]} />}
    >
      {/* Welcome */}
      <View style={styles.welcome}>
       <Image
          source={ShopLogo}
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
          }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeName}>Namaste, {user?.name || "Vendor"}!</Text>
          <Text style={styles.welcomeRole}>FarmerPay Vendor Portal</Text>
        </View>
      </View>

      {/* Quick actions */}
      {/* <View style={styles.quickRow}>
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
      </View> */}

      {/* Add Farmer + Give Credit */}
      {/* <View style={styles.quickRow}>
        <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#f0fdf4", borderWidth: 1.5, borderColor: "#6ee7b7", borderStyle: "dashed" }]} onPress={() => router.push("/farmer/add-farmer" as any)}>
          <Text style={styles.quickEmoji}>👤➕</Text>
          <Text style={[styles.quickLabel, { color: "#059669" }]}>Add Farmer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#fffbeb", borderWidth: 1.5, borderColor: "#fde68a", borderStyle: "dashed" }]} onPress={() => router.push("/farmer/give-credit" as any)}>
          <Text style={styles.quickEmoji}>💳➕</Text>
          <Text style={[styles.quickLabel, { color: "#92400e" }]}>Give Credit</Text>
        </TouchableOpacity>
      </View> */}
      <View style={styles.actionContainer}>
        {/* Add Farmer */}
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() =>
            router.push(
              "/farmer/add-farmer" as any
            )
          }
        >
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: "#ecfdf5",
              },
            ]}
          >
            <Image
              source={AddFarmerIcon}
              style={styles.actionIcon}
              resizeMode="contain"
            />
          </View>

          <View style={styles.actionContent}>
            <Text
              style={[
                styles.actionTitle,
                {
                  color: "#047857",
                },
              ]}
            >
              Add Farmer
            </Text>

            <Text style={styles.actionSubtitle}>
              Register a new farmer to
              start transactions
            </Text>
          </View>

          {/* <View
            style={[
              styles.arrowCircle,
              {
                backgroundColor: "#ecfdf5",
              },
            ]}
          >
            <Text
              style={[
                styles.arrow,
                {
                  color: "#10b981",
                },
              ]}
            >
              →
            </Text>
          </View> */}
        </TouchableOpacity>

        {/* Give Credit */}
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() =>
            router.push(
              "/farmer/give-credit" as any
            )
          }
        >
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: "#fffbeb",
              },
            ]}
          >
            <Image
              source={GiveCreditIcon}
              style={styles.actionIcon}
              resizeMode="contain"
            />
          </View>

          <View style={styles.actionContent}>
            <Text
              style={[
                styles.actionTitle,
                {
                  color: "#92400e",
                },
              ]}
            >
              Give Credit
            </Text>

            <Text style={styles.actionSubtitle}>
              Provide credit support
              to a farmer
            </Text>
          </View>

          {/* <View
            style={[
              styles.arrowCircle,
              {
                backgroundColor: "#fef3c7",
              },
            ]}
          >
            <Text
              style={[
                styles.arrow,
                {
                  color: "#f59e0b",
                },
              ]}
            >
              →
            </Text>
          </View> */}
        </TouchableOpacity>
      </View>

      {/* Performance KPIs */}
      <Text style={styles.sectionLabel}>THIS MONTH</Text>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{transactionCount}</Text>
          <Text style={styles.kpiLabel}>Transactions</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{formatRupees(totalRevenue)}</Text>
          <Text style={styles.kpiLabel}>Revenue</Text>
        </View>
      </View>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>  {farmersCount}
</Text>
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

      {/* Logout
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity> */}
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
welcomeIcon: {
  width: 56,
  height: 56,
  borderRadius: 16,
  backgroundColor: "rgba(255,255,255,0.15)",
  alignItems: "center",
  justifyContent: "center",
},

actionContainer: {
  gap: 14,
  marginBottom: 18,
},

actionCard: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#fff",
  borderRadius: 24,
  padding: 16,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: {
    width: 0,
    height: 4,
  },
  elevation: 3,
},

iconWrapper: {
  width: 72,
  height: 72,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
},

actionIcon: {
  width: 58,
  height: 58,
},

actionContent: {
  flex: 1,
  marginLeft: 14,
},

actionTitle: {
  fontSize: 20,
  fontWeight: "800",
},

actionSubtitle: {
  fontSize: 13,
  color: "#6b7280",
  marginTop: 4,
  lineHeight: 18,
},

arrowCircle: {
  width: 44,
  height: 44,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
},

arrow: {
  fontSize: 24,
  fontWeight: "700",
},
});
