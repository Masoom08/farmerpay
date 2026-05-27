/**
 * My Farmers — List of farmers who buy from this vendor.
 * Shows purchase history, credit balance per farmer.
 */
import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,TouchableOpacity } from "react-native";
import { useFocusEffect,useRouter } from "expo-router";
import { formatRupees } from "../../../src/utils/currency";
import { getCreditLedger } from "../../../src/api/modules/credit.api";
import { getTransactions, } from "../../../src/api/modules/transaction.api";
import { useTransactions } from "../../../src/hooks/useTransactions";

export default function MyFarmersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creditEntries, setCreditEntries] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const [cr, tx] = await Promise.all([
        getCreditLedger().catch(() => ({
          success: false,
          data: [],
        })),

        getTransactions(50),
      ]);
      if (cr.success && Array.isArray(cr.data)) setCreditEntries(cr.data);
      if (tx.success && Array.isArray(tx.data)) setTransactions(tx.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Build farmer list from transactions
  const farmerMap: Record<string, { farmerId: string; name: string; mobile: string; txCount: number; totalSpent: number; creditBalance: number; lastDate: string }> = {};
  for (const tx of transactions) {
    const fId = tx.farmerId || "unknown";
    if (!farmerMap[fId]) {
      farmerMap[fId] = {
        farmerId: String(fId),
        name: tx.farmerName || `Farmer #${fId}`,
        mobile: tx.farmer_mobile || tx.farmerMobile || "",
        txCount: 0,
        totalSpent: 0,
        creditBalance: 0,
        lastDate: "",
      };
    }
    farmerMap[fId].txCount++;
    farmerMap[fId].totalSpent += Number(tx.amount || 0);
    const d = tx.date || "";
    if (d > farmerMap[fId].lastDate) farmerMap[fId].lastDate = d;
  }

  // Add credit balances
  for (const c of creditEntries) {
    const fId = c.farmer_id || c.farmerId || "unknown";
    if (farmerMap[fId]) {
      farmerMap[fId].creditBalance = Number(c.current_balance || c.currentBalance || 0);
    } else {
      farmerMap[fId] = {  
        farmerId: String(fId),
        name: c.farmer_name || c.farmerName || `Farmer #${fId}`,
        mobile: "",
        txCount: 0,
        totalSpent: 0,
        creditBalance: Number(c.current_balance || c.currentBalance || 0),
        lastDate: "",
      };
    }
  }

  const farmers = Object.values(farmerMap).sort((a, b) => b.totalSpent - a.totalSpent);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#d97706" /></View>;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={["#d97706"]} />}
    >
      <TouchableOpacity
        style={styles.floatingBtn}
        onPress={() =>
          router.push(
            "/farmer/add-transaction" as any
          )
        }
      >
        <Text style={styles.addTxnText}>
          + Add Transaction
        </Text>
      </TouchableOpacity>
      <Text style={styles.sectionLabel}>MY FARMERS ({farmers.length})</Text>

      {farmers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 40 }}>👥</Text>
          <Text style={styles.emptyTitle}>No farmers yet</Text>
          <Text style={styles.emptyText}>Record a sale to start tracking your farmer customers.</Text>
        </View>
      ) : (
        farmers.map((f: any, i) => (
          <TouchableOpacity
            key={i}
            style={styles.farmerCard}
            // onPress={() => {
            //   console.log("OPEN FARMER", f);

            //   router.push({
            //     pathname: "/farmer/[farmerId]",
            //     params: {
            //       farmerId:
            //         f.farmerId ||
            //         f.id ||
            //         f.farmer_id,
            //     },
            //   });
            // }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={styles.farmerName}>{f.name}</Text>
              <Text style={styles.farmerTotal}>{formatRupees(f.totalSpent)}</Text>
            </View>
            {f.mobile ? <Text style={styles.farmerMobile}>📞 {f.mobile}</Text> : null}
            <View style={styles.farmerStats}>
              <Text style={styles.statText}>📋 {f.txCount} orders</Text>
              {f.lastDate ? <Text style={styles.statText}>📅 Last: {f.lastDate}</Text> : null}
              {f.creditBalance > 0 && (
                <Text style={[styles.statText, { color: "#dc2626", fontWeight: "700" }]}>💳 Owes: {formatRupees(f.creditBalance)}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fffbeb" },
  content: { padding: 16, paddingBottom: 120 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginBottom: 8 },

  farmerCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8 },
  farmerName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  farmerTotal: { fontSize: 15, fontWeight: "700", color: "#d97706" },
  farmerMobile: { fontSize: 12, color: "#888", marginBottom: 4 },
  farmerStats: { flexDirection: "row", gap: 12, marginTop: 4 },
  statText: { fontSize: 11, color: "#888" },

  emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginTop: 8 },
  emptyText: { color: "#999", textAlign: "center", marginTop: 6, fontSize: 13 },
  floatingBtn: {
  position: "absolute",
  bottom: 20,
  right: 16,

  backgroundColor: "#d97706",

  borderRadius: 999,

  paddingHorizontal: 18,
  paddingVertical: 14,

  elevation: 8,

  zIndex: 999,
},

addTxnText: {
  color: "#fff",
  fontSize: 11,
  fontWeight: "700",
},
});
