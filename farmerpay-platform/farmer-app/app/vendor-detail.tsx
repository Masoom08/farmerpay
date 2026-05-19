/**
 * Vendor Detail — Profile, Catalog, Purchase History, Rating
 *
 * Accessed from Krishi Bazaar vendor card.
 * Query param: ?vendorId=123
 */
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal, Linking, RefreshControl,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { apiGet, apiPost, formatRupees } from "../lib/api";

const TYPE_LABELS: Record<string, string> = {
  seeds_distributor: "Seeds Dealer", fertilizer_supplier: "Fertilizer Supplier",
  pesticide_dealer: "Pesticide Dealer", equipment_supplier: "Equipment Supplier",
  multipurpose_dealer: "Multipurpose", aggregator: "Aggregator",
};

export default function VendorDetailScreen() {
  const router = useRouter();
  const { vendorId } = useLocalSearchParams<{ vendorId: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [rateModal, setRateModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!vendorId) return;
    try {
      const r = await apiGet(`/vyapar/farmer/vendor/${vendorId}`);
      if (r.success) setDetail(r.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [vendorId]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submitRating = async () => {
    const r = await apiPost("/vyapar/farmer/rate-vendor", {
      vendorId: parseInt(vendorId!, 10),
      score: rating,
      feedback,
    });
    if (r.success) {
      Alert.alert("Thank you!", "Rating submitted.");
      setRateModal(false);
      setFeedback("");
      load();
    } else {
      Alert.alert("Error", r.message || "Failed to submit rating.");
    }
  };

  if (loading) return (
    <>
      <Stack.Screen options={{ title: "Vendor", headerStyle: { backgroundColor: "#d97706" }, headerTintColor: "#fff" }} />
      <View style={styles.center}><ActivityIndicator size="large" color="#d97706" /></View>
    </>
  );

  if (!detail) return (
    <>
      <Stack.Screen options={{ title: "Vendor", headerStyle: { backgroundColor: "#d97706" }, headerTintColor: "#fff" }} />
      <View style={styles.center}><Text style={styles.emptyText}>Vendor not found</Text></View>
    </>
  );

  const v = detail.vendor;
  const hasCredit = detail.credit && detail.credit.balance > 0;

  return (
    <>
      <Stack.Screen options={{ title: v.name, headerStyle: { backgroundColor: "#d97706" }, headerTintColor: "#fff" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={["#d97706"]} />}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Text style={{ fontSize: 48, textAlign: "center" }}>🏪</Text>
          <Text style={styles.vendorName}>{v.name}</Text>
          <Text style={styles.vendorType}>{TYPE_LABELS[v.vendorType] || v.vendorType}</Text>
          {v.address && <Text style={styles.vendorAddress}>📍 {v.address}</Text>}
          <Text style={styles.vendorRating}>⭐ {v.rating.toFixed(1)}</Text>

          <View style={styles.actionRow}>
            {v.phone && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${v.phone}`)}>
                <Text style={styles.actionIcon}>📞</Text>
                <Text style={styles.actionLabel}>Call</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#d97706" }]}
              onPress={() => router.push(`/record-purchase?vendorId=${vendorId}` as any)}>
              <Text style={styles.actionIcon}>🛒</Text>
              <Text style={[styles.actionLabel, { color: "#fff" }]}>Buy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setRateModal(true)}>
              <Text style={styles.actionIcon}>⭐</Text>
              <Text style={styles.actionLabel}>Rate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Credit Balance */}
        {hasCredit && (
          <View style={styles.creditCard}>
            <Text style={styles.creditLabel}>💳 Credit Balance</Text>
            <Text style={styles.creditAmount}>{formatRupees(detail.credit.balance)}</Text>
            {detail.credit.limit > 0 && (
              <Text style={styles.creditLimit}>Limit: {formatRupees(detail.credit.limit)}</Text>
            )}
          </View>
        )}

        {/* Catalog */}
        <Text style={styles.sectionLabel}>CATALOG ({detail.catalog.length} items)</Text>
        {detail.catalog.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No products listed.</Text></View>
        ) : (
          detail.catalog.slice(0, 20).map((item: any, i: number) => (
            <View key={i} style={styles.catalogItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.catalogName}>{item.inputItemId}</Text>
                <Text style={styles.catalogPack}>{item.inputPackId || "Standard pack"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.catalogPrice}>{formatRupees(item.sellingPrice)}</Text>
                {item.mrp > item.sellingPrice && (
                  <Text style={styles.catalogMrp}>MRP {formatRupees(item.mrp)}</Text>
                )}
                <Text style={[styles.stockBadge, { color: item.status === "in_stock" ? "#16a34a" : "#d97706" }]}>
                  {item.status === "in_stock" ? "In Stock" : item.status === "low_stock" ? "Low Stock" : "Out"}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Recent Purchases */}
        <Text style={styles.sectionLabel}>RECENT PURCHASES</Text>
        {detail.recentPurchases.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No purchase history with this vendor.</Text></View>
        ) : (
          detail.recentPurchases.map((tx: any) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.txDate}>{tx.date}</Text>
                <Text style={styles.txAmount}>{formatRupees(tx.amount)}</Text>
              </View>
              <Text style={styles.txMeta}>{tx.type} · {tx.paymentStatus} · {tx.items.length} items</Text>
            </View>
          ))
        )}

        {/* My Rating */}
        {detail.myRating && (
          <View style={styles.myRatingCard}>
            <Text style={styles.sectionLabel}>MY RATING</Text>
            <Text style={{ fontSize: 24 }}>{"⭐".repeat(detail.myRating.score)}{"☆".repeat(5 - detail.myRating.score)}</Text>
            {detail.myRating.feedback && <Text style={styles.myRatingFeedback}>{detail.myRating.feedback}</Text>}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Rate Modal */}
      <Modal visible={rateModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Rate {v.name}</Text>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 16 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text style={{ fontSize: 36 }}>{n <= rating ? "⭐" : "☆"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Your feedback (optional)"
              value={feedback}
              onChangeText={setFeedback}
              multiline
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: "#eee", flex: 1 }]} onPress={() => setRateModal(false)}>
                <Text style={{ color: "#666", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: "#d97706", flex: 1 }]} onPress={submitRating}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#fffbeb" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#888", letterSpacing: 1, marginBottom: 8, marginTop: 16 },

  profileCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 8 },
  vendorName: { fontSize: 22, fontWeight: "800", color: "#1a1a1a", marginTop: 8 },
  vendorType: { fontSize: 13, color: "#d97706", fontWeight: "700", marginTop: 4 },
  vendorAddress: { fontSize: 12, color: "#666", marginTop: 6 },
  vendorRating: { fontSize: 14, color: "#333", marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16, width: "100%" },
  actionBtn: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 11, fontWeight: "700", color: "#333", marginTop: 4 },

  creditCard: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#fca5a5", marginBottom: 8 },
  creditLabel: { fontSize: 12, color: "#dc2626", fontWeight: "600" },
  creditAmount: { fontSize: 22, fontWeight: "800", color: "#dc2626", marginTop: 4 },
  creditLimit: { fontSize: 11, color: "#888", marginTop: 2 },

  catalogItem: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 6, alignItems: "center" },
  catalogName: { fontSize: 13, fontWeight: "600", color: "#333" },
  catalogPack: { fontSize: 11, color: "#888", marginTop: 2 },
  catalogPrice: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  catalogMrp: { fontSize: 10, color: "#999", textDecorationLine: "line-through" },
  stockBadge: { fontSize: 10, fontWeight: "700", marginTop: 2 },

  txCard: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 6 },
  txDate: { fontSize: 12, color: "#888" },
  txAmount: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  txMeta: { fontSize: 11, color: "#888", marginTop: 4 },

  myRatingCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginTop: 8 },
  myRatingFeedback: { fontSize: 12, color: "#666", marginTop: 4, fontStyle: "italic" },

  emptyCard: { backgroundColor: "#fff", borderRadius: 12, padding: 20, alignItems: "center" },
  emptyText: { color: "#999", fontSize: 13 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#333", textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: "top", marginTop: 8 },
  btn: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
});
